const path = require("path");
const paths = require("../paths");
const d3 = require(path.join(paths.GetUIPath(), "static", "d3.min.js"));

let parent = document.getElementById("rightPart");
const fs = require("fs");

// "Display" button event listener
// Only theoretically clicked on when the player wants to skip an animation and go all the way to the end
// We simply save the last render we did and default to that here
d3.select("#display").on("click", (e) => {
    e.preventDefault();
    drawBuild(currentBuild, "mainsvg");
});

// "Animate" button event listener
d3.select("#animate").on("click", (e) => {
    e.preventDefault();
    animateBuild(currentBuild);
});

// Cancels any current animation and wipes the svg
function reset() {
    for (let lineQueued in linesQueued) {
        clearTimeout(lineQueued);
    }
    d3.select("#mainsvg").selectAll("*").remove();
}

let { LoadXML } = require(path.join(paths.GetUIPath(), "../", "alsam-xml", "alsam-xml.js"));
async function getBuildFromFilePath(filePath) {
    const response = await fetch(filePath);
    const text = await response.text();
    const build = LoadXML(text);
    build.trajectories.forEach((trajectory) => {
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.path.segments.forEach((segment) => {
            segment.number = currentSegmentCount;
            currentSegmentCount++;
        });
    });
    return build;
}

// We *could* do this recursively, but instead we just iterate through every trajectory and
// do a setTimeout with 10 ms delay added to each sequential one
let linesQueued = [];
function animateBuild(build) {
    reset();
    let currentTime = 0;
    build.trajectories.forEach((trajectory) => {
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.path.segments.forEach((segment) => {
            currentTime += 10; // Add 10 ms to the current time
            linesQueued.push(setTimeout(outputSegment, currentTime, segment, "mainsvg"));
        });
    });
    console.debug("Queued all lines for drawing!");
}

function populateLayerList() {
    let files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
    numThumbnailsTotal = files.length;
    files.forEach(async (file) => {
        let filePath = path.join(paths.GetUIPath(), "xml", file);
        let layerNum = parseInt(file.match(/(\d+)/)[0]); // First part finds the number, second part trims zeroes

        let li = d3.select("#layerList").append("li");

        li.append("canvas")
            .attr("id", "canvas_" + layerNum)
            .attr("width", 50)
            .attr("height", 50);
        const build = await getBuildFromFilePath(filePath);
        drawBuild_canvas(build, "canvas_" + layerNum);

        li.append("p")
            .text("Layer " + layerNum) // Extract only the number from the file name
            .on("click", async (e) => {
                e.preventDefault();
                const build = await getBuildFromFilePath(filePath);
                currentBuild = build;
                currentPath = filePath;
                drawBuild(build, "mainsvg");
            });
    });
}

// Renders the .PNG files that `pyslm` outputs.
function renderPNGs() {
    console.debug("Rendering .PNG output from `pyslm`.");
    let files = fs.readdirSync(path.join(paths.GetBackendPath(), "LayerFiles"));
    files.forEach((file) => {
        let text = document.createElement("p");
        text.textContent = file;

        let img = document.createElement("img");
        img.src = path.join(paths.GetBackendPath(), "LayerFiles", file);

        let container = document.createElement("div");
        container.classList.toggle("layerimage");
        container.appendChild(text);
        container.appendChild(img);

        parent.appendChild(container);
    });
}

// Canvas is less flexible for zooming and such, but is generally more performant, so we use it for thumbnails
let numThumbnailsDrawn = 0,
    numThumbnailsTotal;
