
export default {
    desc: "Print help",
    exec: async (term, streams/* , cmd, opts, args */) => {
        const items = term.shell._commands();

        for (const item of items) {
            await streams.stdout.write(` ${item}\n`);
        }
    }
};
