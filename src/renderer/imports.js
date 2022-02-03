// Electron makes a fuss when imports collide, so we instead import them from a file
const fs = require("fs");
const path = require("path");
const paths = require("./paths");
const d3 = require("static/d3.min.js");

module.exports = {
    fs: fs,
    path: path,
    paths: paths,
    d3: d3,
};
