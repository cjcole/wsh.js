
import Base from "./base";

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

class Stream extends Base {
    constructor(pipe = true) {
        super();

        this.pipe = pipe;
        this.readDeferred = new Deferred();
        this.buffer = [];
        this.aborted = false;

        this.on("data", async (data) => {
            this.buffer.push(data);

            const deferred = this.readDeferred;
            this.readDeferred = new Deferred();
            deferred.resolve();
        });
    }

    async read() {
        if (this.aborted) {
            this.aborted = false;
            this.buffer.length = 0;
            throw new Error("Command aborted");
        }

        if (this.buffer.length > 0) {
            return this.buffer.shift();
        }

        await this.readDeferred.promise;

        return this.read();
    }

    async write(data) {
        if (typeof data !== "string") {
            throw new Error("data must be of type string");
        }

        await this._trigger("data", data);
    }

    async close() {
        await this._trigger("data", false);
    }

    async abort() {
        this.aborted = true;
        await this._trigger("data", false);
    }

    isPipe() {
        return this.pipe;
    }
}

export default Stream;
