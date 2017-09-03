
export default {
    desc: "Change location",
    args: [ "path" ],
    exec: async (term, cmd, opts, args) => {
        const node = await term.pathhandler.getNode(args.path);

        if (!node) {
            return term.templates.notFound({ cmd: cmd, path: args.path });
        }

        term.pathhandler.current = node;
    },
    completion: async (term, cmd, name, value) => {
        if (name === "path") {
            return await term.completePath(value);
        }

        return [];
    }
};
