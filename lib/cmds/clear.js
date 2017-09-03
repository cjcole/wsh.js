
export default {
    desc: "Clear output",
    exec: async (term/* , cmd, opts, args */) => {
        term.shell.clear();
    }
};
