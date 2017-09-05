
export default {
    desc: "Change location",
    args: [ "path" ],
    exec: async (term, streams, cmd, opts, args) => {
        const node = await term.pathhandler.getNode(args.path);

        if (!node) {
            const error = `${cmd}: ${args.path}: No such file or directory\n`;
            return await streams.stderr.write(error);
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
