const path = require("path");
const paths = require("../paths");
const fs = require("fs");
const deepcopy = require("deepcopy");

let { LoadXML } = require("alsam-xml");
async function getBuildFromFilePath(filePath) {
    const response = await fetch(filePath);
    const text = await response.text();
    const build = LoadXML(text);

    // Add numbering into our data structure, which lets us do lookups to match HTML segments to data structure segments
    build.trajectories.forEach((trajectory) => {
        if (trajectory.paths === []) return;
        trajectory.paths.forEach((path) => {
            if (path.length === 0) return;
            path.segments.forEach((segment) => {
                segment.number = currentSegmentCount;
                currentSegmentCount++;
            });
        });
    });
    return build;
}

// Returns a point every .1mm of the segment
// Old way of doing this was just to sample the two endpoints and the midpoint, but that ends up being bad for large segments
// So long story short, consistent sampling is better
function PointsAlongSegment(segment) {
    // Distance formula with x1, y1, x2, y2
    let length = Math.sqrt(Math.pow(segment.x2 - segment.x1, 2) + Math.pow(segment.y2 - segment.y1, 2));

    let start = [segment.x1, segment.y1];
    let end = [segment.x2, segment.y2];

    let numSteps = length / 0.1; // 0.1mm
    let dx = (segment.x2 - segment.x1) / numSteps;
    let dy = (segment.y2 - segment.y1) / numSteps;
    let current = start;

    let points = [];
    while (current < end) {
        points.push(current);
        current.x += dx;
        current.y += dy;
    }
    points.push([segment.x2, segment.y2]);
    return points;
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

// For speed probably best to do random numbers; for debugging probably best to do sequential numbers
function FindUnusedSegmentStyleID(build) {
    let segmentStyleID = "optimization-" + Math.floor(Math.random() * 1000000);
    while (build.segmentStyles.find((segmentStyle) => segmentStyle.id === segmentStyleID)) {
        segmentStyleID = "optimization-" + Math.floor(Math.random() * 1000000);
    }
    return segmentStyleID;
}

// Given a list of high temperatures, adjusts all nearby segments such that they have 10% less power
function AdjustPower(build, highTemps, lowTemps) {
    build.trajectories.forEach((trajectory) => {
        if (trajectory.paths === []) return;
        trajectory.paths.forEach((path) => {
            if (path.segments.length === 0) return; // Likely never true, but worth checking
            path.segments.forEach((segment) => {
                // List of .1mm evenly spaced points along segment
                let points = PointsAlongSegment(segment);
                let isCloseToHighHeat = false;
                points.forEach((point) => {
                    highTemps.forEach((highTemp) => {
                        if (distance(point, highTemp) < 0.2) {
                            isCloseToHighHeat = true;
                        }
                    });
                });

                // If within range of a high temp point, give a new segment style with 10% less power than current
                let isCloseToLowHeat = false;
                points.forEach((point) => {
                    lowTemps.forEach((lowTemp) => {
                        if (distance(point, lowTemp) < 0.2) {
                            isCloseToLowHeat = true;
                        }
                    });
                });

                // High heat => Lower the power on this segment
                if (isCloseToHighHeat && !isCloseToLowHeat) {
                    let segmentStyle = build.segmentStyles.find((segmentStyle) => segmentStyle.id === segment.segStyle);
                    let modifiedTraveler = build.segmentStyles.push({
                        id: FindUnusedSegmentStyleID(build),
                        velocityProfileID: segmentStyle.velocityProfileID,
                        laserMode: segmentStyle.laserMode,
                        travelers: deepcopy(segmentStyle.travelers), // Deep copy to ensure we are taking values rather than just creating aliases/references
                    });
                    if (modifiedTraveler.travelers.length) {
                        modifiedTraveler.travelers.forEach((traveler) => {
                            traveler.power = traveler.power * 0.9; // We only want to correct a little bit, as it'll gradually correct towards optimal thermal distribution regardless
                        });
                    }
                }

                // Low heat => Heighten the power on this segment
                if (isCloseToLowHeat && !isCloseToHighHeat) {
                    let segmentStyle = build.segmentStyles.find((segmentStyle) => segmentStyle.id === segment.segStyle);
                    build.segmentStyles.push({
                        id: FindUnusedSegmentStyleID(build),
                        velocityProfileID: segmentStyle.velocityProfileID,
                        laserMode: segmentStyle.laserMode,
                        travelers: deepcopy(segmentStyle.travelers), // Deep copy to ensure we are taking values rather than just creating aliases/references
                    });
                    if (modifiedTraveler.travelers.length) {
                        modifiedTraveler.travelers.forEach((traveler) => {
                            traveler.power = traveler.power * 1.1;
                        });
                    }
                }
            });
        });
    });
}

main();
function main() {
    // If xml directory doesn't exist, create it
    if (!fs.existsSync(path.join(paths.GetUIPath(), "xml"))) {
        fs.mkdirSync(path.join(paths.GetUIPath(), "xml"));
    }

    let files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
    if (files.length === 0) {
        // Send them elsewhere if no .XML files to view
        alert("No scan files found! Generate them first via the 'Generate Vectors' tab on the left.");
        return;
    }

    // Get 'Build' object
    let firstFile = files[0];
    const build = await getBuildFromFilePath(path.join(paths.GetUIPath(), "xml", firstFile));
    currentBuild = build;
    console.log("Current Build: ", currentBuild);
    currentPath = path.join(paths.GetUIPath(), "xml", firstFile);

    AdjustPower(build, [[0, 0]], []);
}
