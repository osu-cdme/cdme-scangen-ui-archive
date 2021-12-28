// Given a click location on the svg, return the closest segment to that point
function getClosestSegment(x, y, build) {
    let closestSegment = null;
    let closestDistance = Infinity;
    build.trajectories.forEach((trajectory) => {
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.path.segments.forEach((segment) => {
            // It's complicated and intensive to sample every point, so we just get the endpoints and the midpoint
            const d1 = Math.sqrt(Math.pow(segment.x1 - x, 2) + Math.pow(segment.y1 - y, 2));
            const d2 = Math.sqrt(Math.pow(segment.x2 - x, 2) + Math.pow(segment.y2 - y, 2));
            let midX = (segment.x1 + segment.x2) / 2,
                midY = (segment.y1 + segment.y2) / 2;
            const d3 = Math.sqrt(Math.pow(midX - x, 2) + Math.pow(midY - y, 2));
            if (d1 < closestDistance || d2 < closestDistance || d3 < closestDistance) {
                closestSegment = segment;
                closestDistance = Math.min(d1, d2, d3);
            }
        });
    });
    return closestSegment;
}

function getHTMLSegmentFromNumber(number) {
    return document.getElementById(`segment-${number}`);
}

// When the user clicks on a segment, update the segment's style
function toggleSegment(segment) {
    wipeSelectedSegments();
    segment.classList.toggle("selected");
}

function wipeSelectedSegments() {
    const segments = document.querySelectorAll(".selected");
    segments.forEach((segment) => {
        segment.classList.remove("selected");
    });
}

exports.getClosestSegment = getClosestSegment;
exports.getHTMLSegmentFromNumber = getHTMLSegmentFromNumber;
exports.toggleSegment = toggleSegment;
