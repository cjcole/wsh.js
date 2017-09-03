
export default {
    desc: "Print current location",
    exec: async (term/* , cmd, opts, args */) => {
        return term.templates.pwd({ node: term.current() });
    }
};
