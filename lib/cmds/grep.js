
export default {
    desc: "Grep lines",
    args: [ "match" ],
    exec: async (term, streams, cmd, opts, args) => {
        let data;

        while ((data = await streams.stdin.read()) !== false) {
            if (data.includes(args.match)) {
                await streams.stdout.write(data);
            }
        }
    }
};
