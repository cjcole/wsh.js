
/* global window */

import History from "./history";
import KillRing from "./killring";

const keys = {
    Backspace: 8,
    Tab: 9,
    Enter: 13,
    Shift: 16,
    Ctrl: 17,
    Alt: 18,
    LeftWindowKey: 91,
    Pause: 19,
    CapsLock: 20,
    Escape: 27,
    Space: 32,
    PageUp: 33,
    PageDown: 34,
    End: 35,
    Home: 36,
    Left: 37,
    Up: 38,
    Right: 39,
    Down: 40,
    Insert: 45,
    Delete: 46
};

class ReadLine {
    constructor(config = {}) {
        this.debug = !!config.debug;
        this.history = config.history || new History(config);
        this.killring = config.killring || new KillRing(config);
        this.cursor = 0;
        this.boundToElement = !!config.element;
        this.element = config.element || window;
        this.active = false;
        this.eventHandlers = {};
        this.inSearch = false;
        this.searchMatch;
        this.lastSearchText = "";
        this.text = "";
        this.cursor = 0;
        this.lastCmd;
        this.completionActive;
        this.cmdQueue = [];
        this.suspended = false;
        this.cmdMap = {
            complete: this._cmdComplete.bind(this),
            done: this._cmdDone.bind(this),
            noop: this._cmdNoOp.bind(this),
            historyTop: this._cmdHistoryTop.bind(this),
            historyEnd: this._cmdHistoryEnd.bind(this),
            historyNext: this._cmdHistoryNext.bind(this),
            historyPrevious: this._cmdHistoryPrev.bind(this),
            end: this._cmdEnd.bind(this),
            home: this._cmdHome.bind(this),
            left: this._cmdLeft.bind(this),
            right: this._cmdRight.bind(this),
            cancel: this._cmdCancel.bind(this),
            "delete": this._cmdDeleteChar.bind(this),
            backspace: this._cmdBackspace.bind(this),
            killEof: this._cmdKillToEOF.bind(this),
            killWordback: this._cmdKillWordBackward.bind(this),
            killWordForward: this._cmdKillWordForward.bind(this),
            yank: this._cmdYank.bind(this),
            clear: this._cmdClear.bind(this),
            search: this._cmdReverseSearch.bind(this),
            wordBack: this._cmdBackwardWord.bind(this),
            wordForward: this._cmdForwardWord.bind(this),
            yankRotate: this._cmdRotate.bind(this),
            esc: this._cmdEsc.bind(this)
        };
        this.keyMap = {
            "default": {},
            "control": {},
            "meta": {}
        };

        this.bind(keys.Backspace, "default", "backspace");
        this.bind(keys.Tab, "default", "complete");
        this.bind(keys.Enter, "default", "done");
        this.bind(keys.Escape, "default", "esc");
        this.bind(keys.PageUp, "default", "historyTop");
        this.bind(keys.PageDown, "default", "historyEnd");
        this.bind(keys.End, "default", "end");
        this.bind(keys.Home, "default", "home");
        this.bind(keys.Left, "default", "left");
        this.bind(keys.Up, "default", "historyPrevious");
        this.bind(keys.Right, "default", "right");
        this.bind(keys.Down, "default", "historyNext");
        this.bind(keys.Delete, "default", "delete");
        this.bind(keys.CapsLock, "default", "noop");
        this.bind(keys.Pause, "default", "noop");
        this.bind(keys.Insert, "default", "noop");

        this.bind("A", "control", "home");
        this.bind("B", "control", "left");
        this.bind("C", "control", "cancel");
        this.bind("D", "control", "delete");
        this.bind("E", "control", "end");
        this.bind("F", "control", "right");
        this.bind("P", "control", "historyPrevious");
        this.bind("N", "control", "historyNext");
        this.bind("K", "control", "killEof");
        this.bind("Y", "control", "yank");
        this.bind("L", "control", "clear");
        this.bind("R", "control", "search");

        this.bind(keys.Backspace, "meta", "killWordback");
        this.bind("B", "meta", "wordBack");
        this.bind("D", "meta", "killWordForward");
        this.bind("F", "meta", "wordForward");
        this.bind("Y", "meta", "yankRotate");

        if (this.boundToElement) {
            this.attach(this.element);
        } else {
            this._subscribeToKeys();
        }
    }

    _log(...args) {
        this.debug && console.log(...args);
    }

    _trigger(event, ...args) {
        this.eventHandlers[event] && this.eventHandlers[event](...args);
    }