function drawBuild_canvas(build, canvas_id) {
    let canvas_ctx = document.getElementById(canvas_id).getContext("2d");

    // We have to transform coordinates, as 'Canvas' doesn't use a cartesian coordinate system
    let minX = null,
        minY = null,
        maxX = null,
        maxY = null;

    // Calculate bounds
    build.trajectories.forEach((trajectory) => {
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        if (trajectory.path.type !== "contour") return; // Only factor contours in, as we will only draw contours
        trajectory.path.segments.forEach((segment) => {
            if (minX === null) minX = segment.x1;
            if (minY === null) minY = segment.y1;
            if (maxX === null) maxX = segment.x1;
            if (maxY === null) maxY = segment.y1;
            minX = Math.min(minX, segment.x1, segment.x2);
            minY = Math.min(minY, segment.y1, segment.y2);
            maxX = Math.max(maxX, segment.x1, segment.x2);
            maxY = Math.max(maxY, segment.y1, segment.y2);
        });
    });

    // Calculate percentage between a and b that c is
    function percentage(a, b, c) {
        return (c - a) / (b - a);
    }

    // Actually draw
    canvas_ctx.fillStyle = "white";
    canvas_ctx.lineWidth = 0.25;
    canvas_ctx.fillRect(0, 0, 50, 50);
    build.trajectories.forEach((trajectory) => {
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        if (trajectory.path.type !== "contour") return; // Only draw contours
        if (trajectory.path.segments.length === 0) return; // Likely never true, but worth checking
        canvas_ctx.beginPath();
        let x1 = percentage(minX, maxX, trajectory.path.segments[0].x1) * 50; // Need to essentially convert from IRL coords to Canvas coords
        let y1 = percentage(minY, maxY, trajectory.path.segments[0].y1) * 50;
        canvas_ctx.moveTo(x1, y1);
        trajectory.path.segments.forEach((segment) => {
            let x2 = percentage(minX, maxX, segment.x2) * 50;
            let y2 = percentage(minY, maxY, segment.y2) * 50;
            canvas_ctx.lineTo(x2, y2);
        });
        canvas_ctx.stroke();
    });
    numThumbnailsDrawn++;
    let progress = Math.floor((numThumbnailsDrawn / numThumbnailsTotal) * 100);
    document.getElementById("loading").textContent = `Loading. Please wait a sec... (Progress: ${progress}%)`;
    if (numThumbnailsDrawn >= numThumbnailsTotal) {
        toggleLoading();
    }
}

function reset() {
    let svg = document.getElementById("mainsvg");
    while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
    }
    linesQueued.forEach((timeout) => {
        clearTimeout(timeout);
    });
    linesQueued = [];
}

function toggleLoading() {
    let loading = document.getElementById("loading");
    if (loading.style.display === "none") {
        loading.style.display = "absolute";
    } else {
        loading.style.display = "none";
    }
}

// The synchronous part that actually draws the svg on the screen
function drawBuild(build, svg_id) {
    if (svg_id === "mainsvg") reset();

    // We need to recalculate and re-set the viewbox for each layer, as they have different bounds
    // Very good writeup on how viewBox, etc. works here: https://pandaqitutorials.com/Website/svg-coordinates-viewports
    let boundingBox = GetSvgBoundingBox(build);
    console.debug("Calculated bounding box for part. BB: ", boundingBox);
    const BOUNDS_WIDTH = boundingBox[2] - boundingBox[0];
    const BOUNDS_HEIGHT = boundingBox[3] - boundingBox[1];
    const PADDING = 2;
    const viewboxStr =
        "" + (boundingBox[0] - PADDING) + " " + (boundingBox[1] - PADDING) + " " + (BOUNDS_WIDTH + PADDING * 2) + " " + (BOUNDS_HEIGHT + PADDING * 2);
    d3.select("#" + svg_id).attr("viewBox", viewboxStr); // Basically lets us define our bounds

    // Actually output
    outputTrajectories(build, svg_id);
    console.debug("Displayed trajectories.");
}

// Returns a [min x, min y, max x, max y] bounding box corresponding to the passed-in trajectories
function GetSvgBoundingBox(build) {
    let output = [0, 0, 0, 0];
    build.trajectories.forEach((trajectory) => {
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.path.segments.forEach((segment) => {
            // Took me a solid hour to figure out each 'segment' is saved as a STRING and this needs cast
            // But JavaScript is super loose and just let me compare strings and ints without complaining
            let x1_int = parseInt(segment.x1);
            let y1_int = parseInt(segment.y1);
            let x2_int = parseInt(segment.x2);
            let y2_int = parseInt(segment.y2);

            if (x1_int < output[0]) {
                // Min X
                output[0] = x1_int;
            }
            if (x2_int < output[0]) {
                output[0] = x2_int;
            }

            if (x1_int > output[2]) {
                // Max X
                output[2] = x1_int;
            }
            if (x2_int > output[2]) {
                output[2] = x2_int;
            }

            if (y1_int < output[1]) {
                // Min Y
                output[1] = y1_int;
            }
            if (y2_int < output[1]) {
                output[1] = y2_int;
            }

            if (y1_int > output[3]) {
                // Max Y
                output[3] = y1_int;
            }
            if (y2_int > output[3]) {
                output[3] = y2_int;
            }
        });
    });

    return output;
}

