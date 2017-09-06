
export default {
    desc: "Example for asking questions",
    exec: async (term, streams/* , cmd, opts, args */) => {
        await streams.stdout.write("Just answer anything, this is just an example");

        term.setPrompt({ prompt: "Name:" });
        const name = await streams.stdin.read();


        term.setPrompt({ prompt: "Password:", obscure: true });
        const password = await streams.stdin.read();

        await streams.stdout.write(`Your name is ${name} and password is ${password}`);
    }
};