    on(event, fn) {
        this.eventHandlers[event] = fn;
    }

    isActive() {
        return this.active;
    }

    activate() {
        this.active = true;
        this._trigger("activate");
    }

    deactivate() {
        this.active = false;
        this._trigger("deactivate");
    }

    bind(key, modifier, action) {
        const cmd = this.cmdMap[action];

        this._log(`Bind key ${key} with modifier ${modifier} to action ${action}`);

        if (!cmd) {
            return;
        }

        const code = typeof key === "number" ? key : key.charCodeAt();
        this.keyMap[modifier || "default"][code] = cmd;
    }

    unbind(key, modifier = "default") {
        this._log(`Unbind key ${key} with modifier ${modifier}`);

        const code = typeof key === "number" ? key : key.charCodeAt();
        delete this.keyMap[modifier][code];
    }

    attach(el) {
        if (this.element) {
            this.detach();
        }

        this._log("attaching", el);

        this.element = el;
        this.boundToElement = true;

        this._addEvent(this.element, "focus", this.activate.bind(this));
        this._addEvent(this.element, "blur", this.deactivate.bind(this));
        this._subscribeToKeys();
    }

    detach() {
        this._this._removeEvent(this.element, "focus", this.activate.bind(this));
        this._this._removeEvent(this.element, "blur", this.deactivate.bind(this));

        this.element = null;
        this.boundToElement = false;
    }

    getLine() {
        return {
            text: this.text,
            cursor: this.cursor
        };
    }

    setLine(line) {
        this.text = line.text;
        this.cursor = line.cursor;
        this._refresh();
    }

    _addEvent(element, name, callback) {
        if (element.addEventListener) {
            element.addEventListener(name, callback, false);
        } else if (element.attachEvent) {
            element.attachEvent(`on${name}`, callback);
        }
    }

    _removeEvent(element, name, callback) {
        if (element.removeEventListener) {
            element.removeEventListener(name, callback, false);
        } else if (element.detachEvent) {
            element.detachEvent(`on${name}`, callback);
        }
    }

    _getKeyInfo(e) {
        const code = e.keyCode || e.charCode;
        const c = String.fromCharCode(code);

        return {
            code: code,
            character: c,
            shift: e.shiftKey,
            control: e.controlKey || e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey,
            isChar: true
        };
    }

    _queue(cmd) {
        if (this.suspended) {
            this.cmdQueue.push(cmd);
            return;
        }

        this._call(cmd);
    }

    _call(cmd) {
        this._log(`calling: ${cmd.name}, previous: ${this.lastCmd}`);

        if (this.inSearch && cmd.name !== "cmdKeyPress" && cmd.name !== "cmdReverseSearch") {
            this.inSearch = false;

            if (cmd.name === "cmdEsc") {
                this.searchMatch = null;
            }

            if (this.searchMatch) {
                if (this.searchMatch.text) {
                    this.cursor = this.searchMatch.cursoridx;
                    this.text = this.searchMatch.text;
                    this.history.applySearch();
                }

                this.searchMatch = null;
            }

            this._trigger("searchEnd");
        }
        if (!this.inSearch && this.killring.isinkill() && cmd.name.substr(0, 7) !== "cmdKill") {
            this.killring.commit();
        }
        this.lastCmd = cmd.name;
        cmd();
    }

    _suspend(asyncCall) {
        this.suspended = true;
        asyncCall(this._resume.bind(this));
    }

    _resume() {
        const cmd = this.cmdQueue.shift();

        if (!cmd) {
            this.suspended = false;
            return;
        }

        this._call(cmd);
        this._resume();
    }

    _cmdNoOp() {
        // no-op, used for keys we capture and ignore
    }

    _cmdEsc() {
        // no-op, only has an effect on reverse search and that action was taken in this._call()
    }

    _cmdBackspace() {
        if (this.cursor === 0) {
            return;
        }

        --this.cursor;
        this.text = this._remove(this.text, this.cursor, this.cursor + 1);
        this._refresh();
    }

    _cmdComplete() {
        if (!this.eventHandlers.completion) {
            return;
        }

        this._suspend((resumeCallback) => {
            this._trigger("completion", this.getLine(), (completion) => {
                if (completion) {
                    this.text = this._insert(this.text, this.cursor, completion);
                    this._updateCursor(this.cursor + completion.length);
                }

                this.completionActive = true;
                resumeCallback();
            });
        });
    }

