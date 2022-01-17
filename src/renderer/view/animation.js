const { d3 } = require('../common');
const { outputSegment, drawBuild } = require('./drawing');
const { getSegmentsFromBuild, getCurrentBuild, getVelocityOfSegment } = require('../common');

let animating = false;
const queuedSegments = [];

// Click Listeners
d3.select('start').on('click', function () {
  if (animating) {
    d3.select('start').text('Start');
    stopAnimation();
  } else {
    d3.select('start').text('Stop');
    startAnimation();
  }
});
d3.select('pause').on('click', function () {
  if (animating) pauseAnimation();
  else unpauseAnimation();
});
d3.select('animationSpeed').on('change', function () {
  pauseAnimation(); // Simpler way to trigger a requeue of the timing on all the segments
  unpauseAnimation();
});

// Click Handler Functions
function startAnimation () {
  const speed = parseFloat(d3.select('speed').property('value'));
  animating = true;
  d3.select('animate').text('Stop');
  let currentTime = 0;
  for (const segment of getSegmentsFromBuild(getCurrentBuild())) {
    segment.animated = false;
    const velocity = getVelocityOfSegment(segment);
    currentTime += ((300 / velocity) * 100) / speed; // Add time; 100 is completely a guess, but is intended as a "middling" velocity that's a medium-speed animation
    queuedSegments.push(setTimeout(animateSegment, currentTime, segment));
  }
}
function stopAnimation () {
  animating = false;
  d3.select('animate').text('Start');
  for (const timeout of queuedSegments) {
    clearTimeout(timeout);
  }
  queuedSegments.length = 0; // Clear the array
  d3.select('#mainsvg')
    .selectAll('*')
    .remove();
  drawBuild(getCurrentBuild());
}

// We use a wrapper function for the animation code, as it's an architectural decision to not care at all about animation from outputSegment
function animateSegment (segment) {
  segment.animated = true;
  outputSegment(segment, 'mainsvg');
}

function pauseAnimation () {
  animating = false;
  d3.select('pause').text('Unpause');
  for (const timeout of queuedSegments) {
    clearTimeout(timeout);
  }
  queuedSegments.length = 0; // Clear the array
}
function unpauseAnimation () {
  animating = true;
  d3.select('pause').text('Pause');
  let currentTime = 0;
  const speed = parseFloat(d3.select('speed').property('value'));
  for (const segment of getSegmentsFromBuild(getCurrentBuild())) {
    if (segment.animated) continue; // Skip if already drawn on the screen
    const velocity = getVelocityOfSegment(segment);
    currentTime += ((300 / velocity) * 100) / speed; // Add time; 100 is completely a guess, but is intended as a "middling" velocity that's a medium-speed animation
    queuedSegments.push(setTimeout(animateSegment, currentTime, segment));
  }
}