// NOTE: Makes an assumption independent of the schema that contours have 'contour' in their ID and everything else (with a Traveler) is a hatch
function SegmentIDType(segmentID) {
    for (let segmentStyle of currentBuild.segmentStyles) {
        if (segmentStyle.id === segmentID) {
            if (segmentStyle.travelers.length === 0) {
                return "jump";
            } else if (segmentStyle.id.includes("contour")) {
                return "contour";
            } else {
                // Assume anything else is a hatch
                return "hatch";
            }
        }
    }
    throw new Error(`Segment Style ID ${segmentID} never found in .XML file!`);
}

let currentSegmentCount = 0;
function outputSegment(segment, svg_id) {
    let type = SegmentIDType(segment.segStyle);
    let color = null,
        stripeWidth = null,
        dash = "";
    switch (type) {
        case "contour":
            color = "#000000"; // Black
            stripeWidth = 0.2;
            break;
        case "hatch":
            color = "#BD0000"; // Red
            stripeWidth = 0.04;
            break;
        case "jump":
            color = "#0000FF"; // Blue
            stripeWidth = 0.03;
            dash = ".3,.3";
            break;
        default:
            throw new Error("Unknown segment type: " + type);
    }

    d3.select("#" + svg_id)
        .append("line")
        .attr("x1", segment.x1)
        .attr("y1", segment.y1)
        .attr("x2", segment.x2)
        .attr("y2", segment.y2)
        .attr("id", "segment-" + segment.number) // Used as a lookup number for vector querying
        .attr("stroke-dasharray", dash)
        .attr("stroke", color)
        .attr("stroke-width", stripeWidth);
}

/* 
Displays an interactable picture representing the same data object returned by getTrajectories
*/
function outputTrajectories(build, elementID) {
    build.trajectories.forEach((trajectory) => {
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.path.segments.forEach((segment) => {
            outputSegment(segment, elementID);
        });
    });
}

let { ExportXML } = require(path.join(paths.GetUIPath(), "../", "alsam-xml", "alsam-xml.js"));
function SaveChangesToLayer() {
    let text = ExportXML(currentBuild);
    fs.writeFile(currentPath, text, (err) => {
        if (err) throw new Error("Error writing file: " + err);
        alert("Successfully saved changes to layer!");
    });
}
document.getElementById("save").addEventListener("click", SaveChangesToLayer);

// Get click coordinates on svg
const svg = document.getElementById("mainsvg");
const { getClosestSegment, getHTMLSegmentFromNumber, toggleSegment, RenderSegmentInfo } = require("./vectorquerying.js");
var pt = svg.createSVGPoint(); // Created once for document
svg.addEventListener("click", (e) => {
    pt.x = e.clientX;
    pt.y = e.clientY;

    // Get cursor position
    var cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
    // console.log("Cursor Pos: (" + cursorpt.x + ", " + cursorpt.y + ")");

    // Get closest segment to that one
    let closestSegment = getClosestSegment(cursorpt.x, cursorpt.y, currentBuild);
    RenderSegmentInfo(closestSegment, currentBuild);
    console.log("Closest segment: ", closestSegment);

    // Backtrack from the same JSON backend to the HTML frontend segment
    let closestSegmentHTML = getHTMLSegmentFromNumber(closestSegment.number);
    console.log("Closest segment HTML: ", closestSegmentHTML);

    // Toggle it!
    toggleSegment(closestSegmentHTML);
    // console.log("Toggled closest segment!");
});

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
// Leave this at the end; messes with the order of defining things otherwise
let currentBuild = null;
let currentPath = null;
main();
async function main() {
    // Get the first filename in the folder
    let firstFile = fs.readdirSync(path.join(paths.GetUIPath(), "xml"))[0];
    const build = await getBuildFromFilePath(path.join(paths.GetUIPath(), "xml", firstFile));
    currentBuild = build;
    currentPath = path.join(paths.GetUIPath(), "xml", firstFile);
    console.log("build: ", build);
    drawBuild(build, "mainsvg", true);

    // Set this to false to remove the load step; useful for quick debugging stuff
    const DRAW_THUMBNAILS = true;
    if (DRAW_THUMBNAILS) {
        populateLayerList();
    } else {
        toggleLoading();
    }
}
