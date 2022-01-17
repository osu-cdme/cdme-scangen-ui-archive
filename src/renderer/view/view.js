// PURPOSE: High-level control of all the JavaScript bells and whistles of the 'view.html' page

// Functions used from other classes
const { getBuildFromFilePath, setCurrentBuild, setCurrentPath } = require('../common');
const { path, paths, fs } = require('../common');
const { drawBuild } = require('./drawing');
const { getSettings } = require('./drawing');

// Not likely that we change vectors much from this screen specifically, at least short term
// document.getElementById('save').addEventListener('click', SaveChangesToLayer);

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
// Leave this at the end; messes with the order of defining things otherwise
// Selectively draw different parts based on checfkbox input

main();
async function main () {
  // If xml directory doesn't exist, create it
  if (!fs.existsSync(path.join(paths.GetUIPath(), 'xml'))) {
    fs.mkdirSync(path.join(paths.GetUIPath(), 'xml'));
  }

  const files = fs.readdirSync(path.join(paths.GetUIPath(), 'xml'));
  if (files.length === 0) {
    // Send them elsewhere if no .XML files to view
    alert("No scan files found! Generate them first via the 'Generate Vectors' tab on the left.");
    return;
  }

  const firstFile = files[0];
  const build = await getBuildFromFilePath(path.join(paths.GetUIPath(), 'xml', firstFile));
  for (const segStyle of build.segmentStyles) {
    if (segStyle.travelers.length) {
      for (const traveler of segStyle.travelers) {
        powerMin = Math.min(powerMin, traveler.power);
        powerMax = Math.max(powerMax, traveler.power);
      }
    }
  }

  setCurrentBuild(build);
  setCurrentPath(path.join(paths.GetUIPath(), 'xml', firstFile));
  drawBuild(build, 'mainsvg', getSettings());

  // Set this to false to remove the load step; useful for quick debugging stuff
  const DRAW_THUMBNAILS = false;
  if (DRAW_THUMBNAILS) {
    require('./load').DrawThumbnails();
  } else {
    document.getElementById('loading').style.display = 'none';
  }
}

// Calculate power bounds, which is used to color segments
let powerMin = 9999999; let powerMax = -99999999;

// Initiates page load
require('./load.js');

// Handles actual drawing code
require('./drawing.js');

// Sets up SVG clicking (queries nearest segment)
require('./vectorselection.js');

// Sets up SVG panning
require('./panning.js');

// Sets up SVG scrolling
require('./scrolling.js');

// Sets up animation
require('./animation.js');
