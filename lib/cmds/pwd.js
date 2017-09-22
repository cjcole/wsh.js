
export default {
    desc: "Print current location",
    exec: async (term, streams/* , cmd, opts, args */) => {
        await streams.stdout.write(`${term.current().path}\n`);
    }
};
