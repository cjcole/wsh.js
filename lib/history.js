
/* global window */

import Base from "./base";

class History extends Base {
    constructor(config = {}) {
        super(config);

        this.history = config.history || [ "" ];
        this.cursor = config.cursor || 0;
        this.searchCursor = this.cursor;
        this.lastSearchTerm = "";
        this.storage = config.storage || window.localStorage;
        this.key = config.key || "wsh.history";
        this.suspended = false;

        this._load();
    }

    _load() {
        if (!this.storage) {
            return;
        }

        try {
            const data = this.storage.getItem(this.key);

            if (data) {
                this.history = JSON.parse(data);
                this.searchCursor = this.cursor = this.history.length - 1;
            } else {
                this._save();
            }
        } catch (error) {
            this._log("Error accessing storage", error);
        }
    }

    _save() {
        if (!this.storage) {
            return;
        }

        try {
            this.storage.setItem(this.key, JSON.stringify(this.history));
        } catch (error) {
            this._log("Error accessing storage", error);
        }
    }

    _setHistory() {
        this.searchCursor = this.cursor;
        this.lastSearchTerm = "";

        return this.history[this.cursor];
    }

    update(text) {
        this._log(`updating history to ${text}`);
        this.history[this.cursor] = text;
        this._save();
    }

    suspend() {
        this.suspended = true;
    }

    resume() {
        this.suspended = false;
    }

    accept(text) {
        if (this.suspended) {
            return this._log(`history suspended ${text}`);
        }

        this._log(`accepting history ${text}`);

        if (text) {
            const last = this.history.length - 1;

            if (this.cursor === last) {
                this._log("we're at the end already, update last position");
                this.history[this.cursor] = text;
            } else if (!this.history[last]) {
                this._log("we're not at the end, but the end was blank, so update last position");
                this.history[last] = text;
            } else {
                this._log("appending to end");
                this.history.push(text);
            }

            this.history.push("");
        }

        this.searchCursor = this.cursor = this.history.length - 1;
        this._save();
    }

    items() {
        return this.history.slice(0, -1);
    }

    clear() {
        this.history = [ this.history[this.history.length - 1] ];
        this._save();
    }

    hasNext() {
        return this.cursor < (this.history.length - 1);
    }

    hasPrev() {
        return this.cursor > 0;
    }

    prev() {
        --this.cursor;
        return this._setHistory();
    }

    next() {
        ++this.cursor;
        return this._setHistory();
    }

    top() {
        this.cursor = 0;
        return this._setHistory();
    }

    end() {
        this.cursor = this.history.length - 1;
        return this._setHistory();
    }

    search(term) {
        if (!term && !this.lastSearchTerm) {
            return null;
        }

        let iterations = this.history.length;

        if (term === this.lastSearchTerm) {
            this.searchCursor--;
            iterations--;
        } else if (!term) {
            term = this.lastSearchTerm;
        }

        this.lastSearchTerm = term;

        for (let n = 0; n < iterations; n++) {
            if (this.searchCursor < 0) {
                this.searchCursor = this.history.length - 1;
            }

            const idx = this.history[this.searchCursor].indexOf(term);

            if (idx !== -1) {
                return {
                    text: this.history[this.searchCursor],
                    cursoridx: idx,
                    term: term
                };
            }

            this.searchCursor--;
        }

        return null;
    }

    applySearch() {
        if (!this.lastSearchTerm) {
            return null;
        }

        this._log(`setting history to position ${this.searchCursor}(${this.cursor}): ${this.history[this.searchCursor]}`);
        this.cursor = this.searchCursor;

        return this.history[this.cursor];
    }
}

export default History;
