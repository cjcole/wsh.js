
export default {
    desc: "Show first lines",
    args: [ "?count" ],
    exec: async (term, streams, cmd, opts, args) => {
        let data;
        let count = args.count || 10;

        while ((data = await streams.stdin.read()) !== false && count > 0) {
            await streams.stdout.write(data);
            count--;
        }
    }
};
