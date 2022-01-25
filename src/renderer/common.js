// Frontend javascript has shared global scope; we essentially keep them as singletons here
const path = require("path");
exports.path = path;
const paths = require("./paths");
exports.paths = paths;
const d3 = require(path.join(paths.GetUIPath(), "static", "d3.min.js"));
exports.d3 = d3;
exports.fs = require("fs");

// Generator which returns segment by segment
function* getSegmentsFromBuild(build) {
    for (const trajectory of build.trajectories) {
        if (trajectory.paths === []) return;
        for (const path of trajectory.paths) {
            if (path.length === 0) return;
            for (const segment of path.segments) {
                yield segment;
            }
        }
    }
}
exports.getSegmentsFromBuild = getSegmentsFromBuild;

// Generator which returns .1mm spaced *points* along a segment
function* getPointsOfSegment(segment, interval) {
    const length = Math.sqrt(Math.pow(segment.x2 - segment.x1, 2) + Math.pow(segment.y2 - segment.y1, 2));
    for (let i = 0; i < length; i += interval) {
        yield {
            x: segment.x1 + (i * (segment.x2 - segment.x1)) / length,
            y: segment.y1 + (i * (segment.y2 - segment.y1)) / length,
        };
    }
}
exports.getPointsOfSegment = getPointsOfSegment;

// Generator which returns .1mm spaced *segments* along a segment
function* getSubsegmentsOfSegment(segment, interval) {
    const length = Math.sqrt(Math.pow(segment.x2 - segment.x1, 2) + Math.pow(segment.y2 - segment.y1, 2));
    let i;
    for (i = 0; i < length - interval; i += interval) {
        yield {
            x1: segment.x1 + (i * (segment.x2 - segment.x1)) / length,
            y1: segment.y1 + (i * (segment.y2 - segment.y1)) / length,
            x2: segment.x1 + ((i + interval) * (segment.x2 - segment.x1)) / length,
            y2: segment.y1 + ((i + interval) * (segment.y2 - segment.y1)) / length,
        };
    }

    // Segment from where iteration ended to the end
    yield {
        x1: segment.x1 + (i * (segment.x2 - segment.x1)) / length,
        y1: segment.y1 + (i * (segment.y2 - segment.y1)) / length,
        x2: segment.x2,
        y2: segment.y2,
    };
}
exports.getSubsegmentsOfSegment = getSubsegmentsOfSegment;

// Generator which returns only hatch segments
function* getHatchesFromBuild(build) {
    for (const segment of getSegmentsFromBuild(build)) {
        if (segment.type === "hatch") yield segment;
    }
}
exports.getHatchesFromBuild = getHatchesFromBuild;

// Generator which returns only contour segments
function* getContoursFromBuild(build) {
    for (const segment of getSegmentsFromBuild(build)) {
        if (segment.type === "contour") yield segment;
    }
}
exports.getContoursFromBuild = getContoursFromBuild;

// Generator which returns only jump segments
function* getJumpsFromBuild(build) {
    for (const segment of getSegmentsFromBuild(build)) {
        if (segment.type === "jump") yield segment;
    }
}
exports.getJumpsFromBuild = getJumpsFromBuild;

const { LoadXML } = require("alsam-xml");
const { SegmentStyles } = require("./generate/SegmentStyles");
const { VelocityProfiles } = require("./generate/VelocityProfiles");
let segmentStyles, velocityProfiles;
exports.getBuildFromFilePath = async function getBuildFromFilePath(filePath) {
    const response = await fetch(filePath);
    const text = await response.text();
    const build = LoadXML(text);
    segmentStyles = new SegmentStyles(false, build);
    velocityProfiles = new VelocityProfiles(false, build);
    build.segmentStyles = segmentStyles.Get();
    build.velocityProfiles = velocityProfiles.Get();
    console.log("Build post-load: ", build);

    // --------------------------------------------------------------------------------
    // Make some additions to the base alsam-xml.js structure, which simplifies some stuff
    // --------------------------------------------------------------------------------

    // 1. Add a segment type to each segment from { "hatch", "contour", "jump" }
    const SegmentIDType = (path, segmentStyleID) => {
        // console.log("path: ", path);
        // console.log("segmentStyleID: ", segmentStyleID);
        const segmentStyle = build.segmentStyles.find((segmentStyle) => {
            return segmentStyle.id === segmentStyleID;
        });
        if (segmentStyle === undefined) {
            console.log("Couldn't find segmentStyle with id: ", segmentStyleID);
            console.log("Associated build: ", build);
        }
        // console.log("segmentStyle: ", segmentStyle);
        if (segmentStyle.travelers.length === 0) return "jump";
        return path.type === "contour" ? "contour" : "hatch";
    };
    build.trajectories.forEach((trajectory) => {
        if (trajectory.paths === []) return;
        trajectory.paths.forEach((path) => {
            if (path.segments.length === 0) return; // Likely never true, but worth checking
            path.segments.forEach((segment) => {
                segment.type = SegmentIDType(path, segment.segStyle);
            });
        });
    });

    // 2. Add numbering into our data structure, which lets us do lookups to match HTML segments to data structure segments
    let num = 0;
    for (const segment of getSegmentsFromBuild(build)) {
        segment.number = num;
        num++;
    }
    return build;
};

exports.renumberSegments = function renumberSegments() {
    let num = 0;
    for (const segment of getSegmentsFromBuild(getCurrentPath())) {
        segment.number = num;
        num++;
    }
};

// Used to set these from other files
let currentPath = null;
function setCurrentPath(path) {
    console.log("Setting currentPath to ", path);
    currentPath = path;
}
function getCurrentPath() {
    return currentPath;
}
exports.getCurrentPath = getCurrentPath;
exports.setCurrentPath = setCurrentPath;

let currentBuild = null;
let minPower = 99999999;
let maxPower = -99999999;
function setCurrentBuild(build) {
    console.log("Setting currentBuild to ", build);
    currentBuild = build;
    for (const segmentStyle of currentBuild.segmentStyles) {
        if (segmentStyle.power > maxPower) maxPower = segmentStyle.power;
        if (segmentStyle.power < minPower) minPower = segmentStyle.power;
    }
}
function getCurrentBuild() {
    return currentBuild;
}
exports.getCurrentBuild = getCurrentBuild;
exports.setCurrentBuild = setCurrentBuild;

function getVelocityOfSegment(segment) {
    const segStyle = getCurrentBuild().segmentStyles.find((segmentStyle) => {
        return segmentStyle.id === segment.segStyle;
    });
    const velProfile = getCurrentBuild().velocityProfiles.find((velocityProfile) => {
        return (velocityProfile.id = segStyle.velocityProfileID);
    });
    if (velProfile === undefined) {
        throw new Error("Unable to find velocity profile with ID " + segStyle.velocityProfileID);
    }
    return velProfile.velocity;
}
exports.getVelocityOfSegment = getVelocityOfSegment;

function getPowerProportion(power) {
    if (maxPower === minPower) return -1; // Avoid divide by zero
    return power / (maxPower - minPower);
}
exports.getPowerProportion = getPowerProportion;
