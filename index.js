
module.exports = {
    History: require("./js/history"),
    KillRing: require("imports-loader?this=>window!./js/killring"),
    PathHandler: require("imports-loader?this=>window!./js/pathhandler"),
    Readline: require("imports-loader?this=>window!./js/readline"),
    Shell: require("imports-loader?this=>window!./js/shell")
};
