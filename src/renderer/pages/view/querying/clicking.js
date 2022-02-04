const { getCurrentBuild } = require("../../../Build");
const { getPointsOfSegment } = require("../../../segments");

// Handles the SVG click event, which is for selecting the nearest vector
const pt = document.getElementById("mainsvg").createSVGPoint();
const svg = document.getElementById("mainsvg");

let selectedSegments = [];
let selectedSegmentsDOM = [];
svg.addEventListener("click", (e) => {
    console.log("Click event fired!");
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Search for closest segment and trigger color
    const closestSegment = getClosestSegment({ x: cursorpt.x, y: cursorpt.y });
    if (closestSegment === null) return; // Either no segments on that
    RenderSegmentInfo(closestSegment, getCurrentBuild());
    const closestSegmentHTML = getHTMLSegmentFromNumber(closestSegment.number);

    if (!e.shiftKey) {
        selectedSegments = [];
        selectedSegmentsDOM = [];
    }

    selectedSegments.push(closestSegment);
    selectedSegmentsDOM.push(closestSegmentHTML);
    refreshEnabledSegments();
});

// Primarily-segment-related functionality
// Given a point, essentially continually narrows down segments in question until it finds the closest one
// Goal: Much more efficient than searching at like a ~.1mm interval along every single one on the layer
// radius: Maximum distance at which we'll latch onto a near segment. Lets us optimize some by initially filtering out segments that are 1.5 * radius away (the theoretical max at which we should never incorrectly profile something out - .5 to a midpoint between samples and 1 to the actual point). It might be possible to just hardcode this as 1mm or something, which will make it scale well even on large parts, which is likely also okay because people will zoom in before they are selecting.
// TODO: It's likely feasible to progressively lower the interval to something more precise, but that's borderline not worth the effort
function getClosestSegment(point, radius = 1) {
    // Only search among those that are actually drawn on the screen, which is much more intuitive for users
    let segments = new Set();
    if (document.getElementById("drawHatches").checked) {
        for (const seg of getCurrentBuild().hatches) segments.add(seg);
    }
    if (document.getElementById("drawContours").checked) {
        for (const seg of getCurrentBuild().contours) segments.add(seg);
    }
    if (document.getElementById("drawJumps").checked) {
        for (const seg of getCurrentBuild().jumps) segments.add(seg);
    }
    if (segments.size === 0) return null;

    // Filter segments to only those within radius of the point
    const segmentsInRadius = new Set();
    for (const segment of segments) {
        for (const subpoint of getPointsOfSegment(segment, radius)) {
            const distance = Math.hypot(subpoint.x - point.x, subpoint.y - point.y);
            if (distance <= radius * 1.5) {
                segmentsInRadius.add(segment);
                break;
            }
        }
    }
    segments = segmentsInRadius;

    let closestSegment = null;
    let closestDistance = Infinity;
    for (const segment of segments) {
        const INTERVAL = 0.01; // mm
        for (const subpoint of getPointsOfSegment(segment, INTERVAL)) {
            const distance = Math.hypot(subpoint.x - point.x, subpoint.y - point.y);
            if (distance < closestDistance) {
                closestSegment = segment;
                closestDistance = distance;
            }
        }
    }
    return closestSegment;
}
exports.getClosestSegment = getClosestSegment;

function getHTMLSegmentFromNumber(number) {
    return document.getElementById(`segment-${number}`);
}

function refreshEnabledSegments() {
    const segments = document.querySelectorAll(".selected");
    segments.forEach((segment) => {
        segment.classList.remove("selected");
    });
    for (const segment of selectedSegmentsDOM) {
        segment.classList.add("selected");
    }
}

document.getElementById("segmentStyleID").addEventListener("change", function () {
    for (const segment of selectedSegments) {
        segment.segStyle = this.value;
    }
});

