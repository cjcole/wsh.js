
const path = require("path");

module.exports = {
    entry: {
        bundle: [
            "babel-polyfill",
            path.join(__dirname, "index.js")
        ]
    },
    output: {
        path: path.join(__dirname, "build"),
        filename: "[name].js",
        publicPath: "/js"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: "babel-loader",
                exclude: (absPath) => {
                    return /node_modules/.test(absPath);
                },
                options: {
                    cacheDirectory: "babel_cache",
                    presets: [
                        require.resolve("babel-preset-es2015"),
                        require.resolve("babel-preset-stage-1")
                    ],
                    plugins: [
                        [ require.resolve("babel-plugin-transform-async-to-module-method"), {
                            "module": "bluebird",
                            "method": "coroutine"
                        } ]
                    ]
                }
            }
        ]
    },
    plugins: [
        require("imports-loader")
    ],
    resolve: {
        modules: [
            "node_modules",
            path.join(__dirname, "node_modules")
        ]
    },
    node: {
        fs: "empty",
        net: "empty",
        tls: "empty",
        module: "empty"
    },
    devtool: "cheap-module-source-map",
    devServer: {
        host: "localhost",
        port: 8080
    }
};
