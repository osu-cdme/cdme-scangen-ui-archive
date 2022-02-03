// Primarily-segment-related functionality
// Given a point, essentially continually narrows down segments in question until it finds the closest one
// Goal: Much more efficient than searching at like a ~.1mm interval along every single one on the layer
const { getCurrentBuild, getSegmentsFromBuild } = require("./Build");
function getClosestSegment(point) {
    // closeSegments = Segments before we filter them using the current interval
    // closerSegments = Segments AFTER we filter them using the current interval
    let closeSegments = new Set(getSegmentsFromBuild(getCurrentBuild()));
    let closerSegments = new Set();

    // Interval = Distance we sample each point at
    let interval = 5;

    // Samples all segments at INTERVAL = 5, narrowing down to only segments having at least one sampled point within 5*2=10mm
    // Then, we sample all segments at INTERVAL = 2.5, narrowing down to only segments having at least one sampled point within 2.5*2=5mm
    // This keeps going onward until we've narrowed it down to only one close segment
    while (closeSegments.length > 1) {
        for (const segment of closeSegments) {
            for (const subpoint of getPointsOfSegment(segment, interval)) {
                if (Math.pow(subpoint.x - point.x, 2) + Math.pow(subpoint.y - point.y, 2) < Math.pow(interval, 2)) {
                    closerSegments.add(segment);
                    break; // Break out of the subpoint loop, moving onto next segment
                }
            }
        }
        closeSegments = closerSegments; // Just copies the reference, which is fine seeing as we reinitialize closerSegments immediately afterward
        closerSegments = new Set();

        // TODO: No conceptual "best" ideal number scaling factor that I can think of, so I can/should do some benchmarking to see what generally results in best performance
        // Dividing by lower number means less computation per round but we filter fewer segments out each round
        // Dividnig by higher number means more computation per round but we filter more segments out each round
        interval /= 1.5;
    }

    // closeSegments only has one segment at this point
    return closeSegments.values().next().value;
}
exports.getClosestSegment = getClosestSegment;

// Generator which returns INTERVAL spaced points along a segment
// Guaranteed to return at least segment.x1 and segment.x2
function* getPointsOfSegment(segment, INTERVAL) {
    const length = Math.sqrt(Math.pow(segment.x2 - segment.x1, 2) + Math.pow(segment.y2 - segment.y1, 2));
    let i;
    for (i = 0; i < length; i += INTERVAL) {
        yield {
            x: segment.x1 + (i * (segment.x2 - segment.x1)) / length,
            y: segment.y1 + (i * (segment.y2 - segment.y1)) / length,
        };
    }

    yield {
        x: segment.x2,
        y: segment.y2,
    };
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
