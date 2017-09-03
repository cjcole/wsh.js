
export default {
    desc: "Print help",
    exec: async (term/* , cmd, opts, args */) => {
        return term.templates.help({ commands: term.shell._commands() });
    }
};
