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
main();
async function main() {
    // If xml directory doesn't exist, create it
    if (!fs.existsSync(path.join(paths.GetUIPath(), "xml"))) {
        fs.mkdirSync(path.join(paths.GetUIPath(), "xml"));
    }

    // Get all files in directory with .xml ending
    const files = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
    if (files.length === 0) {
        // Send them elsewhere if no .XML files to view
        alert("No scan files found! Generate them first via the 'Generate Vectors' tab on the left.");
        return;
    }

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
}

// Initiates page load
require("./load.js");

// Handles actual drawing code
require("./svg/drawing.js");

// Sets up SVG clicking (queries nearest segment)
require("./querying/vectorselection.js");

// Sets up SVG panning
require("./svg/panning.js");

// Sets up SVG scrolling
require("./svg/scrolling.js");

// Sets up animation
require("./svg/animation.js");

// Sets up segment styles and profiles behavior
// require("./stylesandprofiles.js");

// Sets up "save current build to file" functionality
require("./export.js");
