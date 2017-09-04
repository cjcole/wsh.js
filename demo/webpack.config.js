"use strict";

const path = require("path");
const webpack = require("webpack");

process.traceDeprecation = true;

module.exports = function() {
    const cfg = {
        entry: {
            bundle: [
                "babel-polyfill",
                path.join(__dirname, "index.js")
            ]
        },
        output: {
            path: path.join(__dirname, "build"),
            filename: "[name].js"
        },
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    loader: "babel-loader",
                    include: [
                        __dirname
                    ],
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
            ],
            alias: {
                jquery: "jquery/src/jquery"
            }
        },
        /* Declare node modules empty, not present in browser */
        node: {
            fs: "empty",
            net: "empty",
            tls: "empty",
            module: "empty"
        }
    };

    cfg.plugins.concat([
        new webpack.LoaderOptionsPlugin({
            debug: true
        })

    ]);

    cfg.devtool = "cheap-module-source-map";
    cfg.output.publicPath = "/js";
    cfg.devServer = {
        host: "localhost",
        port: 8080 // Will be changed later when port is known
    };

    return cfg;
};
