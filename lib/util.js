
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
    }
};

export default util;
