
import Shell from "./shell";
import PathHandler from "./pathhandler";
import templates from "./templates";
import util from "./util";

class Terminal {
    constructor(config) {
        this.templates = templates;
        this.util = util;
        this.shell = new Shell(config, this);
        this.pathhandler = new PathHandler(config, this.shell);
        this.pathhandler.current = {
            name: "",
            path: "/"
        };

        this.pathhandler.getNode = async (path) => config.getNode(path);
        this.pathhandler.getChildNodes = async (node) => config.getChildNodes(node.path);
    }

    current() {
        return this.pathhandler.current;
    }

    async completePath(path) {
        return await this.pathhandler.pathCompletionHandler(null, path, null);
    }

    log(text) {
        this.shell.log(text);
    }

    setPrompt(opts) {
        this.shell._renderPrompt(opts);
    }

    setCommandHandler(name, cmdHandler) {
        this.shell.setCommandHandler(name, cmdHandler);
    }

    isActive() {
        return this.shell.isActive();
    }

    activate() {
        this.shell.activate();
    }

    deactivate() {
        this.shell.deactivate();
    }

    on(...args) {
        this.shell.on(...args);
    }
}

export default Terminal;
