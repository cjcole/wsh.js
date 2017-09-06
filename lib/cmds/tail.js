
export default {
    desc: "Show last lines",
    args: [ "?count" ],
    exec: async (term, streams, cmd, opts, args) => {
        let data;
        const count = args.count || 10;
        const buffer = [];

        while ((data = await streams.stdin.read()) !== false) {
            buffer.push(data);

            if (buffer.length > count) {
                buffer.shift();
            }
        }

        for (const data of buffer) {
            await streams.stdout.write(data);
        }
    }
};
