// Generator which returns 'interval' spaced *points* along a segment
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

// Generator which returns 'interval' spaced *segments* along a segment

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
