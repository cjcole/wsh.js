
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
            completion: (cmd, argName, arg, line, callback) => {
                if (argName !== "path") {
                    return callback();
                }

                this._pathCompletionHandler(cmd, arg, line, callback);
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
            completion: (cmd, argName, arg, line, callback) => {
                if (argName !== "path") {
                    return callback();
                }

                this._pathCompletionHandler(cmd, arg, line, callback);
            }
        });

        this.shell.setDefaultPromptRenderer(() => this.getPrompt());
    }

    getNode(path, callback) {
        callback();
    }

    getChildNodes(node, callback) {
        callback([]);
    }

    getPrompt() {
        return templates.prompt({ node: this.current });
    }

    _pathCompletionHandler(cmd, arg, line, callback) {
        this._log(`completing '${arg}'`);

        if (!arg) {
            this._log("completing on current");

            return this._completeChildren(this.current, "", callback);
        }

        if (arg[arg.length - 1] === "/") {
            this._log("completing children w/o partial");

            return this.getNode(arg, (node) => {
                if (!node) {
                    this._log("no node for path");

                    return callback();
                }

                return this._completeChildren(node, "", callback);
            });
        }

        const lastPathSeparator = arg.lastIndexOf("/");
        const parent = arg.substr(0, lastPathSeparator + 1);
        const partial = arg.substr(lastPathSeparator + 1);

        if (partial === ".." || partial === ".") {
            return callback({
                completion: "/",
                suggestions: []
            });
        }

        this._log(`completing children via parent '${parent}'  w/ partial '${partial}'`);

        return this.getNode(parent, (node) => {
            if (!node) {
                this._log("no node for parent path");

                return callback();
            }

            return this._completeChildren(node, partial, (completion) => {
                if (completion && completion.completion === "" && completion.suggestions.length === 1) {
                    return callback({
                        completion: "/",
                        suggestions: []
                    });
                }

                return callback(completion);
            });
        });
    }

    _completeChildren(node, partial, callback) {
        this.getChildNodes(node, (childNodes) => {
            callback(util.bestMatch(partial, childNodes.map((x) => x.name)));
        });
    }

    _cd(cmd, opts, args, callback) {
        this.getNode(args.path, (node) => {
            if (!node) {
                return callback(templates.notFound({ cmd: "cd", path: args.path }));
            }

            this.current = node;

            return callback();
        });
    }

    _pwd(cmd, opts, args, callback) {
        callback(templates.pwd({ node: this.current }));
    }

    _ls(cmd, opts, args, callback) {
        this._log("ls");

        args = args || [];

        if (!args.path) {
            return this._renderLs(this.current, this.current.path, opts.l, callback);
        }

        return this.getNode(args.path, (node) => {
            this._renderLs(node, args.path, opts.l, callback);
        });
    }

    _renderLs(node, path, full, callback) {
        if (!node) {
            return callback(templates.notFound({ cmd: "ls", path: path }));
        }

        const getChildNodes = full ? this.getChildNodesEx : this.getChildNodes;

        return getChildNodes(node, (children) => {
            this._log(`finish render: ${node.name}`);

            if (full) {
                callback(templates.lsEx({ nodes: children }));
            } else {
                callback(templates.ls({ nodes: children }));
            }
        });
    }
}

export default PathHandler;
