/* ------------------------------------------------------------------------*
 * Copyright 2013-2014 Arne F. Claassen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *-------------------------------------------------------------------------*/

import History from "./history";
import ReadLine from "./readline";
import templates from "./templates";
import $ from "jquery";
import as from "argv-split";

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

class Shell {
    constructor(config = {}) {
        this.debug = !!config.debug;
        this.prompt = config.prompt || "jsh$";
        this.shellViewId = config.shell_view_id || "shell-view";
        this.shellPanelId = config.shell_panel_id || "shell-panel";
        this.inputId = config.input_id || "shell-cli";
        this.blinktime = config.blinktime || 500;
        this.history = config.history || new History();
        this.readline = config.readline || new ReadLine({ history: this.history });
        this.active = false;
        this.cursorVisible = false;
        this.activationHandler;
        this.deactivationHandler;
        this.cmdHandlers = {
            clear: {
                exec: (cmd, args, callback) => {
                    $(`#${this.inputId}`).parent().empty();
                    callback();
                }
            },
            help: {
                exec: (cmd, args, callback) => {
                    callback(templates.help({ commands: this._commands() }));
                }
            },
            history: {
                exec: (cmd, args, callback) => {
                    if (args[0] === "-c") {
                        this.history.clear();
                        callback();
                        return;
                    }

                    callback(templates.history({ items: this.history.items() }));
                }
            },
            _default: {
                exec: (cmd, args, callback) => {
                    callback(templates.badCommand({ cmd: cmd }));
                },
                completion: (cmd, arg, line, callback) => {
                    if (!arg) {
                        arg = cmd;
                    }

                    return callback(this.bestMatch(arg, this._commands()));
                }
            }
        };
        this.line = {
            text: "",
            cursor: 0
        };
        this.searchMatch = "";
        this.view = null;
        this.panel = null;
        this.promptHandler = null;
        this.initializationHandler = null;
        this.initialized = null;
        this.overrideOnEnter = null;
        this.resumeCallback = null;
        this.obscure = null;

        this._load();
    }

    _log(...args) {
        this.debug && console.log(...args);
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
                if (output) {
                    $(`#${this.inputId}`).before(output);
                }

                resumeCallback();
            };

            this.obscure = false;
            this.history.resume();
            callback(line);
        };
    }

    onEOT(completionHandler) {
        this.readline.on("eot", completionHandler);
    }

    onCancel(completionHandler) {
        this.readline.on("cancel", completionHandler);
    }

    onInitialize(completionHandler) {
        this.initializationHandler = completionHandler;
    }

    onActivate(completionHandler) {
        this.activationHandler = completionHandler;
    }

    onDeactivate(completionHandler) {
        this.deactivationHandler = completionHandler;
    }

    onNewPrompt(completionHandler) {
        this.promptHandler = completionHandler;
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

    bestMatch(partial, possible) {
        this._log(`bestMatch on partial '${partial}'`);

        const result = {
            completion: null,
            suggestions: []
        };

        if (!possible || possible.length === 0) {
            return result;
        }

        let common = "";

        if (!partial) {
            if (possible.length === 1) {
                result.completion = possible[0];
                result.suggestions = possible;
                return result;
            }

            if (!possible.every((x) => possible[0][0] === x[0])) {
                result.suggestions = possible;
                return result;
            }
        }

        for (let i = 0; i < possible.length; i++) {
            const option = possible[i];

            if (option.slice(0, partial.length) === partial) {
                result.suggestions.push(option);

                if (!common) {
                    common = option;
                    this._log(`initial common: ${common}`);
                } else if (option.slice(0, common.length) !== common) {
                    this._log(`find common stem for '${common}' and '${option}'`);

                    let j = partial.length;
                    while (j < common.length && j < option.length) {
                        if (common[j] !== option[j]) {
                            common = common.substr(0, j);
                            break;
                        }

                        j++;
                    }
                }
            }
        }

        result.completion = common.substr(partial.length);
        return result;
    }

    _commands() {
        return Object.keys(this.cmdHandlers).filter((x) => x[0] !== "_");
    }

    _blinkCursor() {
        if (!this.active) {
            return;
        }

        setTimeout(() => {
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

    _renderOutput(output, callback) {
        if (output) {
            $(`#${this.inputId}`).after(output);
        }

        $(`#${this.inputId} .input .cursor`).css("textDecoration", "");
        $(`#${this.inputId}`).removeAttr("id");
        $(`#${this.shellViewId}`).append(templates.inputCmd({ id: this.inputId }));

        if (this.promptHandler) {
            return this.promptHandler((prompt) => {
                this.setPrompt(prompt);
                return callback();
            });
        }

        return callback();
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

        if (this.promptHandler) {
            this.promptHandler((prompt) => {
                this.setPrompt(prompt);
            });
        }

        if (this.activationHandler) {
            this.activationHandler();
        }
    }

    _load() {
        this.readline.on("activate", () => {
            if (this.initialized) {
                this.initialized = true;
                if (this.initializationHandler) {
                    return this.initializationHandler(this._activateShell.bind(this));
                }
            }

            return this._activateShell();
        });

        this.readline.on("deactivate", () => {
            if (this.deactivationHandler) {
                this.deactivationHandler();
            }
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
                this._renderOutput(null, () => {});
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

                return this._renderOutput(null, () => {
                    fn(cmdtext, callback);
                });
            }

            this._log(`got command: ${cmdtext}`);

            if (!cmdtext) {
                return this._renderOutput(null, () => {
                    callback(cmdtext);
                });
            }

            let parts = [];

            try {
                parts = as(cmdtext);
            } catch (error) {
                return this._renderOutput(templates.badSplit({ error: error.code }), () => {
                    callback(cmdtext);
                });
            }

            const cmd = parts[0];
            const args = parts.slice(1);
            const handler = this._getHandler(cmd);

            this.resumeCallback = (output, cmdtext) => {
                this._renderOutput(output, () => {
                    callback(cmdtext);
                });
            };

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
                    return this._renderOutput(templates.suggest({ suggestions: match.suggestions }), () => {
                        callback(match.completion);
                    });
                }

                return callback(match.completion);
            });
        });
    }
}

export default Shell;
