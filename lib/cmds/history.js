
export default {
    desc: "Show history",
    exec: async (term, streams, cmd, opts/* , args */) => {
        if (opts.c) {
            term.shell.history.clear();
            return;
        }

        const items = term.shell.history.items();

        for (let n = 0; n < items.length; n++) {
            await streams.stdout.write(` ${n} ${items[n]}\n`);
        }
    }
};
