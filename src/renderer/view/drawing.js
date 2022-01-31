// Functions that actually draw on the SVG
const { d3, getCurrentBuild } = require("../common");
const { getSegmentsFromBuild, getContoursFromBuild } = require("../common");
const { BoundingBox } = require("../classes");

// Return thermal color for provided 'Power' value
function getColorFromPower(build, value) {
    function getPowerProportion(power) {
        return;
    }
    if (build.minPower === build.maxPower) return "#8B8000"; // Intermediate shade of yellow is our default
    const proportion = (power - build.minPower) / (build.maxPower - build.minPower);
    const green = Math.max(0, Math.round(255 * (1 - proportion)));
    const red = Math.min(Math.round(255 * proportion), 255);
    return `rgb(${red}, ${green}, 0)`;
}

function reset() {
    d3.select("#mainsvg").selectAll("*").remove();
}
exports.reset = reset;

// The synchronous part that actually draws the svg on the screen
function drawBuild(build, svgID) {
    if (svgID === "mainsvg") reset();

    // We need to recalculate and re-set the viewbox for each layer, as they have different bounds
    // Very good writeup on how viewBox, etc. works here: https://pandaqitutorials.com/Website/svg-coordinates-viewports
    const PADDING = 2;
    const bbox = GetSvgBoundingBox(build, PADDING);

    // If bbox gets sets to some unrealistic value, means there's no vectors on this layer and we should just set it to something that won't give us an error
    if (Math.abs(bbox.maxX) > 500000) {
        const viewboxStr = `-20 -20 40 40`;
        d3.select("#" + svgID).attr("viewBox", viewboxStr); // Basically lets us define our bounds
    } else {
        const BOUNDS_WIDTH = bbox.maxX - bbox.minX;
        const BOUNDS_HEIGHT = bbox.maxY - bbox.minY;
        const viewboxStr = `${bbox.minX} ${bbox.minY} ${BOUNDS_WIDTH} ${BOUNDS_HEIGHT}`;
        d3.select("#" + svgID).attr("viewBox", viewboxStr); // Basically lets us define our bounds
    }

    for (const segment of getSegmentsFromBuild(build)) {
        outputSegment(segment, document.getElementById("mainsvg"));
    }
}
exports.drawBuild = drawBuild;

function percentage(a, b, c) {
    return (c - a) / (b - a);
}
exports.percentage = percentage;
// Canvas is less flexible for zooming and such, but is generally more performant, so we use it for thumbnails
function drawBuildCanvas(build, canvasID) {
    const canvasCtx = document.getElementById(canvasID).getContext("2d");

    // Calculate bounds
    const PADDING = 2;
    const bbox = GetSvgBoundingBox(build, PADDING);

    // Canvas setup
    canvasCtx.fillStyle = "white";
    canvasCtx.lineWidth = 0.25;
    const THUMBNAIL_SIZE = 50;
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
}
exports.drawBuildCanvas = drawBuildCanvas;

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
exports.GetSvgBoundingBox = GetSvgBoundingBox;

// If second element is not null, append to something with that ID
// Otherwise, assume svgReference is an svg node reference we can directly append to
function outputSegment(segment, svgRef) {
    if (segment.type === "jump" && !settings.jumps) return;
    if (segment.type === "hatch" && !settings.hatches) return;
    if (segment.type === "contour" && !settings.contours) return;

    let color = null;
    const type = segment.type;
    let stripeWidth = null;
    let dash = "";
    switch (settings.colorprofile) {
        case "thermal":
            switch (segment.type) {
                case "jump":
                    color = "#0000FF";
                    break;
                case "hatch":
                case "contour":
                    color = getColorFromPower(
                        getCurrentBuild().segmentStyles.find((segmentStyle) => {
                            return segmentStyle.id === segment.segStyle;
                        }).travelers[0].power
                    );
                    break;
                case "default":
                    alert("ERROR: Unknown segment type " + segment.type);
                    throw new Error("Unrecognized segment type " + segment.type);
            }
            break;
        case "default":
            switch (segment.type) {
                case "contour":
                    color = "#000000"; // Black
                    break;
                case "hatch":
                    color = "#BD0000"; // Red
                    break;
                case "jump":
                    color = "#0000FF"; // Blue
                    dash = ".3,.3";
                    break;
                default:
                    alert("ERROR: Unknown segment type: " + segment.type);
                    throw new Error("Unknown segment type: " + type);
            }
            break;
        default:
            alert("ERROR: Unknown color profile: " + settings.colorprofile);
            throw new Error("Unknown color profile: " + settings.colorprofile);
    }

    switch (segment.type) {
        case "contour":
            stripeWidth = 1;
            break;
        case "hatch":
            stripeWidth = 0.66;
            break;
        case "jump":
            stripeWidth = 0.5;
            dash = ".3,.3";
            break;
        default:
            alert("ERROR: Unknown segment type: " + segment.type);
            throw new Error("Unknown segment type: " + type);
    }

    d3.select(svgRef)
        .append("line")
        .attr("x1", segment.x1)
        .attr("y1", segment.y1)
        .attr("x2", segment.x2)
        .attr("y2", segment.y2)
        .attr("id", "segment-" + segment.number) // Used as a lookup number for vector querying
        .attr("stroke-dasharray", dash)
        .attr("stroke", color)
        .attr("stroke-width", stripeWidth)
        .attr("vector-effect", "non-scaling-stroke");
}
exports.outputSegment = outputSegment;

const settings = {
    contours: true,
    hatches: true,
    jumps: true,
    colorprofile: "default",
};
exports.getSettings = () => settings;

// Null checks will only pass if we're on the 'View' page
const drawJumps = document.getElementById("drawJumps");
if (drawJumps !== null) {
    document.getElementById("drawJumps").addEventListener("change", () => {
        settings.jumps = document.getElementById("drawJumps").checked;
        drawBuild(getCurrentBuild(), "mainsvg");
    });
    document.getElementById("drawHatches").addEventListener("change", () => {
        settings.hatches = document.getElementById("drawHatches").checked;
        drawBuild(getCurrentBuild(), "mainsvg");
    });
    document.getElementById("drawContours").addEventListener("change", () => {
        settings.contours = document.getElementById("drawContours").checked;
        drawBuild(getCurrentBuild(), "mainsvg");
    });
    document.getElementById("colorprofile").addEventListener("change", () => {
        settings.colorprofile = document.getElementById("colorprofile").value;
        drawBuild(getCurrentBuild(), "mainsvg");
    });
}
