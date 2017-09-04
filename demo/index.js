
import Terminal from "../lib/terminal";

const terminal = new Terminal({
    getNode: async (path) => {
        return {
            name: path.split("/").reverse()[0],
            path: path
        };
    },
    getChildNodes: async (path) => {
        return [
            { name: "testA", path: `${path}/testA` },
            { name: "testB", path: `${path}/testB` },
            { name: "testC", path: `${path}/testC` }
        ];
    }
});

terminal.activate();
