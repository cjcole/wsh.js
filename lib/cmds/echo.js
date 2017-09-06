
export default {
    desc: "Echo string",
    args: [ "string" ],
    exec: async (term, streams, cmd, opts, args) => {
        return await streams.stdout.write(args.string);
    }
};
