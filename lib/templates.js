
const templates = {
    inputCmd: ({ id }) => `<div id="${id}"><span class="prompt"></span>&nbsp;<span class="input"><span class="left"></span><span class="cursor"></span><span class="right"></span></span></div>`,
    inputSearch: ({ id }) => `<div id="${id}">(reverse-i-search)\`<span class="searchterm"></span>\':&nbsp;<span class="input"><span class="left"></span><span class="cursor"></span><span class="right"></span></span></div>`,
    suggest: ({ suggestions }) => `<div>${suggestions.map((suggestion) => `<div>${suggestion}</div>`).join("")}</div>`,
    prompt: ({ node }) => `<span class="cmdPrompt">${node.path} $</span>`
};

export default templates;
