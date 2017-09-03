
import Base from "./base";
import History from "./history";
import ReadLine from "./readline";
import templates from "./templates";
import util from "./util";
import $ from "jquery";
import as from "argv-split";
import cmdClear from "./cmds/clear";
import cmdHelp from "./cmds/help";
import cmdHistory from "./cmds/history";
import cmdDefault from "./cmds/_default";

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

class Shell extends Base {
    constructor(config, terminal) {
        super(config);

        this.terminal = terminal;
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

        this.setCommandHandler("clear", cmdClear);
        this.setCommandHandler("help", cmdHelp);
        this.setCommandHandler("history", cmdHistory);
        this.setCommandHandler("_default", cmdDefault);

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

    async ask(prompt, obscure) {
        return new Promise((resolve) => {
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
                resolve(line);
            };
        });
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

    _renderHelp(cmd, cmdArgs, cmdOpts, cmdDescription, error = false) {
        const args = (cmdArgs || []).map((a) => a[0] === "?" ? `[${a.substr(1)}]` : `&lt;${a}&gt;`);
        const opts = Object.keys(cmdOpts || {}).map((o) => `  -${o}  ${cmdOpts[o]}`);
        const err = error && error.message ? `<span class="error">${error}</span>\n` : "";

        return `${err}
Usage: ${cmd} [options] ${args.join(" ")}

${cmdDescription}

Options:
  -h  Print help
${opts.join("\n")}`;
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

    clear() {
        $(`#${this.inputId}`).parent().empty();
    }

    _load() {
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
            this.clear();
            this._renderOutput();
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
                return callback();
            }

            const cmd = parts[0];
            const cmdArgs = parts.slice(1);
            const handler = this._getHandler(cmd);

            $(`#${this.inputId} .input .cursor`).css("textDecoration", "");
            clearTimeout(this.blinkTimer);
            this.blinkTimer = null;

            this.resumeCallback = (output, cmdtext) => {
                this._renderOutput(output);
                callback(cmdtext);
            };

            try {
                const { opts, args } = util.parseArgs(cmdArgs, handler.args || [], handler.opts || {});

                handler.exec(this.terminal, cmd, opts, args)
                    .then((output) => {
                        this.resumeCallback(output);
                    })
                    .catch((error) => {
                        console.error(error);
                        this.log(templates.execError({ error: error.message }));
                        this.resumeCallback();
                    });
            } catch (error) {
                const output = this._renderHelp(cmd, handler.args || [], handler.opts || {}, handler.desc || "", error);
                this.resumeCallback(output);
            }
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

            let argName = null;

            if (handler !== this.cmdHandlers._default) {
                const before = line.text.substr(0, line.cursor);
                let args = before.split(" ");

                args.shift(); // Remove cmd name
                args = args.filter((a) => a[0] !== "-"); // Remove flags

                argName = handler.args[args.length - 1];

                if (!argName) {
                    return callback();
                }

                argName = argName[0] === "?" ? argName.substr(1) : argName;
            }

            this._log(`calling completion handler for ${cmd}`);

            handler.completion(this.terminal, cmd, argName, arg, line)
                .then((match) => {
                    this._log(`completion: ${JSON.stringify(match)}`);

                    if (!match) {
                        return callback();
                    }

                    if (match.suggestions && match.suggestions.length > 1) {
                        this._renderOutput(templates.suggest({ suggestions: match.suggestions }));
                    }

                    callback(match.completion);
                })
                .catch((error) => {
                    this._log(error);
                    callback([]);
                });
        });
    }
}

export default Shell;
