// Electron makes a fuss when imports collide, so we instead import them from a file
const fs = require("fs");
const path = require("path");
const paths = require("./paths");

module.exports = {
    fs: fs,
    path: path,
    paths: paths,
};
