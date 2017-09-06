
/* global document */

import Base from "./base";
import History from "./history";
import ReadLine from "./readline";
import Stream from "./stream";
import templates from "./templates";
import util from "./util";
import as from "argv-split";
import cmdClear from "./cmds/clear";
import cmdHelp from "./cmds/help";
import cmdHistory from "./cmds/history";
import cmdGrep from "./cmds/grep";
import cmdEcho from "./cmds/echo";
import cmdTail from "./cmds/tail";
import cmdHead from "./cmds/head";
import cmdDefault from "./cmds/_default";

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
        this.obscure = null;
        this.executing = [];
        this.stdout = new Stream(false);
        this.stderr = new Stream(false);
        this.stdin = new Stream(false);
        this.promptRenderer = () => this.prompt;

        this.setCommandHandler("clear", cmdClear);
        this.setCommandHandler("help", cmdHelp);
        this.setCommandHandler("history", cmdHistory);
        this.setCommandHandler("grep", cmdGrep);
        this.setCommandHandler("echo", cmdEcho);
        this.setCommandHandler("tail", cmdTail);
        this.setCommandHandler("head", cmdHead);
        this.setCommandHandler("_default", cmdDefault);

        this._load();
        this._readStdout();
        this._readStderr();
    }

    _readStdout() {
        this.stdout.on("data", (data) => {
            this.log(data);
        });
    }

    _readStderr() {
        this.stderr.on("data", (data) => {
            this.log(data);
        });
    }

    isActive() {
        return this.readline.isActive();
    }

    activate() {
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

    render() {
        let text = this.line.text || "";
        let cursorIdx = this.line.cursor || 0;

        if (this.searchMatch) {
            cursorIdx = this.searchMatch.cursoridx || 0;
            text = this.searchMatch.text || "";
            document.querySelector(`#${this.inputId} .searchterm`).textContent = this.searchMatch.term;
        }

        const left = util.escape(text.substr(0, cursorIdx)).replace(/ /g, "&nbsp;");
        const cursor = text.substr(cursorIdx, 1);
        const right = util.escape(text.substr(cursorIdx + 1)).replace(/ /g, "&nbsp;");

        const elCursor = document.querySelector(`#${this.inputId} .input .cursor`);
        const elPrompt = document.querySelector(`#${this.inputId} .prompt`);
        const elLeft = document.querySelector(`#${this.inputId} .input .left`);
        const elRight = document.querySelector(`#${this.inputId} .input .right`);

        elPrompt && (elPrompt.innerHTML = this.prompt);
        elLeft && (elLeft.innerHTML = left);
        if (elCursor) {
            if (!cursor) {
                elCursor.innerHTML = "&nbsp;";
                elCursor.style.textDecoration = "underline";
            } else {
                elCursor.textContent = cursor;
                elCursor.style.textDecoration = "underline";
            }
        }

        elRight && (elRight.innerHTML = right);
        this.cursorVisible = true;
        this.scrollToBottom();
        this._blinkCursor();
        this._log(`rendered '${text}' w/ cursor at ${cursorIdx}`);
    }

    refresh() {
        document.getElementById(this.inputId).outerHTML = templates.inputCmd({ id: this.inputId });
        this.render();
        this._log(`refreshed ${this.inputId}`);
    }

    scrollToBottom() {
        this.panel.scrollTop = this.view.offsetHeight;
    }

    _createElement(html) {
        const el = document.createElement("span");
        el.innerHTML = html;

        if (el.childNodes.length > 1) {
            return el;
        }

        return el.firstChild;
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

            const elCursor = document.querySelector(`#${this.inputId} .input .cursor`);

            if (elCursor) {
                if (this.cursorVisible) {
                    elCursor.style.textDecoration = "underline";
                } else {
                    elCursor.style.textDecoration = "";
                }

                this._blinkCursor();
            }
        }, this.blinktime);
    }

    _stopBlinkCursor() {
        const elCursor = document.querySelector(`#${this.inputId} .input .cursor`);
        elCursor && (elCursor.style.textDecoration = "");
        clearTimeout(this.blinkTimer);
        this.blinkTimer = null;
    }

    _getHandler(cmd) {
        return this.cmdHandlers[cmd] || this.cmdHandlers._default;
    }

    log(output) {
        if (output) {
            document.getElementById(this.shellViewId).appendChild(this._createElement(output));
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

    _freezePrompt() {
        this._stopBlinkCursor();

        const elCursor = document.querySelector(`#${this.inputId} .input .cursor`);
        const elInput = document.getElementById(this.inputId);

        elCursor && (elCursor.style.textDecoration = "");
        elInput && elInput.removeAttribute("id");
    }

    _renderPrompt(opts = {}) {
        this._freezePrompt();
        this.obscure = !!opts.obscure;

        const elShellView = document.getElementById(this.shellViewId);

        elShellView.appendChild(this._createElement(templates.inputCmd({ id: this.inputId })));

        this.setPrompt(opts.prompt || this.promptRenderer());

        this._blinkCursor();
    }

    _renderOutput(output) {
        this._freezePrompt();

        this.log(output);

        this._renderPrompt();
    }

    _activateShell() {
        this._log("activating shell");

        if (!this.view) {
            this.view = document.getElementById(this.shellViewId);
        }

        if (!this.panel) {
            this.panel = document.getElementById(this.shellPanelId);
        }

        this._trigger("activating");

        this._renderPrompt();

        this.refresh();
        this.active = true;

        this._trigger("activate");
    }

    clear() {
        document.getElementById(this.shellViewId).innerHTML = "";
    }

    async _parseCommandLine(cmdline) {
        const cmdtexts = cmdline.split("|");
        const cmds = [];

        let pipe = this.stdin;

        for (let n = 0; n < cmdtexts.length; n++) {
            const isLast = n === cmdtexts.length - 1;
            const cmdtext = cmdtexts[n];
            let parts = [];

            try {
                parts = as(cmdtext);
            } catch (error) {
                await this.stderr.write(`Unable to parse command: ${error.message}`);
                return [];
            }

            const cmdName = parts[0];
            const cmdArgs = parts.slice(1);
            const handler = this._getHandler(cmdName);

            const streams = {
                stdout: this.stdout,
                stdin: pipe,
                stderr: this.stderr
            };

            if (!isLast) {
                pipe = streams.stdout = new Stream();
            }

            let parsed = {};

            try {
                parsed = util.parseArgs(cmdArgs, handler.args || [], handler.opts || {});
            } catch (error) {
                const help = this._renderHelp(cmdName, handler.args || [], handler.opts || {}, handler.desc || "", error);

                await this.stderr.write(help);
                return [];
            }

            cmds.push({
                cmdtext,
                cmdName,
                streams,
                handler,
                opts: parsed.opts,
                args: parsed.args
            });
        }

        return cmds;
    }

    _load() {
        this.readline.on("eot", (...args) => {
            this._trigger("eot", ...args);
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
            document.getElementById(this.inputId).outerHTML = templates.inputSearch({ id: this.inputId });
            this._log("started search");
        });

        this.readline.on("searchEnd", () => {
            document.getElementById(this.inputId).outerHTML = templates.inputSearch({ id: this.inputId });
            this.searchMatch = null;
            this.render();
            this._log("ended search");
        });

        this.readline.on("searchChange", (match) => {
            this.searchMatch = match;
            this.render();
        });

        this.readline.on("enter", async (cmdtext) => {
            if (this.executing.length > 0) {
                this._freezePrompt();
                return this.stdin.write(cmdtext);
            }

            this._log(`got command: ${cmdtext}`);

            if (!cmdtext) {
                this._renderOutput();
                return;
            }

            this._freezePrompt();
            this.history.suspend();

            this.executing = await this._parseCommandLine(cmdtext);

            if (this.executing.length === 0) {
                this.history.resume();
                return this._renderPrompt();
            }

            this.executing = this.executing.reverse();

            const promises = this.executing.map((cmd) => {
                return cmd.handler.exec(this.terminal, cmd.streams, cmd.cmdName, cmd.opts, cmd.args)
                    .then(() => {
                        cmd.streams.stdout.isPipe() && cmd.streams.stdout.close();
                        return null;
                    })
                    .catch((error) => {
                        cmd.streams.stdout.isPipe() && cmd.streams.stdout.close();
                        return this.stderr.write(`Command failed: ${error.message}\n`);
                    });
            });

            Promise.all(promises)
                .then(() => {
                    this.executing.length = 0;
                    this.history.resume();
                    this._renderPrompt();
                })
                .catch((error) => {
                    this.executing.length = 0;
                    console.error(error);
                    this.history.resume();
                    this._renderPrompt();
                });
        });

        this.readline.on("cancel", async () => {
            for (const cmd of this.executing) {
                cmd.streams.stdin.abort();
            }
        });

        this.readline.on("completion", async (line) => {
            if (!line) {
                return;
            }

            const text = line.text.substr(0, line.cursor).split("|").pop().replace(/^\s+/g, "");
            let parts;

            try {
                parts = as(text);
            } catch (error) {
                return;
            }

            const cmdName = parts.shift() || "";

            this._log(`getting completion handler for ${cmdName}`);
            const handler = this._getHandler(cmdName);

            if (handler !== this.cmdHandlers._default && cmdName && cmdName === text) {
                this._log("valid cmd, no args: append space");
                // the text to complete is just a valid command, append a space
                return " ";
            }

            if (!handler.completion) {
                this._log("no completion method");
                // handler has no completion function, so we can't complete
                return;
            }

            let argName = null;

            if (handler !== this.cmdHandlers._default) {
                const args = parts.filter((a) => a[0] !== "-"); // Remove flags

                this._log("args", args);

                argName = handler.args[Math.max(0, args.length - 1)];

                this._log("argName", argName);

                if (!argName) {
                    return;
                }

                argName = argName[0] === "?" ? argName.substr(1) : argName;
            }

            this._log(`calling completion handler for ${cmdName}`);

            try {
                const match = await handler.completion(this.terminal, cmdName, argName, parts.pop(), line);

                this._log(`completion: ${JSON.stringify(match)}`);

                if (!match) {
                    return;
                }

                if (match.suggestions && match.suggestions.length > 1) {
                    this._renderOutput(templates.suggest({ suggestions: match.suggestions }));
                }

                return match.completion;
            } catch (error) {
                this._log(error);
            }

            return [];
        });
    }
}

export default Shell;
