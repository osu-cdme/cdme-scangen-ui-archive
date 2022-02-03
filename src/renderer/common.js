const { fs, path, paths } = require("./imports");

function wipe() {
    const files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
    for (const file of files) {
        fs.unlinkSync(path.join(paths.GetUIPath(), "xml", file));
    }
}
exports.wipe = wipe;
