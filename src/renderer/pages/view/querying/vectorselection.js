const { getCurrentBuild, getHatchesFromBuild, getContoursFromBuild, getJumpsFromBuild } = require("../../../Build");
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
    const closestSegment = getClosestSegment(cursorpt.x, cursorpt.y, getCurrentBuild());
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
function getClosestSegment(point) {
    // closeSegments = Segments before we filter them using the current interval
    // closerSegments = Segments AFTER we filter them using the current interval
    let closeSegments = new Set();
    let closerSegments = new Set();

    // Only search among those that are actually drawn on the screen, which is much more intuitive for users
    if (document.getElementById("drawHatches").checked) closeSegments = new Set(...closeSegments, getHatchesFromBuild(getCurrentBuild()));
    if (document.getElementById("drawContours").checked) closeSegments = new Set(...closeSegments, ...getContoursFromBuild(getCurrentBuild()));
    if (document.getElementById("drawJumps").checked) closeSegments = new Set(...closeSegments, ...getJumpsFromBuild(getCurrentBuild()));

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
        segment.segStyle = this.value;
    };
    document.getElementById("segmentStyleID").onblur = function () {
        if (!build.segmentStyles.find((segStyle) => segStyle.id === this.value)) {
            console.log("build: ", build);
            const err = new Error("Segment Style " + this.value + "not found. Rolling back to original. Please create the segment style first.");
            alert(err.message);
            segment.segStyle = segment.originalSegStyle;
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
