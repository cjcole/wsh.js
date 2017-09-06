
import Terminal from "../lib/terminal";
import cmdQuestion from "./cmds/question";

const terminal = new Terminal({
    getNode: async (path) => {
        return {
            name: path.split("/").reverse()[0],
            path: path
        };
    },
    getChildNodes: async (path) => {
        return [
            { name: "etc", path: `${path}/etc` },
            { name: "var", path: `${path}/var` },
            { name: "usr", path: `${path}/usr` }
        ];
    }
});

terminal.setCommandHandler("question", cmdQuestion);

terminal.on("activating", () => {
    terminal.log("<strong>*****************************</strong>\n");
    terminal.log("<strong>**                         **</strong>\n");
    terminal.log("<strong>**    Welcome to wsh.js    **</strong>\n");
    terminal.log("<strong>**                         **</strong>\n");
    terminal.log("<strong>*****************************</strong>\n");
    terminal.log(" \n");
    terminal.log("<i>Type help to see available commands</i>\n");
    terminal.log(" \n");
});

terminal.activate();
