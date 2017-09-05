
export default {
    exec: async (term, streams, cmd/* , opts, args */) => {
        await streams.stderr.write(`Unrecognized command: ${cmd}\n`);
    },
    completion: async (term, cmd, name, value) => {
        if (!value) {
            value = cmd;
        }

        return term.util.bestMatch(value, term.shell._commands());
    }
};