    _cmdDone() {
        const text = this.text;

        this.history.accept(text);
        this.text = "";
        this.cursor = 0;

        if (!this.eventHandlers.enter) {
            return;
        }

        this._suspend((resumeCallback) => {
            this._trigger("enter", text, (text) => {
                if (text) {
                    this.text = text;
                    this.cursor = this.text.length;
                }

                this._trigger("change", this.getLine());

                resumeCallback();
            });
        });
    }

    _cmdEnd() {
        this._updateCursor(this.text.length);
    }

    _cmdHome() {
        this._updateCursor(0);
    }

    _cmdLeft() {
        if (this.cursor === 0) {
            return;
        }

        this._updateCursor(this.cursor - 1);
    }

    _cmdRight() {
        if (this.cursor === this.text.length) {
            return;
        }

        this._updateCursor(this.cursor + 1);
    }

    _cmdBackwardWord() {
        if (this.cursor === 0) {
            return;
        }

        this._updateCursor(this._findBeginningOfPreviousWord());
    }

    _cmdForwardWord() {
        if (this.cursor === this.text.length) {
            return;
        }

        this._updateCursor(this._findEndOfCurrentWord());
    }

    _cmdHistoryPrev() {
        if (!this.history.hasPrev()) {
            return;
        }

        this._getHistory(this.history.prev.bind(this.history));
    }

    _cmdHistoryNext() {
        if (!this.history.hasNext()) {
            return;
        }

        this._getHistory(this.history.next.bind(this.history));
    }

    _cmdHistoryTop() {
        this._getHistory(this.history.top.bind(this.history));
    }

    _cmdHistoryEnd() {
        this._getHistory(this.history.end.bind(this.history));
    }

    _cmdDeleteChar() {
        if (this.text.length === 0) {
            if (this.eventHandlers.eot) {
                return this._trigger("eot");
            }
        }

        if (this.cursor === this.text.length) {
            return;
        }

        this.text = this._remove(this.text, this.cursor, this.cursor + 1);
        this._refresh();
    }

    _cmdCancel() {
        this._trigger("cancel");
    }

    _cmdKillToEOF() {
        this.killring.append(this.text.substr(this.cursor));
        this.text = this.text.substr(0, this.cursor);
        this._refresh();
    }

    _cmdKillWordForward() {
        if (this.text.length === 0) {
            return;
        }

        if (this.cursor === this.text.length) {
            return;
        }

        const end = this._findEndOfCurrentWord();
        if (end === this.text.length - 1) {
            return this._cmdKillToEOF();
        }

        this.killring.append(this.text.substring(this.cursor, end));
        this.text = this._remove(this.text, this.cursor, end);
        this._refresh();
    }

    _cmdKillWordBackward() {
        if (this.cursor === 0) {
            return;
        }

        const oldCursor = this.cursor;
        this.cursor = this._findBeginningOfPreviousWord();
        this.killring.prepend(this.text.substring(this.cursor, oldCursor));
        this.text = this._remove(this.text, this.cursor, oldCursor);
        this._refresh();
    }

    _cmdYank() {
        const yank = this.killring.yank();

        if (!yank) {
            return;
        }

        this.text = this._insert(this.text, this.cursor, yank);
        this._updateCursor(this.cursor + yank.length);
    }

    _cmdRotate() {
        const lastyanklength = this.killring.lastyanklength();

        if (!lastyanklength) {
            return;
        }

        const yank = this.killring.rotate();

        if (!yank) {
            return;
        }

        const oldCursor = this.cursor;
        this.cursor = this.cursor - lastyanklength;
        this.text = this._remove(this.text, this.cursor, oldCursor);
        this.text = this._insert(this.text, this.cursor, yank);
        this._updateCursor(this.cursor + yank.length);
    }

    _cmdClear() {
        if (this.eventHandlers.clear) {
            this._trigger("clear");
        } else {
            this._refresh();
        }
    }

    _cmdReverseSearch() {
        if (!this.inSearch) {
            this.inSearch = true;
            this._trigger("searchStart");
            this._trigger("searchChange", {});
        } else {
            if (!this.searchMatch) {
                this.searchMatch = { term: "" };
            }

            this._search();
        }
    }

    _updateCursor(position) {
        this.cursor = position;
        this._refresh();
    }

    _addText(text) {
        this.text = this._insert(this.text, this.cursor, text);
        this.cursor += text.length;
        this._refresh();
    }

