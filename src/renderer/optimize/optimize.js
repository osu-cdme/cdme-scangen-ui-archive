const path = require("path");
const paths = require("../paths");
const fs = require("fs");
const deepcopy = require("deepcopy");
const { SegmentStyle } = require("alsam-xml");
const {
    getSegmentsFromBuild,
    getPointsOfSegment,
    getBuildFromFilePath,
    getSubsegmentsOfSegment,
    renumberSegments,
    getLayerFromFilePath,
} = require("../common.js");

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

// 'heat' is assumed to be an array of (x, y, heat) tuples, as that's apparently roughly what we'll get from the thermal model
const TOO_HIGH_TEMP = 300;
const TOO_LOW_TEMP = 200;
function AdjustPower(build, heat) {
    // Get a list of points that have a thermal issue
    const highTempPoints = new Set();
    const lowTempPoints = new Set();
    for (const point of heat) {
        if (point[2] > TOO_HIGH_TEMP) {
            highTempPoints.push(point);
        } else if (point[2] < TOO_LOW_TEMP) {
            lowTempPoints.push(point);
        }
    }

    // Iterate through segments and check if they're too close to any of the thermal issue points
    const segmentIDsToPurge = new Set();
    for (const segment of getSegmentsFromBuild(build)) {
        // If there's no travelers, no point in even adjusting
        const segmentStyle = build.segmentStyles.find((segmentStyle) => segmentStyle.id === segment.segStyle);
        if (segmentStyle.travelers === []) continue;

        // Test whether this segment is near thermal problem points
        const SAMPLING_INTERVAL = 0.1; // mm
        const MAX_DISTANCE = 0.5; // mm
        const isCloseToHighHeat = false;
        const isCloseToLowHeat = false;

        // Going in 1mm intervals, split the segment into sections that are thermally okay, too high, and too low
        let tooLow = new Set();
        let tooHigh = new Set();
        let okay = new Set();
        let changingThisSegment = false;
        for (const subsegment of getSubsegmentsOfSegment(segment, SAMPLING_INTERVAL)) {
            for (const point in highTempPoints) {
                if (
                    distance({ x: subsegment.x1, y: subsegment.y1 }, point) < MAX_DISTANCE ||
                    distance({ x: subsegment.x2, y: subsegment.y2 }, point) < MAX_DISTANCE
                ) {
                    changingThisSegment = true;
                    tooHigh.add(subsegment);
                    break;
                }
            }
            for (const point in lowTempPoints) {
                if (
                    distance({ x: subsegment.x1, y: subsegment.y1 }, point) < MAX_DISTANCE ||
                    distance({ x: subsegment.x2, y: subsegment.y2 }, point) < MAX_DISTANCE
                ) {
                    changingThisSegment = true;
                    tooLow.add(subsegment);
                    break;
                }
            }
        }

        // If nothing in this segment was too close to a thermal issue point, don't bother with all the splitting and 'Build' object adjustment
        if (!changingThisSegment) continue;

        /*
    If we got here, at least one segment had a thermal issue, so we're going to do the following:
    1. Convert the little subsegments into combined segments in { low, high, okay } thermal categories
    2. Append the new segments to the build with a traveler modified from the original according to power
    3. Remove the original segment from the build
    */

        // Collapse segments into too high, too low, okay, treating segments that are both too high and too low as thermally okay
        function xor(a, b) {
            return (a || b) && !(a && b);
        }
        for (const subsegment of getSubsegmentsOfSegment(segment, SAMPLING_INTERVAL)) {
            if (xor(isCloseToHighHeat, isCloseToLowHeat)) {
                if (isCloseToHighHeat) tooHigh.add(subsegment);
                else tooLow.add(subsegment);
            } else {
                okay.add(subsegment);
            }
        }

        // Combine subsegments back together if they have ends touching, returning a new Set of segments where those touching are combined
        function combineSegments(segments) {
            const newSegments = new Set();
            for (const subsegment of segments) {
                for (const segment in newSegments) {
                    if (subsegment.x1 === segment.x1 && subsegment.y1 === segment.y1) {
                        segment.x1 = subsegment.x2;
                        segment.y1 = subsegment.y2;
                    } else if (subsegment.x2 === segment.x2 && subsegment.y2 === segment.y2) {
                        segment.x2 = subsegment.x1;
                        segment.y2 = subsegment.y1;
                    } else {
                        newSegments.add(subsegment);
                    }
                }
            }
        }
        okay = combineSegments(okay);
        tooLow = combineSegments(tooLow);
        tooHigh = combineSegments(tooHigh);

        // Add the segments back into the build, with power adjusted relative to what they were originally
        function segmentFromSubsegment(subsegment) {
            return {
                x1: subsegment.x1,
                y1: subsegment.y1,
                x2: subsegment.x2,
                y2: subsegment.y2,
                segStyle: segment.segStyle,
            };
        }

        // Actually adjust the power
        for (const subsegment of okay) {
            const seg = segmentFromSubsegment(subsegment);
            seg.travelers = segmentStyle.travelers;
        }
        for (const subsegment of tooLow) {
            const seg = segmentFromSubsegment(subsegment);
            seg.travelers = deepcopy(segmentStyle.travelers);
            for (const traveler of seg.travelers) {
                traveler.power = traveler.power * 1.1;
            }
        }
        for (const subsegment of tooHigh) {
            const seg = segmentFromSubsegment(subsegment);
            seg.travelers = deepcopy(segmentStyle.travelers);
            for (const traveler of seg.travelers) {
                traveler.power = traveler.power * 1.1;
            }
        }

        // High heat => Lower the power on this segment
        if (isCloseToHighHeat && !isCloseToLowHeat) {
            const modifiedSegStyle = new SegmentStyle({
                id: FindUnusedSegmentStyleID(build),
                velocityProfileID: segmentStyle.velocityProfileID,
                laserMode: segmentStyle.laserMode,
                travelers: deepcopy(segmentStyle.travelers), // Deep copy to ensure we are taking values rather than just creating aliases/references
            });
            modifiedSegStyle.travelers.forEach((traveler) => {
                traveler.power *= 0.9; // We only want to correct a little bit, as it'll gradually correct towards optimal thermal distribution regardless
            });
            build.segmentStyles.push(modifiedSegStyle);
        }

        // Low heat => Heighten the power on this segment
        if (isCloseToLowHeat && !isCloseToHighHeat) {
            const modifiedSegStyle = new SegmentStyle({
                id: FindUnusedSegmentStyleID(build),
                velocityProfileID: segmentStyle.velocityProfileID,
                laserMode: segmentStyle.laserMode,
                travelers: deepcopy(segmentStyle.travelers), // Deep copy to ensure we are taking values rather than just creating aliases/references
            });
            modifiedSegStyle.travelers.forEach((traveler) => {
                traveler.power *= 1.1; // We only want to correct a little bit, as it'll gradually correct towards optimal thermal distribution regardless
            });
            build.segmentStyles.push(modifiedSegStyle);
        }
    }
}

main();
async function main() {
    // If xml directory doesn't exist, create it
    if (!fs.existsSync(path.join(paths.GetUIPath(), "xml"))) {
        fs.mkdirSync(path.join(paths.GetUIPath(), "xml"));
    }

    const files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
    if (files.length === 0) {
        alert("No scan files found! Generate them first via the 'Generate Vectors' tab on the left.");
        return;
    }

    // Get 'Build' object
    const firstFile = files[0];
    const layerNum = getLayerFromFilePath(firstFile);
    const build = await getBuildFromFilePath(layerNum);

    // Adjust vectors based on passed-in heat distribution problem points
    AdjustPower(build, [[0, 0]], []);
}
