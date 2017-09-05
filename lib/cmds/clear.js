
export default {
    desc: "Clear output",
    exec: async (term/* , streams, cmd, opts, args */) => {
        term.shell.clear();
    }
};
