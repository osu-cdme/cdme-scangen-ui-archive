// PURPOSE: High-level control of all the JavaScript bells and whistles of the 'view.html' page

// Functions used from other classes
const { getBuildFromLayerNum, getLayerFromFilePath, setCurrentBuild, setCurrentPath } = require("../../Build");
const { path, paths, fs } = require("../../imports");
const { drawBuild } = require("./svg/drawing");

// Not likely that we change vectors much from this screen specifically, at least short term
// document.getElementById('save').addEventListener('click', SaveChangesToLayer);

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
// Leave this at the end; messes with the order of defining things otherwise
// Selectively draw different parts based on checfkbox input

const glob = require("glob");

// If XML directory doesn't exist, or is empty, they need to either generate or import
if (!fs.existsSync(path.join(paths.GetUIPath(), "xml")))
    alert("No scan files found! Generate them first via the 'Generate Vectors' tab on the left.");
const files = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
if (files.length === 0) alert("No scan files found! Generate them first via the 'Generate Vectors' tab on the left.");

// Otherwise, load files!
async function main() {
    const firstFile = files[0];
    let layerNum = getLayerFromFilePath(firstFile);
    const build = await getBuildFromLayerNum(layerNum);

    setCurrentBuild(build);
    setCurrentPath(firstFile);
    drawBuild(build, "mainsvg");

    // Set this to false to remove the load step; useful for quick debugging stuff
    const DRAW_THUMBNAILS = true;
    if (DRAW_THUMBNAILS) {
        require("./load").DrawThumbnails();
    } else {
        document.getElementById("loading").style.display = "none";
    }

    // Does everything related to "loading" (basically just the Layer List)
    require("./load.js");

    // Handles all the code that actually puts segments on a Canvas/SVG
    require("./svg/drawing.js");

    // SVG Clicking, Panning, Scrolling, Animation
    require("./querying/clicking.js");
    require("./svg/panning.js");
    require("./svg/scrolling.js");
    require("./svg/animation.js");

    // Sets up segment styles and profiles behavior
    require("./stylesandprofiles.js");

    // Sets up "save current build to file" functionality
    require("./export.js");
}
main();
