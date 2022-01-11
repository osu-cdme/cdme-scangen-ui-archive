const path = require('path');
const paths = require('../paths');
const d3 = require(path.join(paths.GetUIPath(), 'static', 'd3.min.js'));

const fs = require('fs');

// Class Definitions
const { BoundingBox } = require('../classes');

// Functions used from other classes
const { getSegmentsFromBuild, getContoursFromBuild, getBuildFromFilePath } = require('../common');

// Event listeners

// "Display" button event listener
// Only theoretically clicked on when the player wants to skip an animation and go all the way to the end
// We simply save the last render we did and default to that here
d3.select('#display').on('click', e => {
  e.preventDefault();
  drawBuild(currentBuild, 'mainsvg');
});

// "Animate" button event listener
d3.select('#animate').on('click', e => {
  e.preventDefault();
  animateBuild(currentBuild);
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
  currentBuild.trajectories.forEach(trajectory => {
    if (trajectory.paths === []) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
    trajectory.paths.forEach(path => {
      if (path.segments.length === 0) return; // Likely never true, but worth checking
      path.segments.forEach(segment => {
        if (segment.animated) return;
        const velocity = getVelocityOfSegment(segment);
        currentTime += ((100 / velocity) * 10) / animationSpeed; // Add time; 100 is completely a guess, but is intended as a "middling" velocity that's a medium-speed animation
        linesQueued.push(setTimeout(outputSegment, currentTime, segment, path, 'mainsvg'));
      });
    });
  });
}

// We *could* do this recursively, but instead we just iterate through every trajectory and
// do a setTimeout with 10 ms delay added to each sequential one
const linesQueued = [];
function animateBuild (build) {
  reset();
  let currentTime = 0;
  build.trajectories.forEach(trajectory => {
    if (trajectory.paths === []) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
    trajectory.paths.forEach(path => {
      if (path.segments.length === 0) return; // Likely never true, but worth checking
      path.segments.forEach(segment => {
        segment.animated = false;
        const velocity = getVelocityOfSegment(segment);
        currentTime += ((100 / velocity) * 10) / animationSpeed; // Add time; 100 is completely a guess, but is intended as a "middling" velocity that's a medium-speed animation
        linesQueued.push(setTimeout(outputSegment, currentTime, segment, path, 'mainsvg'));
      });
    });
  });
}

function getVelocityOfSegment (segment) {
  const segStyle = currentBuild.segmentStyles.find(segmentStyle => {
    return segmentStyle.id === segment.segStyle;
  });
  const velProfile = currentBuild.velocityProfiles.find(velocityProfile => {
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
        currentBuild = build;
        currentPath = filePath;
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

  // Actually draw
  canvasCtx.fillStyle = 'white';
  canvasCtx.lineWidth = 0.25;
  const THUMBNAIL_SIZE = 50;
  canvasCtx.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  canvasCtx.beginPath();
  const segments = getContoursFromBuild(build);
  if (segments.length) {
    const x1 = percentage(bbox.minX, bbox.maxX, segments[0].x1) * THUMBNAIL_SIZE; // Need to essentially convert from IRL coords to Canvas coords
    const y1 = percentage(bbox.minY, bbox.maxY, segments[0].y1) * THUMBNAIL_SIZE;
    canvasCtx.moveTo(x1, y1);
    segments.forEach(segment => {
      const x2 = percentage(bbox.minX, bbox.maxX, segment.x2) * THUMBNAIL_SIZE;
      const y2 = percentage(bbox.minY, bbox.maxY, segment.y2) * THUMBNAIL_SIZE;
      canvasCtx.lineTo(x2, y2);
    });
    canvasCtx.stroke();
  }

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
  for (const segment in getSegmentsFromBuild(build)) {
    console.log('segment: ', segment);
    bbox.minX = Math.min(bbox.minX, segment.x1, segment.x2);
    bbox.minY = Math.min(bbox.minY, segment.y1, segment.y2);
    bbox.maxX = Math.max(bbox.maxX, segment.x1, segment.x2);
    bbox.maxY = Math.max(bbox.maxY, segment.y1, segment.y2);
  }
  bbox.minX = (bbox.minX - padding).toFixed(4); // Apply padding and truncate huge precision, which viewBox has issues with
  bbox.minY = (bbox.minY - padding).toFixed(4);
  bbox.maxX = (bbox.maxX + padding).toFixed(4);
  bbox.maxY = (bbox.maxY + padding).toFixed(4);
  console.log('Bounding box:', bbox);
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
  const text = ExportXML(currentBuild);
  fs.writeFile(currentPath, text, err => {
    if (err) throw new Error('Error writing file: ' + err);
    alert('Successfully saved changes to layer!');
  });
}
document.getElementById('save').addEventListener('click', SaveChangesToLayer);

// Get click coordinates on svg
const svg = document.getElementById('mainsvg');
const { getClosestSegment, getHTMLSegmentFromNumber, toggleSegment, RenderSegmentInfo } = require('./vectorquerying.js');
const pt = svg.createSVGPoint(); // Created once for document
svg.addEventListener('click', e => {
  pt.x = e.clientX;
  pt.y = e.clientY;

  // Get cursor position
  const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
  // console.log("Cursor Pos: (" + cursorpt.x + ", " + cursorpt.y + ")");

  // Get closest segment to that one
  const closestSegment = getClosestSegment(cursorpt.x, cursorpt.y, currentBuild);
  RenderSegmentInfo(closestSegment, currentBuild);

  // Backtrack from the same JSON backend to the HTML frontend segment
  const closestSegmentHTML = getHTMLSegmentFromNumber(closestSegment.number);

  // Toggle it!
  toggleSegment(closestSegmentHTML);
  // console.log("Toggled closest segment!");
});

require('./panning.js');

svg.onwheel = e => {
  e.preventDefault();

  // Get cursor pos relative to svg coords
  pt.x = e.clientX;
  pt.y = e.clientY;
  const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());

  // Get current viewbox
  let box = svg.getAttribute('viewBox');
  box = box.split(/\s+|,/);
  box[0] = parseFloat(box[0]);
  box[1] = parseFloat(box[1]);
  box[2] = parseFloat(box[2]);
  box[3] = parseFloat(box[3]);

  const width = box[2];
  const height = box[3];
  const previousX = box[0] + width / 2;
  const previousY = box[1] + height / 2;

  // Zoom in
  let newWidth, newHeight;
  let newX, newY;
  if (ScrollDirectionIsUp(e)) {
    newWidth = width * 0.9;
    newHeight = height * 0.9;

    // Weighted average; move a little towards the new point, but not by much
    newX = (-newWidth / 2 + 0.9 * previousX + 0.1 * cursorpt.x).toFixed(2);
    newY = (-newHeight / 2 + 0.9 * previousY + 0.1 * cursorpt.y).toFixed(2);
  } else {
    newWidth = width * 1.1;
    newHeight = height * 1.1;

    // Don't move the origin when zooming out; it just feels unnatural
    newX = (-newWidth / 2 + previousX).toFixed(2);
    newY = (-newHeight / 2 + previousY).toFixed(2);
  }

  // TODO: Stroke width should be adjusted based on how far we're zoomed in
  // My brief attempts resulted in way too many iterations and lookups to be efficient
  // Best approach is probably to store each segment type (contour, hatch, jump) in a separate array which lets us map super quickly to them

  const viewboxStr = '' + newX + ' ' + newY + ' ' + newWidth + ' ' + newHeight;
  svg.setAttribute('viewBox', viewboxStr); // Basically lets us define our bounds
};

function ScrollDirectionIsUp (event) {
  if (event.wheelDelta) {
    return event.wheelDelta > 0;
  }
  return event.deltaY < 0;
}

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
// Leave this at the end; messes with the order of defining things otherwise
let currentBuild = null;
let currentPath = null;
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
  currentBuild = build;
  console.log('Current Build: ', currentBuild);
  currentPath = path.join(paths.GetUIPath(), 'xml', firstFile);
  drawBuild(build, 'mainsvg', true);

  // Set this to false to remove the load step; useful for quick debugging stuff
  const DRAW_THUMBNAILS = true;
  if (DRAW_THUMBNAILS) {
    populateLayerList();
  } else {
    toggleLoading();
  }
}
