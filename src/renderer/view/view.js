const path = require('path');
const paths = require('../paths');
const d3 = require(path.join(paths.GetUIPath(), 'static', 'd3.min.js'));

const fs = require('fs');

// Class Definitions
const { BoundingBox } = require('../classes');

// Functions used from other classes
const { getSegmentsFromBuild, getContoursFromBuild, getBuildFromFilePath, setCurrentBuild, setCurrentPath } = require('../common');
const { getCurrentPath, getCurrentBuild } = require('../common');

// Event listeners

// "Display" button event listener
// Only theoretically clicked on when the player wants to skip an animation and go all the way to the end
// We simply save the last render we did and default to that here
d3.select('#display').on('click', e => {
  e.preventDefault();
  drawBuild(getCurrentBuild(), 'mainsvg');
});

// "Animate" button event listener
d3.select('#animate').on('click', e => {
  e.preventDefault();
  animateBuild();
});

// Cancels any current animation and wipes the svg
function reset () {
  for (const lineQueued in linesQueued) {
    clearTimeout(lineQueued);
  }
  d3.select('#mainsvg')
    .selectAll('*')
    .remove();
}

let animationSpeed = 1;
document.getElementById('fasterAnimation').onclick = function () {
  animationSpeed *= 1.2;
  queueSegments();
};
document.getElementById('slowerAnimation').onclick = function () {
  animationSpeed *= 0.8;
  queueSegments();
};
function queueSegments () {
  for (const lineQueued in linesQueued) {
    clearTimeout(lineQueued);
  }
  let currentTime = 0;
  for (const segment of getSegmentsFromBuild(getCurrentBuild())) {
    if (segment.animated) return;
    const velocity = getVelocityOfSegment(segment);
    currentTime += ((100 / velocity) * 10) / animationSpeed; // Add time; 100 is completely a guess, but is intended as a "middling" velocity that's a medium-speed animation
    linesQueued.push(setTimeout(outputSegment, currentTime, segment, 'mainsvg'));
  }
}

// We *could* do this recursively, but instead we just iterate through every trajectory and
// do a setTimeout with 10 ms delay added to each sequential one
const linesQueued = [];
function animateBuild () {
  reset();
  let currentTime = 0;
  for (const segment of getSegmentsFromBuild(getCurrentBuild())) {
    segment.animated = false;
    const velocity = getVelocityOfSegment(segment);
    currentTime += ((100 / velocity) * 10) / animationSpeed; // Add time; 100 is completely a guess, but is intended as a "middling" velocity that's a medium-speed animation
    linesQueued.push(setTimeout(outputSegment, currentTime, segment, 'mainsvg'));
  }
}

function getVelocityOfSegment (segment) {
  const segStyle = getCurrentBuild().segmentStyles.find(segmentStyle => {
    return segmentStyle.id === segment.segStyle;
  });
  const velProfile = getCurrentBuild().velocityProfiles.find(velocityProfile => {
    return (velocityProfile.id = segStyle.velocityProfileID);
  });
  if (velProfile === undefined) {
    throw new Error('Unable to find velocity profile with ID ' + segStyle.velocityProfileID);
  }
  return velProfile.velocity;
}

const natsort = require('natsort').default;
function populateLayerList () {
  const files = fs.readdirSync(path.join(paths.GetUIPath(), 'xml'));
  files.sort(natsort()); // See documentation for what this does: https://www.npmjs.com/package/natsort
  numThumbnailsTotal = files.length;
  files.forEach(async file => {
    const filePath = path.join(paths.GetUIPath(), 'xml', file);
    const layerNum = parseInt(file.match(/(\d+)/)[0]); // First part finds the number, second part trims zeroes

    const li = d3.select('#layerList').append('li');

    li.append('canvas')
      .attr('id', 'canvas_' + layerNum)
      .attr('width', 50)
      .attr('height', 50);
    const build = await getBuildFromFilePath(filePath);
    drawBuildCanvas(build, 'canvas_' + layerNum);

    li.append('p')
      .text('Layer ' + layerNum) // Extract only the number from the file name
      .on('click', async e => {
        e.preventDefault();
        const build = await getBuildFromFilePath(filePath);
        setCurrentBuild(build);
        setCurrentPath(filePath);
        drawBuild(build, 'mainsvg');
      });
  });
}

