
import Base from "./base";
import templates from "./templates";
import util from "./util";

class PathHandler extends Base {
    constructor(shell, config = {}) {
        super(config);
        this.shell = shell;
        this.current = null;

        this._load();
    }

    _load() {
        this.shell.setCommandHandler("ls", {
            desc: "List items",
            args: [ "?path" ],
            opts: {
                l: "Full listing"
            },
            exec: this._ls.bind(this),
            completion: async (cmd, argName, arg, line) => {
                if (argName !== "path") {
                    return;
                }

                return await this._pathCompletionHandler(cmd, arg, line);
            }
        });

        this.shell.setCommandHandler("pwd", {
            desc: "Print current location",
            exec: this._pwd.bind(this)
        });

        this.shell.setCommandHandler("cd", {
            desc: "Change location",
            args: [ "path" ],
            exec: this._cd.bind(this),
            completion: async (cmd, argName, arg, line) => {
                if (argName !== "path") {
                    return;
                }

                return await this._pathCompletionHandler(cmd, arg, line);
            }
        });

        this.shell.setDefaultPromptRenderer(() => this.getPrompt());
    }

    async getNode(/* path */) {
    }

    async getChildNodes(/* node */) {
    }

    getPrompt() {
        return templates.prompt({ node: this.current });
    }

    async _pathCompletionHandler(cmd, arg/* , line */) {
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

    async _cd(cmd, opts, args) {
        const node = await this.getNode(args.path);

        if (!node) {
            return templates.notFound({ cmd: "cd", path: args.path });
        }

        this.current = node;
    }

    async _pwd(/* cmd, opts, args */) {
        return templates.pwd({ node: this.current });
    }

    async _ls(cmd, opts, args) {
        this._log("ls");

        args = args || [];

        if (!args.path) {
            return await this._renderLs(this.current, this.current.path, opts.l);
        }

        const node = await this.getNode(args.path);

        return await this._renderLs(node, args.path, opts.l);
    }

    async _renderLs(node, path, full) {
        if (!node) {
            return templates.notFound({ cmd: "ls", path: path });
        }

        const template = full ? templates.lsEx : templates.ls;
        const children = await this.getChildNodes(node, full);
        this._log(`finish render: ${node.name}`);

        return template({ nodes: children });
    }
}

export default PathHandler;
