const d3 = require("./d3.min.js");
const path = require("path");
const building = false;
const pathToResources = building ? path.join(__dirname, "../") : path.join(__dirname, "../cdme-scangen/");

let parent = document.getElementById("rightPart");
const fs = require("fs");

// "Display" button event listener
// Only theoretically clicked on when the player wants to skip an animation and go all the way to the end
// We simply save the last render we did and default to that here
d3.select("#display").on("click", (e) => {
    e.preventDefault();
    renderXML(currentPath, "mainsvg", true);
});

// "Animate" button event listener
d3.select("#animate").on("click", (e) => {
    e.preventDefault();
    animateXML(currentPath);
});

// Convenient function call to wite whatever's currently in the SVG
function wipeSVG() {
    d3.select("#mainsvg").selectAll("*").remove();
}

// If there's currently another animation going, end that one before we start this one
let nextLineDraw = null; // We assign every setTimeout we do to this variable
function stopDrawing() {
    if (nextLineDraw !== null) {
        clearTimeout(nextLineDraw);
    }
}

// Draws contours, then hatches, at a specified interval between them
// TODO: Add a text field where the player can input the speed they want to go at
// TODO: Lots of repeated code here with drawing from an XML; probably best to further functionalize it
async function animateXML(pathToXML) {
    console.debug("Animating .XML at path " + pathToXML);
    stopDrawing();
    wipeSVG();
    fetch(pathToXML)
        .then((response) => response.text())
        .then(async (data) => {
            let parser = new DOMParser();
            doc = parser.parseFromString(data, "text/xml"); // XMLDocument (https://developer.mozilla.org/en-US/docs/Web/API/XMLDocument)

            // Get a { contours = [], hatches = [] } object
            let trajectories = getTrajectories(doc);
            console.debug("Read trajectories: ", trajectories);

            // Figure out a bounding box for this layer so that we know how to scale the .svg
            let boundingBox = getBoundingBoxForTrajectories(trajectories);
            console.debug("Calculated bounding box for part. BB: ", boundingBox);

            // Space from part boundary added to the edges of the graphic
            const PADDING = 2;

            // <Bounding Box Size> + <Padding, applied once for each side> + <Overall multiplicative constant>
            const SVG_WIDTH = 300;
            const SVG_HEIGHT = 300;
            const BOUNDS_WIDTH = boundingBox[2] - boundingBox[0];
            const BOUNDS_HEIGHT = boundingBox[3] - boundingBox[1];

            // Very good writeup on how viewBox, etc. works here: https://pandaqitutorials.com/Website/svg-coordinates-viewports
            // We are essentially setting the origin negative and then widths/heights such that it covers the entire part,
            // which lets us do everything without needing to manually transform any of our actual points
            const viewboxStr =
                "" +
                (boundingBox[0] - PADDING) +
                " " +
                (boundingBox[1] - PADDING) +
                " " +
                (BOUNDS_WIDTH + PADDING * 2) +
                " " +
                (BOUNDS_HEIGHT + PADDING * 2);

            const ID = "mainsvg";
            d3.select("#" + ID)
                .attr("class", "xmlsvg")
                .attr("width", SVG_WIDTH)
                .attr("height", SVG_HEIGHT)
                .attr("fill", "#FFFFFF")
                .attr("viewBox", viewboxStr) // Basically lets us define our bounds
                .attr("id", ID); // Strip non-alphanumeric characters, else d3's select() fails to work

            // Draw the lines one by one
            if (trajectories.contours.length !== 0) await animateContours(trajectories);
            else if (trajectories.hatches.length !== 0) await animateHatches(trajectories);
        });
}

// Print the list of [min x, min y, max x, max y] objects presented in a non-blocking manner
async function animateContours(trajectories) {
    let list = trajectories.contours;
    nextLineDraw = await drawLine(0); // Start it on the first line, it automatically recurses on the next after a second
    async function drawLine(idx) {
        d3.select("#mainsvg")
            .append("line")
            .attr("x1", list[idx][0])
            .attr("y1", list[idx][1])
            .attr("x2", list[idx][2])
            .attr("y2", list[idx][3])
            .attr("stroke", "#000000")
            .attr("stroke-width", 0.1);

        // If this is last, return from function, meaning the original call can return
        if (idx === list.length - 1) {
            if (trajectories.hatches.length !== 0) animateHatches(trajectories);
        } else {
            // Otherwise, recurse and draw next line in a second
            const MS_DELAY = 5;
            nextLineDraw = setTimeout(drawLine, MS_DELAY, idx + 1); // Third parameter onward is parameters
        }
    }
}