// Canvas is less flexible for zooming and such, but is generally more performant, so we use it for thumbnails
let numThumbnailsDrawn = 0;
let numThumbnailsTotal;
function drawBuildCanvas (build, canvasID) {
  const canvasCtx = document.getElementById(canvasID).getContext('2d');

  // Calculate bounds
  const PADDING = 2;
  const bbox = GetSvgBoundingBox(build, PADDING);

  // Calculate percentage between a and b that c is
  function percentage (a, b, c) {
    return (c - a) / (b - a);
  }

  // Canvas setup
  canvasCtx.fillStyle = 'white';
  canvasCtx.lineWidth = 0.25;
  const THUMBNAIL_SIZE = 50;
  canvasCtx.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

  // Draw contours
  canvasCtx.beginPath();
  for (const segment of getContoursFromBuild(build)) {
    const x1 = percentage(bbox.minX, bbox.maxX, segment.x1) * THUMBNAIL_SIZE;
    const y1 = percentage(bbox.minY, bbox.maxY, segment.y1) * THUMBNAIL_SIZE;
    const x2 = percentage(bbox.minX, bbox.maxX, segment.x2) * THUMBNAIL_SIZE;
    const y2 = percentage(bbox.minY, bbox.maxY, segment.y2) * THUMBNAIL_SIZE;
    canvasCtx.moveTo(x1, y1);
    canvasCtx.lineTo(x2, y2);
  }
  canvasCtx.stroke();

  numThumbnailsDrawn++;
  const progress = Math.floor((numThumbnailsDrawn / numThumbnailsTotal) * 100);
  document.getElementById('loading').textContent = `Loading. Please wait a sec... (Progress: ${progress}%)`;
  if (numThumbnailsDrawn >= numThumbnailsTotal) {
    toggleLoading();
  }
}

function toggleLoading () {
  const loading = document.getElementById('loading');
  if (loading.style.display === 'none') {
    loading.style.display = 'absolute';
  } else {
    loading.style.display = 'none';
  }
}

// The synchronous part that actually draws the svg on the screen
function drawBuild (build, svgID) {
  if (svgID === 'mainsvg') reset();

  // We need to recalculate and re-set the viewbox for each layer, as they have different bounds
  // Very good writeup on how viewBox, etc. works here: https://pandaqitutorials.com/Website/svg-coordinates-viewports
  const PADDING = 2;
  const bbox = GetSvgBoundingBox(build, PADDING);
  const BOUNDS_WIDTH = bbox.maxX - bbox.minX;
  const BOUNDS_HEIGHT = bbox.maxY - bbox.minY;
  const viewboxStr = `${bbox.minX} ${bbox.minY} ${BOUNDS_WIDTH} ${BOUNDS_HEIGHT}`;
  d3.select('#' + svgID).attr('viewBox', viewboxStr); // Basically lets us define our bounds

  // Actually output
  for (const segment of getSegmentsFromBuild(build)) {
    outputSegment(segment, svgID);
  }
}

function GetSvgBoundingBox (build, padding) {
  const bbox = new BoundingBox();
  for (const segment of getSegmentsFromBuild(build)) {
    bbox.minX = Math.min(bbox.minX, segment.x1, segment.x2);
    bbox.minY = Math.min(bbox.minY, segment.y1, segment.y2);
    bbox.maxX = Math.max(bbox.maxX, segment.x1, segment.x2);
    bbox.maxY = Math.max(bbox.maxY, segment.y1, segment.y2);
  }
  bbox.minX = (bbox.minX - padding).toFixed(4); // Apply padding and truncate huge precision, which viewBox has issues with
  bbox.minY = (bbox.minY - padding).toFixed(4);
  bbox.maxX = (bbox.maxX + padding).toFixed(4);
  bbox.maxY = (bbox.maxY + padding).toFixed(4);
  return bbox;
}

function outputSegment (segment, svgID) {
  // If this was called as part of animation sequence, remove it from arr so it doesn't get re-drawn if user speeds up or slows down draw
  segment.animated = true;
  const type = segment.type;
  let color = null;
  let stripeWidth = null;
  let dash = '';
  switch (segment.type) {
    case 'contour':
      color = '#000000'; // Black
      stripeWidth = 0.05;
      break;
    case 'hatch':
      color = '#BD0000'; // Red
      stripeWidth = 0.03;
      break;
    case 'jump':
      color = '#0000FF'; // Blue
      stripeWidth = 0.02;
      dash = '.3,.3';
      break;
    default:
      throw new Error('Unknown segment type: ' + type);
  }

  d3.select('#' + svgID)
    .append('line')
    .attr('x1', segment.x1)
    .attr('y1', segment.y1)
    .attr('x2', segment.x2)
    .attr('y2', segment.y2)
    .attr('id', 'segment-' + segment.number) // Used as a lookup number for vector querying
    .attr('stroke-dasharray', dash)
    .attr('stroke', color)
    .attr('stroke-width', stripeWidth);
}

const { ExportXML } = require('alsam-xml');
function SaveChangesToLayer () {
  const text = ExportXML(getCurrentBuild());
  fs.writeFile(currentPath, text, err => {
    if (err) throw new Error('Error writing file: ' + err);
    alert('Successfully saved changes to layer!');
  });
}
document.getElementById('save').addEventListener('click', SaveChangesToLayer);

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
// Leave this at the end; messes with the order of defining things otherwise

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
  setCurrentBuild(build);
  console.log('set build to this: ', build);
  setCurrentPath(path.join(paths.GetUIPath(), 'xml', firstFile));
  drawBuild(build, 'mainsvg');

  // Set this to false to remove the load step; useful for quick debugging stuff
  const DRAW_THUMBNAILS = true;
  if (DRAW_THUMBNAILS) {
    populateLayerList();
  } else {
    toggleLoading();
  }
}

// Sets up SVG clicking (queries nearest segment)
require('./vectorselection.js');

// Sets up SVG panning
require('./panning.js');

// Sets up SVG scrolling
require('./scrolling.js');