function RenderSegmentInfo(segment, build) {
    // Render Segment Information
    document.getElementById("p1").textContent = `p1: (${segment.x1}, ${segment.y1})`;
    document.getElementById("p2").textContent = `p2: (${segment.x2}, ${segment.y2})`;
    if (segment.segmentID !== null) {
        document.getElementById("segmentID").textContent = `ID: ${segment.segmentID}`;
    }

    // Render Segment Style Information
    const segmentStyle = build.segmentStyles.find((segStyle) => segStyle.id === segment.segStyle);
    if (segmentStyle === undefined) {
        alert("ERROR: Segment Style " + segment.segStyle + "not found");
        throw new Error("Segment Style " + segment.segStyle + "not found");
    }
    document.getElementById("segmentStyleID").value = `${segmentStyle.id}`;
    document.getElementById("segmentStyleID").onchange = function () {
        for (const segment in selectedSegments) {
            // Change ALL selected segments
            segment.segStyle = segment.originalSegStyle;
        }
    };
    document.getElementById("segmentStyleID").onblur = function () {
        if (!build.segmentStyles.find((segStyle) => segStyle.id === this.value)) {
            console.log("build: ", build);
            const err = new Error("Segment Style " + this.value + " not found. Rolling back to original. Please create the segment style first.");
            alert(err.message);
            for (const segment in selectedSegments) {
                // Retroact ALL selected segments
                segment.segStyle = segment.originalSegStyle;
            }
            document.getElementById("segmentStyleID").value = segment.originalSegStyle;
            throw err;
        }
    };

    document.getElementById("segmentStyleLaserMode").textContent = `Laser Mode: ${segmentStyle.laserMode}`;
    document.getElementById("travelersList").textContent = ""; // Need to clear each time we redraw, otherwise they keep getting appended
    if (segmentStyle !== undefined && segmentStyle.travelers.length !== 0) {
        for (let i = 0; i < segmentStyle.travelers.length; i++) {
            const traveler = segmentStyle.travelers[i];
            const li = document.createElement("li");
            const travelerNumber = document.createElement("h5");
            travelerNumber.textContent = `Traveler ${i + 1}`;
            const travelerID = document.createElement("p");
            travelerID.textContent = "ID: " + traveler.id;
            const travelerPower = document.createElement("p");
            travelerPower.textContent = "Power: " + traveler.power;
            const travelerSpotSize = document.createElement("p");
            travelerSpotSize.textContent = "Spot Size: " + traveler.spotSize;
            const travelerSyncDelay = document.createElement("p");
            travelerSyncDelay.textContent = "Sync Delay: " + traveler.syncDelay;
            li.appendChild(travelerNumber);
            li.appendChild(travelerID);
            li.appendChild(travelerPower);
            li.appendChild(travelerSpotSize);
            li.appendChild(travelerSyncDelay);
            if (traveler.wobble != null) {
                const travelerWobble = document.createElement("h6");
                travelerWobble.textContent = "Wobble";
                const wobbleOn = document.createElement("p");
                wobbleOn.textContent = "On: " + traveler.wobble.on;
                const wobbleFreq = document.createElement("p");
                wobbleFreq.textContent = "Freq: " + traveler.wobble.freq;
                const wobbleShape = document.createElement("p");
                wobbleShape.textContent = "Shape: " + traveler.wobble.shape;
                const wobbleTransAmp = document.createElement("p");
                wobbleTransAmp.textContent = "transAmp: " + traveler.wobble.transAmp;
                const wobbleLongAmp = document.createElement("p");
                wobbleLongAmp.textContent = "longAmp: " + traveler.wobble.longAmp;
                li.appendChild(travelerWobble);
                li.appendChild(wobbleOn);
                li.appendChild(wobbleFreq);
                li.appendChild(wobbleShape);
                li.appendChild(wobbleTransAmp);
                li.appendChild(wobbleLongAmp);
            }
            document.getElementById("travelersList").appendChild(li);
        }
    }

    // Render Velocity Profile Information
    const velocityProfile = build.velocityProfiles.find((velocityProfile) => velocityProfile.id === segmentStyle.velocityProfileID);
    if (velocityProfile === undefined) throw new Error("Velocity Profile " + velocityProfile.id + "not found");
    document.getElementById("velocityProfileID").textContent = `ID: ${velocityProfile.id}`;
    document.getElementById("velocityProfileVelocity").textContent = `Velocity: ${velocityProfile.velocity}`;
    document.getElementById("velocityProfileMode").textContent = `Mode: ${velocityProfile.mode}`;
    document.getElementById("velocityProfileJumpDelay").textContent = `Jump Delay: ${velocityProfile.jumpDelay}`;
    document.getElementById("velocityProfileMarkDelay").textContent = `Mark Delay: ${velocityProfile.markDelay}`;
    document.getElementById("velocityProfilePolygonDelay").textContent = `Polygon Delay: ${velocityProfile.polygonDelay}`;
    document.getElementById("velocityProfileLaserOnDelay").textContent = `Laser On Delay: ${velocityProfile.laserOnDelay}`;
    document.getElementById("velocityProfileLaserOffDelay").textContent = `Laser Off Delay: ${velocityProfile.laserOffDelay}`;
}

exports.RenderSegmentInfo = RenderSegmentInfo;
exports.getClosestSegment = getClosestSegment;
exports.getHTMLSegmentFromNumber = getHTMLSegmentFromNumber;
