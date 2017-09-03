
import Base from "./base";

class KillRing extends Base {
    constructor(config = {}) {
        super(config);

        this.ring = config.ring || [];
        this.cursor = config.cursor || 0;
        this.uncommitted = false;
        this.yanking = false;

        if (this.ring.length === 0) {
            this.cursor = -1;
        } else if (this.cursor >= this.ring.length) {
            this.cursor = this.ring.length - 1;
        }
    }

    isinkill() {
        return this.uncommitted;
    }

    lastyanklength() {
        if (!this.yanking) {
            return 0;
        }

        return this.ring[this.cursor].length;
    }

    append(value) {
        this.yanking = false;

        if (!value) {
            return;
        }

        if (this.ring.length === 0 || !this.uncommitted) {
            this.ring.push("");
        }

        this.cursor = this.ring.length - 1;
        this._log(`appending: ${value}`);
        this.uncommitted = true;
        this.ring[this.cursor] += value;
    }

    prepend(value) {
        this.yanking = false;

        if (!value) {
            return;
        }

        if (this.ring.length === 0 || !this.uncommitted) {
            this.ring.push("");
        }

        this.cursor = this.ring.length - 1;
        this._log(`prepending: ${value}`);
        this.uncommitted = true;
        this.ring[this.cursor] = value + this.ring[this.cursor];
    }

    commit() {
        this._log("committing");
        this.yanking = false;
        this.uncommitted = false;
    }

    yank() {
        this.commit();

        if (this.ring.length === 0) {
            return null;
        }

        this.yanking = true;

        return this.ring[this.cursor];
    }

    rotate() {
        if (!this.yanking || this.ring.length === 0) {
            return null;
        }

        --this.cursor;
        if (this.cursor < 0) {
            this.cursor = this.ring.length - 1;
        }

        return this.yank();
    }

    items() {
        return this.ring.slice(0);
    }

    clear() {
        this.ring = [];
        this.cursor = -1;
        this.yanking = false;
        this.uncommited = false;
    }
}

export default KillRing;