    _addSearchText(text) {
        if (!this.searchMatch) {
            this.searchMatch = { term: "" };
        }
        this.searchMatch.term += text;
        this._search();
    }

    _search() {
        this._log(`searchtext: ${this.searchMatch.term}`);

        const match = this.history.search(this.searchMatch.term);

        if (match !== null) {
            this.searchMatch = match;

            this._log(`match: ${match}`);

            this._trigger("searchChange", match);
        }
    }

    _refresh() {
        this._trigger("change", this.getLine());
    }

    _getHistory(historyCall) {
        this.history.update(this.text);
        this.text = historyCall();
        this._updateCursor(this.text.length);
    }

    _findBeginningOfPreviousWord() {
        const position = this.cursor - 1;

        if (position < 0) {
            return 0;
        }

        let word = false;
        for (let i = position; i > 0; i--) {
            const word2 = this._isWordChar(this.text[i]);

            if (word && !word2) {
                return i + 1;
            }

            word = word2;
        }

        return 0;
    }

    _findEndOfCurrentWord() {
        if (this.text.length === 0) {
            return 0;
        }

        const position = this.cursor + 1;

        if (position >= this.text.length) {
            return this.text.length - 1;
        }

        let word = false;
        for (let i = position; i < this.text.length; i++) {
            const word2 = this._isWordChar(this.text[i]);

            if (word && !word2) {
                return i;
            }

            word = word2;
        }

        return this.text.length - 1;
    }

    _isWordChar(c) {
        if (!c) {
            return false;
        }

        const code = c.charCodeAt(0);
        return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    }

    _remove(text, from, to) {
        if (text.length <= 1 || text.length <= to - from) {
            return "";
        }

        if (from === 0) {
            // delete leading characters
            return text.substr(to);
        }

        const left = text.substr(0, from);
        const right = text.substr(to);

        return left + right;
    }

    _insert(text, idx, ins) {
        if (idx === 0) {
            return ins + text;
        }

        if (idx >= text.length) {
            return text + ins;
        }

        const left = text.substr(0, idx);
        const right = text.substr(idx);

        return left + ins + right;
    }

    _subscribeToKeys() {
        // set up key capture
        this._addEvent(this.element, "keydown", (e) => {
            const key = this._getKeyInfo(e);

            // return as unhandled if we're not active or the key is just a modifier key
            if (!this.active || key.code === keys.Shift || key.code === keys.Ctrl || key.code === keys.Alt || key.code === keys.LeftWindowKey) {
                return true;
            }

            // check for some special first keys, regardless of modifiers
            this._log(`key: ${key.code}`);
            let cmd = this.keyMap.default[key.code];

            // intercept ctrl- and meta- sequences (may override the non-modifier cmd captured above
            let mod;
            if (key.ctrl && !key.shift && !key.alt && !key.meta) {
                mod = this.keyMap.control[key.code];

                if (mod) {
                    cmd = mod;
                }
            } else if ((key.alt || key.meta) && !key.ctrl && !key.shift) {
                mod = this.keyMap.meta[key.code];

                if (mod) {
                    cmd = mod;
                }
            }

            if (!cmd) {
                return true;
            }

            this._queue(cmd);
            e.preventDefault();
            e.stopPropagation();
            e.cancelBubble = true;

            return false;
        });

        this._addEvent(this.element, "keypress", (e) => {
            if (!this.active) {
                return true;
            }

            const key = this._getKeyInfo(e);
            if (key.code === 0 || e.defaultPrevented || key.meta || key.alt || key.ctrl) {
                return false;
            }

            this._queue(() => {
                if (this.inSearch) {
                    this._addSearchText(key.character);
                } else {
                    this._addText(key.character);
                }
            });

            e.preventDefault();
            e.stopPropagation();
            e.cancelBubble = true;

            return false;
        });

        this._addEvent(this.element, "paste", (e) => {
            if (!this.active) {
                return true;
            }

            let pastedText = "";

            if (window.clipboardData && window.clipboardData.getData) {
                pastedText = window.clipboardData.getData("Text");
            } else if (e.clipboardData && e.clipboardData.getData) {
                pastedText = e.clipboardData.getData("text/plain");
            }

            this._queue(() => {
                if (this.inSearch) {
                    this._addSearchText(pastedText);
                } else {
                    this._addText(pastedText);
                }
            });

            e.preventDefault();
            e.stopPropagation();
            e.cancelBubble = true;

            return false;
        });
    }
}

export default ReadLine;
