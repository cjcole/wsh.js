
export default {
    desc: "Grep lines",
    args: [ "match" ],
    exec: async (term, streams, cmd, opts, args) => {
        let data = await streams.stdin.read();

        while (data !== false) {
            if (data.includes(args.match)) {
                await streams.stdout.write(data);
            }

            data = await streams.stdin.read();
        }
    }
};
