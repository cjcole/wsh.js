
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
        this.closeDeferred = new Deferred();
        this.readDeferred = new Deferred();

        this.on("data", async (data) => {
            const deferred = this.readDeferred;
            this.readDeferred = new Deferred();
            deferred.resolve(data);
        });
    }

    read() {
        return this.readDeferred.promise;
    }

    async write(data) {
        if (typeof data !== "string") {
            throw new Error("data must be of type string");
        }

        await this._trigger("data", data);
    }

    async close() {
        this.closeDeferred.resolve();
        this.closeDeferred = new Deferred();
        await this._trigger("data", false);
    }

    async awaitClose() {
        await this.closeDeferred.promise;
    }

    isPipe() {
        return this.pipe;
    }
}

export default Stream;
