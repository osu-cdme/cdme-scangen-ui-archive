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
async function getBuildFromFilePath(layerNum) {
    // The caller always wipes previous builds before calling this, so we can safely check for and
    // use a cached build if the corresponding file exists
    if (fs.existsSync(path.join(paths.GetUIPath(), "xml", `${layerNum}.json`))) {
        const build = JSON.parse(fs.readFileSync(path.join(paths.GetUIPath(), "xml", `${layerNum}.json`), "utf8"));
        segmentStyles = new SegmentStyles(false, build); // Essentially just aliasing these, which is 'good enough'
        velocityProfiles = new VelocityProfiles(false, build);
        return build;
    }

    const response = await fetch(path.join(paths.GetUIPath(), "xml", `${layerNum}.xml`));
    const text = await response.text();
    const build = LoadXML(text);
    segmentStyles = new SegmentStyles(false, build);
    velocityProfiles = new VelocityProfiles(false, build);
    build.segmentStyles = segmentStyles.Get();
    build.velocityProfiles = velocityProfiles.Get();

    console.log("segmentStyles: ", build.segmentStyles);
    console.log("velocityProfiles: ", build.velocityProfiles);

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
}
exports.getBuildFromFilePath = getBuildFromFilePath;

exports.renumberSegments = function renumberSegments() {
    let num = 0;
    for (const segment of getSegmentsFromBuild(getCurrentPath())) {
        segment.number = num;
        num++;
    }
};

function getBuildPathFromLayerNum(layerNum) {
    return path.join(paths.GetUIPath(), "xml", `${layerNum}.xml`);
}
exports.getBuildFromFilePath = getBuildFromFilePath;

function wipe() {
    const files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
    for (const file of files) {
        fs.unlinkSync(path.join(paths.GetUIPath(), "xml", file));
    }
}
exports.wipe = wipe;

function percentage(a, b, c) {
    return (c - a) / (b - a);
}
function GetSvgBoundingBox(build, padding) {
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

// Saves a .svg file corresponding to each given layer to file at folder 'xml/_X.svg' where X is the layer number
// Source for much of the code is https://stackoverflow.com/a/23218877/6402548
async function cacheThumbnails() {
    return new Promise(async (resolve, reject) => {
        // Read all files in 'xml' folder
        const progressText = document.getElementById("progressText");
        let numDone = 0;
        const glob = require("glob");
        const files = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
        for (const file of files) {
            // Generate segment with all our things
            const layerNum = getLayerFromFilePath(file);
            const build = await getBuildFromFilePath(layerNum);

            const canvas = document.createElement("canvas");
            const THUMBNAIL_SIZE = 30;
            canvas.width = THUMBNAIL_SIZE;
            canvas.height = THUMBNAIL_SIZE;

            const canvasCtx = canvas.getContext("2d");

            // Calculate bounds
            const PADDING = 2;
            const bbox = GetSvgBoundingBox(build, PADDING);

            // Canvas setup
            canvasCtx.fillStyle = "white";
            canvasCtx.lineWidth = 0.25;
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

            // Write canvas to png file
            const url = canvas.toDataURL("image/png", 1.0);
            const base64Data = url.replace(/^data:image\/png;base64,/, "");
            fs.writeFile(path.join(paths.GetUIPath(), "xml", `${layerNum}.png`), base64Data, "base64", function (err) {
                if (err) {
                    console.log(err);
                }
            });

            numDone++;
            if (progressText !== null) {
                document.getElementById("progressText").textContent = `(Step 4 of 4) Generating Thumbnails (${numDone} / ${files.length})`;
                document.getElementById("done").style.width = (numDone / files.length) * 100 + "%";
            }
        }
        resolve();
    });
}
exports.cacheThumbnails = cacheThumbnails;

function getLayerFromFilePath(filePath) {
    return parseInt(filePath.match(/\d+.xml/)[0].match(/\d+/)[0]);
}
exports.getLayerFromFilePath = getLayerFromFilePath;

// Save build objects to file
const glob = require("glob");
async function cacheBuilds() {
    return new Promise(async (resolve, reject) => {
        const progressText = document.getElementById("progressText");
        let numDone = 0;

        const files = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
        console.log("files: ", files);
        for (const file of files) {
            let layerNum = getLayerFromFilePath(file);
            const build = await getBuildFromFilePath(layerNum);
            fs.writeFileSync(path.join(paths.GetUIPath(), "xml", build.header.layerNum + ".json"), JSON.stringify(build));
            numDone++;
            if (progressText !== null) {
                document.getElementById("progressText").textContent = `(Step 3 of 4) Generating 'Build' Objects (${numDone} / ${files.length})`;
                document.getElementById("done").style.width = (numDone / files.length) * 100 + "%";
            }
        }
        resolve();
    });
}
exports.cacheBuilds = cacheBuilds;

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
