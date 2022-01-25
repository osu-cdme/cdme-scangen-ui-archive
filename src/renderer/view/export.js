const { ExportXML } = require("alsam-xml");
const { getCurrentBuild, getCurrentPath } = require("../common");
const { fs } = require("../common");

document.getElementById("saveLayer").addEventListener("click", SaveChangesToLayer);
function SaveChangesToLayer() {
    const build = getCurrentBuild();
    console.log("Exporting this build: ", build);
    const text = ExportXML(build);
    console.log("Saving to this file: ", getCurrentPath());
    fs.writeFile(getCurrentPath(), text, (err) => {
        if (err) {
            alert("An error ocurred creating the file: " + err);
        }
        alert("Saved successfully!");
    });
}
