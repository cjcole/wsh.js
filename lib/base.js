
class Base {
    constructor(config = {}) {
        this.debug = !!config.debug;
        this.eventHandlers = {};
    }

    _log(...args) {
        this.debug && console.log(...args);
    }

    _trigger(event, ...args) {
        return this.eventHandlers[event] && this.eventHandlers[event](...args);
    }

    on(event, fn) {
        this.eventHandlers[event] = fn;
    }
}

export default Base;
