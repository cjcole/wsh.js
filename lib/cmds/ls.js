
export default {
    desc: "List items",
    args: [ "path" ],
    exec: async (term, cmd, opts, args) => {
        const node = args.path ? await term.pathhandler.getNode(args.path) : term.current();

        if (!node) {
            return term.templates.notFound({ cmd: "ls", path: args.path });
        }

        const children = await term.pathhandler.getChildNodes(node);

        return term.templates.ls({ nodes: children });
    },
    completion: async (term, cmd, name, value) => {
        if (name === "path") {
            return await term.completePath(value);
        }

        return [];
    }
};
