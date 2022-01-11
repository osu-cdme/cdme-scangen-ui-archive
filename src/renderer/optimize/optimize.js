const path = require('path');
const paths = require('../paths');
const fs = require('fs');
const deepcopy = require('deepcopy');
const { SegmentStyle } = require('alsam-xml');
const { getBuildFromFilePath } = require('../common.js');

// Returns a point every .1mm of the segment
// Old way of doing this was just to sample the two endpoints and the midpoint, but that ends up being bad for large segments
// So long story short, consistent sampling is better
function PointsAlongSegment (segment) {
  // Distance formula with x1, y1, x2, y2
  const length = Math.sqrt(Math.pow(segment.x2 - segment.x1, 2) + Math.pow(segment.y2 - segment.y1, 2));

  const start = [segment.x1, segment.y1];
  const end = [segment.x2, segment.y2];

  const numSteps = length / 0.1; // 0.1mm
  const dx = (segment.x2 - segment.x1) / numSteps;
  const dy = (segment.y2 - segment.y1) / numSteps;
  const current = start;

  const points = [];
  while (current.x < end && current.y < end) {
    points.push(current);
    current.x += dx;
    current.y += dy;
  }
  points.push(current);
  return points;
}

function distance (p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

// For speed probably best to do random numbers; for debugging probably best to do sequential numbers
function FindUnusedSegmentStyleID (build) {
  let segmentStyleID = 'optimization-' + Math.floor(Math.random() * 1000000);
  while (build.segmentStyles.find((segmentStyle) => segmentStyle.id === segmentStyleID)) {
    segmentStyleID = 'optimization-' + Math.floor(Math.random() * 1000000);
  }
  return segmentStyleID;
}

// Given a list of high temperatures, adjusts all nearby segments such that they have 10% less power
function AdjustPower (build, highTemps, lowTemps) {
  build.trajectories.forEach((trajectory) => {
    if (trajectory.paths === []) return;
    trajectory.paths.forEach((path) => {
      if (path.segments.length === 0) return; // Likely never true, but worth checking
      path.segments.forEach((segment) => {
        // If there's no travelers, no point in even adjusting
        const segmentStyle = build.segmentStyles.find((segmentStyle) => segmentStyle.id === segment.segStyle);
        if (segmentStyle.travelers === []) return;

        const points = PointsAlongSegment(segment);
        let isCloseToHighHeat = false;
        points.forEach((point) => {
          highTemps.forEach((highTemp) => {
            if (distance(point, highTemp) < 0.5) {
              isCloseToHighHeat = true;
            }
          });
        });

        // If within range of a high temp point, give a new segment style with 10% less power than current
        let isCloseToLowHeat = false;
        points.forEach((point) => {
          lowTemps.forEach((lowTemp) => {
            if (distance(point, lowTemp) < 0.5) {
              isCloseToLowHeat = true;
            }
          });
        });

        // High heat => Lower the power on this segment
        if (isCloseToHighHeat && !isCloseToLowHeat) {
          const modifiedSegStyle = new SegmentStyle({
            id: FindUnusedSegmentStyleID(build),
            velocityProfileID: segmentStyle.velocityProfileID,
            laserMode: segmentStyle.laserMode,
            travelers: deepcopy(segmentStyle.travelers) // Deep copy to ensure we are taking values rather than just creating aliases/references
          });
          modifiedSegStyle.travelers.forEach((traveler) => {
            traveler.power = traveler.power * 0.9; // We only want to correct a little bit, as it'll gradually correct towards optimal thermal distribution regardless
          });
          build.segmentStyles.push(modifiedSegStyle);
        }

        // Low heat => Heighten the power on this segment
        if (isCloseToLowHeat && !isCloseToHighHeat) {
          const modifiedSegStyle = new SegmentStyle({
            id: FindUnusedSegmentStyleID(build),
            velocityProfileID: segmentStyle.velocityProfileID,
            laserMode: segmentStyle.laserMode,
            travelers: deepcopy(segmentStyle.travelers) // Deep copy to ensure we are taking values rather than just creating aliases/references
          });
          modifiedSegStyle.travelers.forEach((traveler) => {
            traveler.power = traveler.power * 1.1; // We only want to correct a little bit, as it'll gradually correct towards optimal thermal distribution regardless
          });
          build.segmentStyles.push(modifiedSegStyle);
        }
      });
    });
  });
}

main();
async function main () {
  // If xml directory doesn't exist, create it
  if (!fs.existsSync(path.join(paths.GetUIPath(), 'xml'))) {
    fs.mkdirSync(path.join(paths.GetUIPath(), 'xml'));
  }

  const files = fs.readdirSync(path.join(paths.GetUIPath(), 'xml'));
  if (files.length === 0) {
    alert("No scan files found! Generate them first via the 'Generate Vectors' tab on the left.");
    return;
  }

  // Get 'Build' object
  const firstFile = files[0];
  const build = await getBuildFromFilePath(path.join(paths.GetUIPath(), 'xml', firstFile));

  // Adjust vectors based on passed-in heat distribution problem points
  AdjustPower(build, [[0, 0]], []);
}
