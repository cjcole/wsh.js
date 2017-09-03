
export default {
    exec: async (term, cmd/* , opts, args */) => {
        return term.templates.badCommand({ cmd: cmd });
    },
    completion: async (term, cmd, name, value) => {
        if (!value) {
            value = cmd;
        }

        return term.util.bestMatch(value, term.shell._commands());
    }
};
