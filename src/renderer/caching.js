const { fs, path, paths } = require("./imports");
const { getLayerFromFilePath, getBuildFromLayerNum } = require("./Build");

// TODO: Convert caching functions to just one file path
// Likely better to just convert it to one function and have the caller call it for every layer

// Regenerates thumbnail images and saved .json Build object representations for the given layer number
async function cache(layerNum) {
    await cacheThumbnail(layerNum);
    await cacheBuild(layerNum);
}
exports.cache = cache;

// Saves a .svg file corresponding to each given layer to file at folder 'xml/_X.svg' where X is the layer number
// Source for much of the code is https://stackoverflow.com/a/23218877/6402548
const { drawBuildCanvas } = require("./pages/view/svg/drawing");
async function cacheThumbnail(layerNum) {
    const build = await getBuildFromLayerNum(layerNum);
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
}

// Save build objects to file
const glob = require("glob");
async function cacheBuild(layerNum) {
    let build = await getBuildFromLayerNum(layerNum);
    fs.writeFileSync(path.join(paths.GetUIPath(), "xml", build.header.layerNum + ".json"), JSON.stringify(build));
}
