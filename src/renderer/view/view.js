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

let { LoadXML } = require("../../../../alsam-xml/alsam-xml.js");
async function getBuildFromFilePath(filePath) {
    const response = await fetch(filePath);
    const text = await response.text();
    const build = LoadXML(text);

    // Add numbering into our data structure, which lets us do lookups to match HTML segments to data structure segments
    build.trajectories.forEach((trajectory) => {
        if (trajectory.paths === []) return;
        trajectory.paths.forEach((path) => {
            if (path.length === 0) return;
            path.segments.forEach((segment) => {
                segment.number = currentSegmentCount;
                currentSegmentCount++;
            });
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
        if (trajectory.paths === []) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.paths.forEach((path) => {
            if (path.segments.length === 0) return; // Likely never true, but worth checking
            path.segments.forEach((segment) => {
                currentTime += 10; // Add 10 ms to the current time
                linesQueued.push(setTimeout(outputSegment, currentTime, segment, "mainsvg"));
            });
        });
    });
    console.debug("Queued all lines for drawing!");
}

var natsort = require("natsort").default;
function populateLayerList() {
    let files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
    files.sort(natsort()); // See documentation for what this does: https://www.npmjs.com/package/natsort
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
        if (trajectory.paths === []) return;
        trajectory.paths.forEach((path) => {
            if (path.segments.length === 0) return; // Likely never true, but worth checking
            if (path.type !== "contour") return; // Only draw contours
            path.segments.forEach((segment) => {
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
    });

    minX -= 1;
    minY -= 1;
    maxX += 1;
    maxY += 1;

    // Calculate percentage between a and b that c is
    function percentage(a, b, c) {
        return (c - a) / (b - a);
    }

    // Actually draw
    canvas_ctx.fillStyle = "white";
    canvas_ctx.lineWidth = 0.25;
    canvas_ctx.fillRect(0, 0, 50, 50);
    build.trajectories.forEach((trajectory) => {
        if (trajectory.paths === []) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.paths.forEach((path) => {
            if (path.segments.length === 0) return; // Likely never true, but worth checking
            if (path.type !== "contour") return; // Only draw contours

            canvas_ctx.beginPath();
            let x1 = percentage(minX, maxX, path.segments[0].x1) * 50; // Need to essentially convert from IRL coords to Canvas coords
            let y1 = percentage(minY, maxY, path.segments[0].y1) * 50;
            canvas_ctx.moveTo(x1, y1);
            path.segments.forEach((segment) => {
                let x2 = percentage(minX, maxX, segment.x2) * 50;
                let y2 = percentage(minY, maxY, segment.y2) * 50;
                canvas_ctx.lineTo(x2, y2);
            });
            canvas_ctx.stroke();
        });
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
    let output = [null, null, null, null];
    build.trajectories.forEach((trajectory) => {
        if (trajectory.paths === []) return;
        trajectory.paths.forEach((path) => {
            if (path.segments.length === 0) return; // Likely never true, but worth checking
            path.segments.forEach((segment) => {
                // Set all initial values to the bounds
                if (output[0] === null) {
                    output[0] = segment.x1;
                    output[1] = segment.y1;
                    output[2] = segment.x1;
                    output[3] = segment.y1;
                }

                // Check mins/maxes during iteration
                output[0] = Math.min(output[0], segment.x1, segment.x2);
                output[1] = Math.min(output[1], segment.y1, segment.y2);
                output[2] = Math.max(output[2], segment.x1, segment.x2);
                output[3] = Math.max(output[3], segment.y1, segment.y2);
            });
        });
    });

    return output;
}

// NOTE: Makes an assumption independent of the schema that contours have 'contour' in their ID and everything else (with a Traveler) is a hatch
function SegmentIDType(path, segmentID) {
    // First, try and match to a Segment Style so we can check Traveler length to see if it's a jump
    for (let segmentStyle of currentBuild.segmentStyles) {
        if (segmentStyle.id === segmentID) {
            if (segmentStyle.travelers.length === 0) {
                return "jump";
            }
        }
    }

    // Otherwise, we examine the Path's 'type' attribute and choose based on that
    if (path.type === "contour") {
        return "contour";
    } else {
        // Assume anything else is a hatch
        return "hatch";
    }

    throw new Error(`Segment Style ID ${segmentID} never found in .XML file!`);
}

let currentSegmentCount = 0;
function outputSegment(segment, path, svg_id) {
    let type = SegmentIDType(path, segment.segStyle);
    let color = null,
        stripeWidth = null,
        dash = "";
    switch (type) {
        case "contour":
            color = "#000000"; // Black
            stripeWidth = 0.05;
            break;
        case "hatch":
            color = "#BD0000"; // Red
            stripeWidth = 0.03;
            break;
        case "jump":
            color = "#0000FF"; // Blue
            stripeWidth = 0.02;
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
        if (trajectory.paths === []) return;
        trajectory.paths.forEach((path) => {
            if (path.segments.length === 0) return; // Likely never true, but worth checking
            path.segments.forEach((segment) => {
                outputSegment(segment, path, elementID);
            });
        });
    });
}

let { ExportXML } = require("../../../../alsam-xml/alsam-xml.js");
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
const FileSaver = require("file-saver");
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

    // Backtrack from the same JSON backend to the HTML frontend segment
    let closestSegmentHTML = getHTMLSegmentFromNumber(closestSegment.number);

    // Toggle it!
    toggleSegment(closestSegmentHTML);
    // console.log("Toggled closest segment!");
});

require("./panning.js");

let zoomMultiplier = 1;
svg.onwheel = (e) => {
    e.preventDefault();

    // Get cursor pos relative to svg coords
    pt.x = e.clientX;
    pt.y = e.clientY;
    var cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Get current viewbox
    var box = svg.getAttribute("viewBox");
    box = box.split(/\s+|,/);
    box[0] = parseFloat(box[0]);
    box[1] = parseFloat(box[1]);
    box[2] = parseFloat(box[2]);
    box[3] = parseFloat(box[3]);

    let width = box[2],
        height = box[3];
    let previousX = box[0] + width / 2,
        previousY = box[1] + height / 2;

    // Zoom in
    let newWidth, newHeight;
    let newX, newY;
    if (ScrollDirectionIsUp(e)) {
        newWidth = width * 0.9;
        newHeight = height * 0.9;
        zoomMultiplier *= 0.99;

        // Weighted average; move a little towards the new point, but not by much
        newX = (-newWidth / 2 + 0.9 * previousX + 0.1 * cursorpt.x).toFixed(2);
        newY = (-newHeight / 2 + 0.9 * previousY + 0.1 * cursorpt.y).toFixed(2);
    } else {
        newWidth = width * 1.1;
        newHeight = height * 1.1;
        zoomMultiplier *= 1.01;

        // Don't move the origin when zooming out; it just feels unnatural
        (newX = -newWidth / 2 + previousX).toFixed(2), (newY = -newHeight / 2 + previousY).toFixed(2);
    }

    // TODO: Stroke width should be adjusted based on how far we're zoomed in
    // My brief attempts resulted in way too many iterations and lookups to be efficient
    // Best approach is probably to store each segment type (contour, hatch, jump) in a separate array which lets us map super quickly to them

    const viewboxStr = "" + newX + " " + newY + " " + newWidth + " " + newHeight;
    svg.setAttribute("viewBox", viewboxStr); // Basically lets us define our bounds
};

function ScrollDirectionIsUp(event) {
    if (event.wheelDelta) {
        return event.wheelDelta > 0;
    }
    return event.deltaY < 0;
}

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
// Leave this at the end; messes with the order of defining things otherwise
let currentBuild = null;
let currentPath = null;
main();
async function main() {
    let files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
    if (files.length === 0) {
        // Send them elsewhere if no .XML files to view
        alert("No scan files found! Generate them first via the 'Generate Vectors' tab on the left.");
        return;
    }

    let firstFile = files[0];
    const build = await getBuildFromFilePath(path.join(paths.GetUIPath(), "xml", firstFile));
    currentBuild = build;
    currentPath = path.join(paths.GetUIPath(), "xml", firstFile);
    drawBuild(build, "mainsvg", true);

    // Set this to false to remove the load step; useful for quick debugging stuff
    const DRAW_THUMBNAILS = true;
    if (DRAW_THUMBNAILS) {
        populateLayerList();
    } else {
        toggleLoading();
    }
}
