
const templates = {
    history: ({ items }) => `<div>${items.map((cmd, i) => `<div>${i}&nbsp;${cmd}</div>`).join("")}</div>`,
    help: ({ commands }) => `<div><div><strong>Commands:</strong></div>${commands.map((cmd) => `<div>&nbsp;${cmd}</div>`).join("")}</div>`,
    badCommand: ({ cmd }) => `<div><strong>Unrecognized command:&nbsp;</strong>${cmd}</div>`,
    badSplit: ({ error }) => `<div><strong>Unable&nbsp;to&nbsp;parse&nbsp;command:&nbsp;</strong>${error}</div>`,
    inputCmd: ({ id }) => `<div id="${id}"><span class="prompt"></span>&nbsp;<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>`,
    inputSearch: ({ id }) => `<div id="${id}">(reverse-i-search)\`<span class="searchterm"></span>\':&nbsp;<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>`,
    suggest: ({ suggestions }) => `<div>${suggestions.map((suggestion) => `<div>${suggestion}</div>`).join("")}</div>`,
    notFound: ({ cmd, path }) => `<div>${cmd}: ${path}: No such file or directory</div>`,
    ls: ({ nodes }) => `<div>${nodes.map((node) => `<span>${node.name}&nbsp;</span>`).join("")}</div>`,
    lsEx: ({ nodes }) => `<div>${nodes.map((node) => `<div>${node.name}&nbsp;</div>`).join("")}</div>`,
    pwd: ({ node }) => `<div>${node.path}&nbsp;</div>`,
    prompt: ({ node }) => `${node.path} $`
};

export default templates;
