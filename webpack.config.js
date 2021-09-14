const path = require('path')
module.exports = {
    entry: {
        a: "./index.js"
    },
    output: {
        filename: "fanshi.js",
        path: path.resolve(__dirname, "./output")
    },
    mode:"production"
 // development, production
}



