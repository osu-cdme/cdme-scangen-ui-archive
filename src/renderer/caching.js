const { path, paths } = require("./imports");
const { getLayerFromFilePath } = require("./Build");

// Saves a .svg file corresponding to each given layer to file at folder 'xml/_X.svg' where X is the layer number
// Source for much of the code is https://stackoverflow.com/a/23218877/6402548
const { getBuildFromFilePath } = require("./Build");
const { drawBuildCanvas } = require("./pages/view/svg/drawing");
async function cacheThumbnails(needsHTML) {
    // Read all files in 'xml' folder
    const progressText = document.getElementById("progressText");
    let numDone = 0;
    const glob = require("glob");
    console.log("Querying for files at ", path.join(paths.GetUIPath(), "xml"));
    const files = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
    for (const file of files) {
        // Generate segment with all our things
        const layerNum = getLayerFromFilePath(file);
        let build;
        if (needsHTML) build = await getBuildFromFilePath(layerNum, true);
        else build = await getBuildFromFilePath(layerNum);

        // Create the canvas object then use existing drawing functionality to link it
        const canvas = document.createElement("canvas");
        const THUMBNAIL_SIZE = 30;
        canvas.width = THUMBNAIL_SIZE;
        canvas.height = THUMBNAIL_SIZE;
        drawBuildCanvas(build, canvas);

        // Write canvas to png file
        const url = canvas.toDataURL("image/png", 1.0);
        const base64Data = url.replace(/^data:image\/png;base64,/, "");
        const fs = require("fs");
        fs.writeFile(path.join(paths.GetUIPath(), "xml", `${layerNum}.png`), base64Data, "base64", function (err) {
            if (err) {
                console.log(err);
            }
        });

        numDone++;
        if (progressText !== null) {
            document.getElementById("progressText").textContent = `(Step 4 of 4) Generating Thumbnails (${numDone} / ${files.length})`;
            document.getElementById("done").style.width = (numDone / files.length) * 100 + "%";
        }
    }
    return true;
}
exports.cacheThumbnails = cacheThumbnails;

// Save build objects to file
const glob = require("glob");
async function cacheBuilds(needsHTML) {
    const progressText = document.getElementById("progressText");
    let numDone = 0;

    console.log("Reading from this folder: " + path.join(paths.GetUIPath(), "xml"));
    const files = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
    console.log("files: ", files);
    for (const file of files) {
        let layerNum = getLayerFromFilePath(file);
        let build;
        if (needsHTML) build = await getBuildFromFilePath(layerNum, true);
        else build = await getBuildFromFilePath(layerNum);
        const fs = require("fs");
        fs.writeFileSync(path.join(paths.GetUIPath(), "xml", build.header.layerNum + ".json"), JSON.stringify(build));
        numDone++;
        if (progressText !== null) {
            document.getElementById("progressText").textContent = `(Step 3 of 4) Generating 'Build' Objects (${numDone} / ${files.length})`;
            document.getElementById("done").style.width = (numDone / files.length) * 100 + "%";
        }
    }
}
exports.cacheBuilds = cacheBuilds;
