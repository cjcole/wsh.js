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

class KillRing {
    constructor(config = {}) {
        this.debug = !!config.debug;
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

    _log(...args) {
        this.debug && console.log(...args);
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
