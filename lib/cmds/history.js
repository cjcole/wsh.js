
export default {
    desc: "Show history",
    exec: async (term, cmd, opts/* , args */) => {
        if (opts.c) {
            term.shell.history.clear();
            return;
        }

        return term.templates.history({ items: term.shell.history.items() });
    }
};
