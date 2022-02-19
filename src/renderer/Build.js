// Contains all the functionality for working with the Build class
function getSegmentsFromBuild(build) {
    const segments = [];
    for (const trajectory of build.trajectories) {
        if (trajectory.paths === []) return;
        for (const path of trajectory.paths) {
            if (path.length === 0) return;
            for (const segment of path.segments) {
                segments.push(segment);
            }
        }
    }
    return segments;
}

const { LoadXML } = require("alsam-xml");
async function getBuildFromLayerNum(layerNum) {
    // If we have a build cached, simply load that object and assume it already has every field necessary
    if (fs.existsSync(path.join(paths.GetUIPath(), "xml", `${layerNum}.json`))) {
        const build = JSON.parse(fs.readFileSync(path.join(paths.GetUIPath(), "xml", `${layerNum}.json`), "utf8"));
        return build;
    }

    // Otherwise, load from the .XML file
    const response = await fetch(path.join(paths.GetUIPath(), "xml", `${layerNum}.xml`));
    const text = await response.text();
    const build = LoadXML(text);

    // 1. Calculate minimum and maximum traveler powers, which simplifies thermal drawing
    build.powerMin = 99999999;
    build.powerMax = -99999999;
    for (const segStyle of build.segmentStyles) {
        if (segStyle.travelers.length) {
            for (const traveler of segStyle.travelers) {
                build.powerMin = Math.min(build.powerMin, traveler.power);
                build.powerMax = Math.max(build.powerMax, traveler.power);
            }
        }
    }

    // 2. Add a segment type to each segment from { "hatch", "contour", "jump" }, which simplifies drawing
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

    // 3. Create lists of Segments, Hatches, Contours, Segments so we don't have to do a full traversal/filter kinda thing each time. File size and memory are worth the speed-up for us, especially when it comes to things like clicking to find the nearest segment, which we want to be really fast.
    // Would technically be O(n) rather than O(3n) if we just did one iteration rather than filter(), but this is more readable and less error-prone.
    build.segments = getSegmentsFromBuild(build);
    build.hatches = build.segments.filter((seg) => seg.type === "hatch");
    build.contours = build.segments.filter((seg) => seg.type === "contour");
    build.jumps = build.segments.filter((seg) => seg.type === "jump");

    // 4. Add numbering into our data structure, which lets us do lookups to match HTML segments to data structure segments
    let num = 0;
    for (const segment of build.segments) {
        segment.number = num;
        num++;
    }

    // 5. Add an "originalSegStyle" field that is useful when vector querying changes the id for a given segment to an invalid ID and they click away, so we have to roll back
    for (const segment of build.segments) {
        segment.originalSegStyle = segment.segStyle;
    }

    console.log("Build at end of function: ", build);

    return build;
}
exports.getBuildFromLayerNum = getBuildFromLayerNum;

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

function getBuildPathFromLayerNum(layerNum) {
    return path.join(paths.GetUIPath(), "xml", `${layerNum}.xml`);
}
exports.getBuildPathFromLayerNum = getBuildPathFromLayerNum;

let currentBuild = null;
function setCurrentBuild(build) {
    console.log("Setting currentBuild to ", build);
    currentBuild = build;
}
function getCurrentBuild() {
    return currentBuild;
}
exports.getCurrentBuild = getCurrentBuild;
exports.setCurrentBuild = setCurrentBuild;

function getLayerFromFilePath(filePath) {
    return parseInt(filePath.match(/\d+.xml/)[0].match(/\d+/)[0]);
}
exports.getLayerFromFilePath = getLayerFromFilePath;