// Print the list of [min x, min y, max x, max y] objects presented in a non-blocking manner
// TODO: It's pretty messy to essentially have to copy this code twice, but I can't figure out an alternative that works properly with JavaScript's async system
async function animateHatches(trajectories) {
    let list = trajectories.hatches;
    nextLineDraw = await drawLine(0); // Start it on the first line, it automatically recurses on the next after a second
    async function drawLine(idx) {
        d3.select("#mainsvg")
            .append("line")
            .attr("x1", list[idx][0])
            .attr("y1", list[idx][1])
            .attr("x2", list[idx][2])
            .attr("y2", list[idx][3])
            .attr("stroke", "#000000")
            .attr("stroke-width", 0.1);

        // If this is last, return from function, meaning the original call can return
        if (idx === list.length - 1) {
            animateHatches(trajectories);
        } else {
            // Otherwise, recurse and draw next line in a second
            const MS_DELAY = 10;
            nextLineDraw = setTimeout(drawLine, MS_DELAY, idx + 1); // Third parameter onward is parameters
        }
    }
}

function populateLayerList() {
    fs.readdirSync(path.join(__dirname, "xml")).forEach((file) => {
        let layerNum = parseInt(file.match(/(\d+)/)[0]); // First part finds the number, second part trims zeroes

        let li = d3.select("#layerList").append("li");

        li.append("svg")
            .attr("id", "svg_" + layerNum)
            .attr("width", 50)
            .attr("height", 50);

        li.append("p")
            .text("Layer " + layerNum) // Extract only the number from the file name
            .on("click", (e) => {
                e.preventDefault();
                renderXML(path.join(__dirname, "xml", file), "mainsvg", true);
            });
    });
}

// Renders the .PNG files that `pyslm` outputs.
function renderPNGs() {
    console.debug("Rendering .PNG output from `pyslm`.");
    let files = fs.readdirSync(path.join(pathToResources, "LayerFiles"));
    files.forEach((file) => {
        let text = document.createElement("p");
        text.textContent = file;

        let img = document.createElement("img");
        img.src = path.join(pathToResources, "LayerFiles", file);

        let container = document.createElement("div");
        container.classList.toggle("layerimage");
        container.appendChild(text);
        container.appendChild(img);

        parent.appendChild(container);
    });
}

let thumbnailsDrawn = false;

// The synchronous part that actually draws the svg on the screen
function drawBuild(build, svgID, output_hatches) {
    // Figure out a bounding box for this layer so that we know how to scale the .svg
    let boundingBox = GetSvgBoundingBox(build);
    console.debug("Calculated bounding box for part. BB: ", boundingBox);

    // Space from part boundary added to the edges of the graphic
    const PADDING = 2;

    // <Bounding Box Size> + <Padding, applied once for each side> + <Overall multiplicative constant>
    const BOUNDS_WIDTH = boundingBox[2] - boundingBox[0];
    const BOUNDS_HEIGHT = boundingBox[3] - boundingBox[1];

    // Very good writeup on how viewBox, etc. works here: https://pandaqitutorials.com/Website/svg-coordinates-viewports
    // We are essentially setting the origin negative and then widths/heights such that it covers the entire part,
    // which lets us do everything without needing to manually transform any of our actual points
    const viewboxStr =
        "" + (boundingBox[0] - PADDING) + " " + (boundingBox[1] - PADDING) + " " + (BOUNDS_WIDTH + PADDING * 2) + " " + (BOUNDS_HEIGHT + PADDING * 2);

    d3.select("#" + svgID)
        .attr("class", "xmlsvg")
        .attr("viewBox", viewboxStr) // Basically lets us define our bounds
        .attr("id", svgID); // Strip non-alphanumeric characters, else d3's select() fails to work

    outputTrajectories(build, svgID, output_hatches);
    console.debug("Displayed trajectories.");
}

// Returns a [min x, min y, max x, max y] bounding box corresponding to the passed-in trajectories
function GetSvgBoundingBox(build) {
    let output = [0, 0, 0, 0];
    console.log("build: ", build);
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
function SegmentIDType(segmentID, build) {
    for (let segmentStyle of build.segmentStyles) {
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

/* 
Displays an interactable picture representing the same data object returned by getTrajectories
*/
function outputTrajectories(build, svg_id, output_hatches) {
    build.trajectories.forEach((trajectory) => {
        // TODO: Look up whether hatch, contour, jump
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.path.segments.forEach((segment) => {
            let type = SegmentIDType(segment.segStyle, build);
            let color = null,
                stripeWidth = null;
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
                    stripeWidth = 0.025;
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
                .attr("stroke", color)
                .attr("stroke-width", stripeWidth);
        });
    });
}

let { LoadXML } = require("../alsam-xml/alsam-xml");

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
// Leave this at the end; messes with the order of defining things otherwise
let currentPath = "";
main();
async function main() {
    const response = await fetch(path.join(__dirname, "xml", "scan_135.xml"));
    const text = await response.text();
    const build = LoadXML(text);
    console.log("build", build);
    drawBuild(build, "mainsvg", true);

    // Populate the list of layers
    // populateLayerList();
}
