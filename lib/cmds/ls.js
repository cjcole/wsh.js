
export default {
    desc: "List items",
    args: [ "?path" ],
    exec: async (term, streams, cmd, opts, args) => {
        const node = args.path ? await term.pathhandler.getNode(args.path) : term.current();

        if (!node) {
            const error = `ls: ${args.path}: No such file or directory\n`;
            return await streams.stderr.write(error);
        }

        const children = await term.pathhandler.getChildNodes(node);

        for (const child of children) {
            await streams.stdout.write(`${child.name}\n`);
        }
    },
    completion: async (term, cmd, name, value) => {
        if (name === "path") {
            return await term.completePath(value);
        }

        return [];
    }
};
