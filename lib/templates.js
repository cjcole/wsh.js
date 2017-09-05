
const templates = {
    badCommand: ({ cmd }) => `<div class="error">Unrecognized command:&nbsp;${cmd}</div>`,
    badSplit: ({ error }) => `<div class="error">Unable&nbsp;to&nbsp;parse&nbsp;command:&nbsp;${error}</div>`,
    inputCmd: ({ id }) => `<div id="${id}"><span class="prompt"></span>&nbsp;<span class="input"><span class="left"></span><span class="cursor"></span><span class="right"></span></span></div>`,
    inputSearch: ({ id }) => `<div id="${id}">(reverse-i-search)\`<span class="searchterm"></span>\':&nbsp;<span class="input"><span class="left"></span><span class="cursor"></span><span class="right"></span></span></div>`,
    suggest: ({ suggestions }) => `<div>${suggestions.map((suggestion) => `<div>${suggestion}</div>`).join("")}</div>`,
    notFound: ({ cmd, path }) => `<div>${cmd}: ${path}: No such file or directory</div>`,
    prompt: ({ node }) => `<span class="prompt">${node.path} $</span>`,
    execError: ({ error }) => `<span class="error">${error}</span>`
};

export default templates;
