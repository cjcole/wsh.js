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

import templates from "./templates";

class PathHandler {
    constructor(shell, config = {}) {
        this.debug = !!config.debug;
        this.shell = shell;
        this.originalDefault = this.shell.getCommandHandler("_default");
        this.current = null;

        this._load();
    }

    _log(...args) {
        this.debug && console.log(...args);
    }

    _load() {
        this.shell.setCommandHandler("ls", {
            exec: this._ls.bind(this),
            completion: this._pathCompletionHandler.bind(this)
        });

        this.shell.setCommandHandler("pwd", {
            exec: this._pwd.bind(this),
            completion: this._pathCompletionHandler.bind(this)
        });

        this.shell.setCommandHandler("cd", {
            exec: this._cd.bind(this),
            completion: this._pathCompletionHandler.bind(this)
        });

        this.shell.setCommandHandler("_default", {
            exec: this.originalDefault.exec,
            completion: this._commandAndpathCompletionHandler.bind(this)
        });

        this.shell.onNewPrompt((callback) => {
            callback(this.getPrompt());
        });
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

    _commandAndpathCompletionHandler(cmd, arg, line, callback) {
        this._log(`calling command and path completion handler w/ cmd: '${cmd}', arg: '${arg}'`);

        arg = arg || cmd;

        if (arg[0] === "." || arg[0] === "/") {
            return this._pathCompletionHandler(cmd, arg, line, callback);
        }

        return this.originalDefault.completion(cmd, arg, line, callback);
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
            callback(this.shell.bestMatch(partial, childNodes.map((x) => x.name)));
        });
    }

    _cd(cmd, args, callback) {
        this.getNode(args[0], (node) => {
            if (!node) {
                return callback(templates.notFound({ cmd: "cd", path: args[0] }));
            }

            this.current = node;

            return callback();
        });
    }

    _pwd(cmd, args, callback) {
        callback(templates.pwd({ node: this.current }));
    }

    _ls(cmd, args, callback) {
        this._log("ls");

        args = args || [];

        const full = args && args[0] === "-l";

        if (full) {
            args.shift();
        }

        if (!args[0]) {
            return this._renderLs(this.current, this.current.path, full, callback);
        }

        return this.getNode(args[0], (node) => {
            this._renderLs(node, args[0], full, callback);
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
