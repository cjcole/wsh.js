
import Base from "./base";
import templates from "./templates";
import util from "./util";
import cmdCd from "./cmds/cd";
import cmdLs from "./cmds/ls";
import cmdPwd from "./cmds/pwd";

class PathHandler extends Base {
    constructor(config, shell) {
        super(config);
        this.shell = shell;
        this.current = null;

        this.shell.setCommandHandler("cd", cmdCd);
        this.shell.setCommandHandler("ls", cmdLs);
        this.shell.setCommandHandler("pwd", cmdPwd);

        this.shell.setDefaultPromptRenderer(() => this.getPrompt());
    }

    async getNode(/* path */) {
    }

    async getChildNodes(/* node */) {
    }

    getPrompt() {
        return templates.prompt({ node: this.current });
    }

    async pathCompletionHandler(cmd, arg/* , line */) {
        this._log(`completing '${arg}'`);

        if (!arg) {
            this._log("completing on current");

            return await this._completeChildren(this.current, "");
        }

        if (arg[arg.length - 1] === "/") {
            this._log("completing children w/o partial");

            const node = await this.getNode(arg);

            if (!node) {
                this._log("no node for path");
                return;
            }

            return await this._completeChildren(node, "");
        }

        const lastPathSeparator = arg.lastIndexOf("/");
        const parent = arg.substr(0, lastPathSeparator + 1);
        const partial = arg.substr(lastPathSeparator + 1);

        if (partial === ".." || partial === ".") {
            return {
                completion: "/",
                suggestions: []
            };
        }

        this._log(`completing children via parent '${parent}'  w/ partial '${partial}'`);

        const node = await this.getNode(parent);

        if (!node) {
            this._log("no node for parent path");

            return;
        }

        const completion = await this._completeChildren(node, partial);

        if (completion && completion.completion === "" && completion.suggestions.length === 1) {
            return {
                completion: "/",
                suggestions: []
            };
        }

        return completion;
    }

    async _completeChildren(node, partial) {
        const childNodes = await this.getChildNodes(node);

        return util.bestMatch(partial, childNodes.map((x) => x.name));
    }
}

export default PathHandler;
