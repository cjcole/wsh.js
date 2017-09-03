
const util = {
    bestMatch: (partial, possible) => {
        const result = {
            completion: null,
            suggestions: []
        };

        if (!possible || possible.length === 0) {
            return result;
        }

        let common = "";

        if (!partial) {
            if (possible.length === 1) {
                result.completion = possible[0];
                result.suggestions = possible;
                return result;
            }

            if (!possible.every((x) => possible[0][0] === x[0])) {
                result.suggestions = possible;
                return result;
            }
        }

        for (let i = 0; i < possible.length; i++) {
            const option = possible[i];

            if (option.slice(0, partial.length) === partial) {
                result.suggestions.push(option);

                if (!common) {
                    common = option;
                } else if (option.slice(0, common.length) !== common) {
                    let j = partial.length;

                    while (j < common.length && j < option.length) {
                        if (common[j] !== option[j]) {
                            common = common.substr(0, j);
                            break;
                        }

                        j++;
                    }
                }
            }
        }

        result.completion = common.substr(partial.length);
        return result;
    },
    parseArgs(rawArgs, cmdArgs = [], cmdOpts = {}) {
        const argsList = rawArgs.filter((a) => a[0] !== "-");
        const optsList = rawArgs.filter((a) => a[0] === "-").map((a) => a.substr(1));

        if (optsList.includes("h")) {
            throw new Error();
        }

        const opts = {};
        const args = {};

        for (const name of optsList) {
            if (!cmdOpts[name]) {
                throw new Error(`Unknown option -${name}`);
            }
        }

        for (const name of Object.keys(cmdOpts || {})) {
            opts[name] = optsList.includes(name);
        }

        if (cmdArgs) {
            for (let n = 0; n < cmdArgs.length; n++) {
                const rawName = cmdArgs[n];
                const optional = rawName[0] === "?";
                const name = optional ? rawName.substr(1) : rawName;

                if (optional) {
                    if (argsList[n]) {
                        args[name] = argsList[n];
                    } else {
                        break;
                    }
                } else if (argsList[n]) {
                    args[name] = argsList[n];
                } else {
                    throw new Error(`Missing parameter ${name}`);
                }
            }
        }

        return { opts, args };
    }
};

export default util;
