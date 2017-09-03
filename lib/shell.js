
import Base from "./base";
import History from "./history";
import ReadLine from "./readline";
import templates from "./templates";
import util from "./util";
import $ from "jquery";
import as from "argv-split";

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

class Shell extends Base {
    constructor(config = {}) {
        super(config);

        this.prompt = config.prompt || "wsh $";
        this.shellViewId = config.shellViewId || "shell-view";
        this.shellPanelId = config.shellPanelId || "shell-panel";
        this.inputId = config.inputId || "shell-cli";
        this.blinktime = config.blinktime || 500;
        this.history = config.history || new History(config);
        this.readline = config.readline || new ReadLine({ debug: config.debug, history: this.history });
        this.active = false;
        this.cursorVisible = false;
        this.cmdHandlers = {};
        this.line = {
            text: "",
            cursor: 0
        };
        this.searchMatch = "";
        this.view = null;
        this.panel = null;
        this.initialized = null;
        this.overrideOnEnter = null;
        this.resumeCallback = null;
        this.obscure = null;
        this.promptRenderer = () => this.prompt;

        this._load();
    }

    isActive() {
        return this.readline.isActive();
    }

    activate() {
        if ($(`#${this.shellViewId}`).length === 0) {
            this.active = false;
            return;
        }

        this.readline.activate();
    }

    deactivate() {
        this._log("deactivating");
        this.active = false;
        this.readline.deactivate();
    }

    setCommandHandler(cmd, cmdHandler) {
        this.cmdHandlers[cmd] = cmdHandler;
    }

    getCommandHandler(cmd) {
        return this.cmdHandlers[cmd];
    }

    setDefaultPromptRenderer(renderFn) {
        this.promptRenderer = renderFn;
    }

    setPrompt(prompt) {
        this.prompt = prompt;

        if (!this.active) {
            return;
        }

        this.refresh();
    }

    ask(prompt, obscure, callback) {
        this.obscure = obscure;
        this.resumeCallback();
        this.setPrompt(prompt);
        this.history.suspend();

        this.overrideOnEnter = (line, resumeCallback) => {
            this.resumeCallback = (output /* , cmdtext */) => {
                this._renderOutput(output);
                resumeCallback();
            };

            this.obscure = false;
            this.history.resume();
            callback(line);
        };
    }

    render() {
        let text = this.line.text || "";
        let cursorIdx = this.line.cursor || 0;

        if (this.searchMatch) {
            cursorIdx = this.searchMatch.cursoridx || 0;
            text = this.searchMatch.text || "";
            $(`#${this.inputId} .searchterm`).text(this.searchMatch.term);
        }

        const left = escape(text.substr(0, cursorIdx)).replace(/ /g, "&nbsp;");
        const cursor = text.substr(cursorIdx, 1);
        const right = escape(text.substr(cursorIdx + 1)).replace(/ /g, "&nbsp;");

        $(`#${this.inputId} .prompt`).html(this.prompt);
        $(`#${this.inputId} .input .left`).html(left);

        if (!cursor) {
            $(`#${this.inputId} .input .cursor`).html("&nbsp;").css("textDecoration", "underline");
        } else {
            $(`#${this.inputId} .input .cursor`).text(cursor).css("textDecoration", "underline");
        }

        $(`#${this.inputId} .input .right`).html(right);
        this.cursorVisible = true;
        this.scrollToBottom();
        this._blinkCursor();
        this._log(`rendered '${text}' w/ cursor at ${cursorIdx}`);
    }

    refresh() {
        $(`#${this.inputId}`).replaceWith(templates.inputCmd({ id: this.inputId }));
        this.render();
        this._log(`refreshed ${this.inputId}`);
    }

    scrollToBottom() {
        this.panel.animate({ scrollTop: this.view.height() }, 0);
    }

    _commands() {
        return Object.keys(this.cmdHandlers).filter((x) => x[0] !== "_");
    }

    _blinkCursor() {
        if (!this.active || this.blinkTimer) {
            return;
        }

        this.blinkTimer = setTimeout(() => {
            this.blinkTimer = null;

            if (!this.active) {
                return;
            }

            this.cursorVisible = !this.cursorVisible;

            if (this.cursorVisible) {
                $(`#${this.inputId} .input .cursor`).css("textDecoration", "underline");
            } else {
                $(`#${this.inputId} .input .cursor`).css("textDecoration", "");
            }

            this._blinkCursor();
        }, this.blinktime);
    }

    _getHandler(cmd) {
        return this.cmdHandlers[cmd] || this.cmdHandlers._default;
    }

    log(output) {
        if (output) {
            $(`#${this.shellViewId}`).append(output);
            this.scrollToBottom();
        }
    }

    _renderOutput(output) {
        $(`#${this.inputId} .input .cursor`).css("textDecoration", "");
        $(`#${this.inputId}`).removeAttr("id");

        this.log(output);

        $(`#${this.shellViewId}`).append(templates.inputCmd({ id: this.inputId }));

        this.setPrompt(this.promptRenderer());
    }

