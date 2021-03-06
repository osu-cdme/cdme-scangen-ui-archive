const { d3 } = require("../../../imports");
const { outputSegment, drawBuild, reset } = require("./drawing");
const { getCurrentBuild } = require("../../../Build");

let animating = false;
let paused = false;
const queuedSegments = [];

// Click Listeners
d3.select("#start").on("click", function () {
    if (animating) {
        d3.select("#start").text("Animate");
        stopAnimation();
    } else {
        d3.select("#start").text("Stop");
        startAnimation();
    }
});
d3.select("#pause").on("click", function () {
    if (!animating) return; // Can't pause if we aren't currently animating
    if (!paused) pauseAnimation();
    else unpauseAnimation();
});
d3.select("#animationSpeed").on("change", function () {
    pauseAnimation(); // Simpler way to trigger a requeue of the timing on all the segments
    unpauseAnimation();
});

// Click Handler Functions
function startAnimation() {
    animating = true;
    reset(); // Clear the screen
    const speed = parseFloat(d3.select("#animationSpeed").property("value"));
    document.getElementById("pause").classList.remove("disabled");

    d3.select("#animate").text("Stop");
    let currentTime = 0;

    // TODO: Ideally, we don't duplicate this code across "start" and "resume" functionality
    const drawHatches = document.getElementById("drawHatches").checked;
    const drawContours = document.getElementById("drawContours").checked;
    const drawJumps = document.getElementById("drawJumps").checked;
    for (const segment of getCurrentBuild().segments) {
        segment.animated = false;
        if (segment.type === "hatch" && !drawHatches) continue;
        if (segment.type === "contour" && !drawContours) continue;
        if (segment.type === "jump" && !drawJumps) continue;
        const velocity = getVelocityOfSegment(segment);
        currentTime += (100 * 100) / velocity / speed; // Largely just a best-guess scaling factor
        queuedSegments.push(setTimeout(animateSegment, currentTime, segment));
    }
}
function stopAnimation() {
    document.getElementById("pause").classList.add("disabled");
    animating = false;
    d3.select("#start").text("Animate");
    paused = false;
    d3.select("#pause").text("Pause");
    for (const timeout of queuedSegments) {
        clearTimeout(timeout);
    }
    queuedSegments.length = 0; // Clear the array
    for (const segment of getCurrentBuild().segments) {
        segment.animated = false;
    }
    drawBuild(getCurrentBuild(), "mainsvg");
}

// We use a wrapper function for the animation code, as it's an architectural decision to not care at all about animation from outputSegment
function animateSegment(segment) {
    queuedSegments.shift(); // Remove first segment (one about to animate) from queue
    segment.animated = true;
    outputSegment(segment, document.getElementById("mainsvg"));
    if (queuedSegments.length === 0) {
        console.log("Done animating!");
        stopAnimation();
    }
}

function pauseAnimation() {
    paused = true;
    d3.select("#pause").text("Unpause");
    for (const timeout of queuedSegments) {
        clearTimeout(timeout);
    }
    queuedSegments.length = 0; // Clear the array
}
function unpauseAnimation() {
    paused = false;
    d3.select("#pause").text("Pause");
    let currentTime = 0;
    const speed = parseFloat(d3.select("#animationSpeed").property("value"));
    const drawHatches = document.getElementById("drawHatches").checked;
    const drawContours = document.getElementById("drawContours").checked;
    const drawJumps = document.getElementById("drawJumps").checked;
    for (const segment of getCurrentBuild().segments) {
        if (segment.animated) continue; // Skip if already drawn on the screen
        if (segment.type === "hatch" && !drawHatches) continue;
        if (segment.type === "contour" && !drawContours) continue;
        if (segment.type === "jump" && !drawJumps) continue;
        const velocity = getVelocityOfSegment(segment);
        currentTime += (100 * 100) / velocity / speed; // Largely just a best-guess scaling factor
        queuedSegments.push(setTimeout(animateSegment, currentTime, segment));
    }
}

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
