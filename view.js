const d3 = require("./d3.min.js");
const path = require("path");
const building = false;
const pathToResources = building
    ? path.join(__dirname, "../")
    : path.join(__dirname, "../cdme-scangen/");

let parent = document.getElementById("rightPart");
const fs = require("fs");
const { resolve } = require("path");
const { randomBytes } = require("crypto");

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
            console.debug(
                "Calculated bounding box for part. BB: ",
                boundingBox
            );

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
            if (trajectories.contours.length !== 0)
                await animateContours(trajectories);
            else if (trajectories.hatches.length !== 0)
                await animateHatches(trajectories);
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
async function renderXML(pathToXML, svgID, output_hatches) {
    console.log(`Rendering .XML at path ${pathToXML} in svg frame ID ${svgID}`);

    // Specifically for the main svg, we want to prioritize and do everything synchronously
    currentPath = pathToXML;
    if (svgID === "mainsvg") {
        stopDrawing(); // Terminate any setTimeout() animation loop currently occurring
        wipeSVG(); // Get rid of any elements already in the main <svg> element (i.e. from the currently drawn layer we're replacing)
        console.log("Main one!");
        let data = await (await fetch(pathToXML)).text();
        drawData(data, svgID);
        console.log("Rendered the main one.");

        // If thumbnails aren't drawn yet, draw them
        if (!thumbnailsDrawn) {
            fs.readdirSync(path.join(__dirname, "xml")).forEach((file) => {
                let layerNum = parseInt(file.match(/(\d+)/)[0]); // First part finds the number, second part trims zeroes
                renderXML(
                    path.join(__dirname, "xml", file),
                    "svg_" + layerNum,
                    false
                );
            });
        }
        thumbnailsDrawn = true;
    }

    // Otherwise, do them async
    else {
        console.log("Thumbnail!");
        fetch(pathToXML)
            .then((response) => response.text())
            .then((data) => drawData(data, svgID));
    }

    // The synchronous part that actually draws the svg on the screen
    function drawData(data, svgID) {
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

        d3.select("#" + svgID)
            .attr("class", "xmlsvg")
            .attr("viewBox", viewboxStr) // Basically lets us define our bounds
            .attr("id", svgID); // Strip non-alphanumeric characters, else d3's select() fails to work

        outputTrajectories(trajectories, svgID, output_hatches);
        console.debug("Displayed trajectories.");
    }
}

// Returns a [min x, min y, max x, max y] bounding box corresponding to the passed-in trajectories
function getBoundingBoxForTrajectories(trajectories) {
    let output = [0, 0, 0, 0];
    trajectories.contours.forEach((line) => {
        // Min X Check
        if (line[0] < output[0]) {
            output[0] = line[0];
        }
        if (line[2] < output[0]) {
            output[0] = line[2];
        }

        // Max X Check
        if (line[0] > output[2]) {
            output[2] = line[0];
        }
        if (line[2] > output[2]) {
            output[2] = line[2];
        }

        // Min Y Check
        if (line[1] < output[1]) {
            output[1] = line[1];
        }
        if (line[3] < output[1]) {
            output[1] = line[3];
        }

        // Max Y Check
        if (line[1] > output[3]) {
            output[3] = line[1];
        }
        if (line[3] > output[3]) {
            output[3] = line[3];
        }
    });

    trajectories.hatches.forEach((line) => {
        // Min X Check
        if (line[0] < output[0]) {
            output[0] = line[0];
        }
        if (line[2] < output[0]) {
            output[0] = line[2];
        }

        // Max X Check
        if (line[0] > output[2]) {
            output[2] = line[0];
        }
        if (line[2] > output[2]) {
            output[2] = line[2];
        }

        // Min Y Check
        if (line[1] < output[1]) {
            output[1] = line[1];
        }
        if (line[3] < output[1]) {
            output[1] = line[3];
        }

        // Max Y Check
        if (line[1] > output[3]) {
            output[3] = line[1];
        }
        if (line[3] > output[3]) {
            output[3] = line[3];
        }
    });
    return output;
}

/* 
Given a Document object that conforms to the OASIS XML Schema, returns a data object of the following form:
{
    "contours": [
        [start x, start y, end x, end y], ...
    ], 
    "hatches": [
        [start x, start y, end x, end y], ... 
    ]
}
*/
function getTrajectories(doc) {
    let contours = [],
        hatches = [];
    let paths = doc.getElementsByTagName("Path");
    for (let path of paths) {
        // Save a reference to the array that we should append to
        // (needs saved before we lose a reference to the first child)
        let appendArr =
            path.firstChild.nextSibling.textContent === "contour"
                ? contours
                : hatches;

        // Skip over the overall path parameters to get to the actual geometric numbers
        // ...don't ask. Can't find a better way to do it.
        // It seems to treat the textContent itself as a sibling as well
        let currentNode = path.childNodes.item(9); // Start at <Start> tag; text inside is also counted as tags
        let x1 = currentNode.firstChild.textContent,
            y1 = currentNode.lastChild.textContent;
        let x2, y2;
        while (currentNode.nextSibling != null) {
            // Connect current x1/y1 to next x2/y2 and add to list
            currentNode = currentNode.nextSibling.nextSibling;
            x2 = currentNode.lastChild.firstChild.textContent;
            y2 = currentNode.lastChild.lastChild.textContent;
            appendArr.push([
                parseFloat(x1),
                parseFloat(y1),
                parseFloat(x2),
                parseFloat(y2),
            ]);

            // Cycle second vertex to first vertex; next loop iteration will set second vertex to next value
            x1 = x2;
            y1 = y2;
        }
    }

    return {
        contours: contours,
        hatches: hatches,
    };
}

/* 
Displays an interactable picture representing the same data object returned by getTrajectories
*/
function outputTrajectories(data, svg_id, output_hatches) {
    data.contours.forEach((line) => {
        d3.select("#" + svg_id)
            .append("line")
            .attr("x1", line[0])
            .attr("y1", line[1])
            .attr("x2", line[2])
            .attr("y2", line[3])
            .attr("stroke", "#000000")
            .attr("stroke-width", 0.1);
    });

    if (output_hatches) {
        data.hatches.forEach((line) => {
            d3.select("#" + svg_id)
                .append("line")
                .attr("x1", line[0])
                .attr("y1", line[1])
                .attr("x2", line[2])
                .attr("y2", line[3])
                .attr("stroke", "#000000")
                .attr("stroke-width", 0.1);
        });
    }
}

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
// Leave this at the end; messes with the order of defining things otherwise
let currentPath = "";
main();
function main() {
    // Render the first layer as a default
    let layer1Path = path.join(
        __dirname,
        "xml",
        fs.readdirSync(path.join(__dirname, "xml"))[0]
    );
    renderXML(layer1Path, "mainsvg", true);

    // Populate the list of layers
    populateLayerList();
}