    _activateShell() {
        this._log("activating shell");

        if (!this.view) {
            this.view = $(`#${this.shellViewId}`);
        }

        if (!this.panel) {
            this.panel = $(`#${this.shellPanelId}`);
        }

        if ($(`#${this.inputId}`).length === 0) {
            this.view.append(templates.inputCmd({ id: this.inputId }));
        }

        this.refresh();
        this.active = true;
        this._blinkCursor();

        this.setPrompt(this.promptRenderer());

        this._trigger("activate");
    }

    _load() {
        this.setCommandHandler("clear", {
            exec: (cmd, args, callback) => {
                $(`#${this.inputId}`).parent().empty();
                callback();
            }
        });

        this.setCommandHandler("help", {
            exec: (cmd, args, callback) => {
                callback(templates.help({ commands: this._commands() }));
            }
        });

        this.setCommandHandler("history", {
            exec: (cmd, args, callback) => {
                if (args[0] === "-c") {
                    this.history.clear();
                    callback();
                    return;
                }

                callback(templates.history({ items: this.history.items() }));
            }
        });

        this.setCommandHandler("_default", {
            exec: (cmd, args, callback) => {
                callback(templates.badCommand({ cmd: cmd }));
            },
            completion: (cmd, arg, line, callback) => {
                if (!arg) {
                    arg = cmd;
                }

                return callback(util.bestMatch(arg, this._commands()));
            }
        });

        this.readline.on("eot", (...args) => {
            this._trigger("eot", ...args);
        });

        this.readline.on("cancel", (...args) => {
            this._trigger("cancel", ...args);
        });

        this.readline.on("activate", () => {
            if (this.initialized) {
                this.initialized = true;
                this._trigger("initialize", this._activateShell.bind(this));
            }

            return this._activateShell();
        });

        this.readline.on("deactivate", () => {
            this._trigger("deactivate");
        });

        this.readline.on("change", (line) => {
            this.line = line;

            if (this.obscure) {
                this.line.text = this.line.text.replace(/./g, "*");
            }

            this.render();
        });

        this.readline.on("clear", () => {
            this.cmdHandlers.clear.exec(null, null, () => {
                this._renderOutput();
            });
        });

        this.readline.on("searchStart", () => {
            $(`#${this.inputId}`).replaceWith(templates.inputSearch({ id: this.inputId }));
            this._log("started search");
        });

        this.readline.on("searchEnd", () => {
            $(`#${this.inputId}`).replaceWith(templates.inputCmd({ id: this.inputId }));
            this.searchMatch = null;
            this.render();
            this._log("ended search");
        });

        this.readline.on("searchChange", (match) => {
            this.searchMatch = match;
            this.render();
        });

        this.readline.on("enter", (cmdtext, callback) => {
            if (this.overrideOnEnter) {
                const fn = this.overrideOnEnter;
                this.overrideOnEnter = null;

                return fn(cmdtext, callback);
            }

            this._log(`got command: ${cmdtext}`);

            if (!cmdtext) {
                this._renderOutput();
                return callback(cmdtext);
            }

            let parts = [];

            try {
                parts = as(cmdtext);
            } catch (error) {
                this._renderOutput(templates.badSplit({ error: error.code }));
                return callback(cmdtext);
            }

            const cmd = parts[0];
            const args = parts.slice(1);
            const handler = this._getHandler(cmd);

            this.resumeCallback = (output, cmdtext) => {
                this._renderOutput(output);
                callback(cmdtext);
            };

            $(`#${this.inputId} .input .cursor`).css("textDecoration", "");
            clearTimeout(this.blinkTimer);
            this.blinkTimer = null;

            return handler.exec(cmd, args, (output, cmdtext) => {
                this.resumeCallback(output, cmdtext);
            });
        });

        this.readline.on("completion", (line, callback) => {
            if (!line) {
                return callback();
            }

            const text = line.text.substr(0, line.cursor);
            let parts;

            try {
                parts = as(text);
            } catch (error) {
                return callback();
            }

            const cmd = parts.shift() || "";
            const arg = parts.pop() || "";
            this._log(`getting completion handler for ${cmd}`);
            const handler = this._getHandler(cmd);

            if (handler !== this.cmdHandlers._default && cmd && cmd === text) {
                this._log("valid cmd, no args: append space");
                // the text to complete is just a valid command, append a space
                return callback(" ");
            }

            if (!handler.completion) {
                // handler has no completion function, so we can't complete
                return callback();
            }

            this._log(`calling completion handler for ${cmd}`);

            return handler.completion(cmd, arg, line, (match) => {
                this._log(`completion: ${JSON.stringify(match)}`);

                if (!match) {
                    return callback();
                }

                if (match.suggestions && match.suggestions.length > 1) {
                    this._renderOutput(templates.suggest({ suggestions: match.suggestions }));
                }

                return callback(match.completion);
            });
        });
    }
}

export default Shell;
