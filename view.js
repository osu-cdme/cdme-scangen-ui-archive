const path = require("path");
const building = false;
const pathToResources = building
  ? path.join(__dirname, "../")
  : path.join(__dirname, "../cdme-scangen/");

let parent = document.getElementById("rightPart");
const fs = require("fs");

// Not really "necessary" to have a main for js, but helps organizationally and to easily enable/disable functionality
main();
function main() {
  // renderPNGs();
  renderXMLs();
}

// Renders the .PNG files that `pyslm` outputs.
function renderPNGs() {
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

// Renders layer XML files, which are assumed to be in the `xml` directory.
function renderXMLs() {
  console.log("Loading .XML files.");
  fs.readdirSync(path.join(__dirname, "xml")).forEach((file) => {
    fetch(path.join(__dirname, "xml", file))
      .then((response) => response.text())
      .then((data) => {
        let parser = new DOMParser();
        doc = parser.parseFromString(data, "text/xml"); // XMLDocument (https://developer.mozilla.org/en-US/docs/Web/API/XMLDocument)

        // Get trajectories before defining SVG, as we define the SVG's size based on part bounds

        /* 
        let svg = document.createElement("svg"); // Create .svg to hold this layer
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.classList.toggle("xmlsvg"); // Class has all the styling we need in `view.css`
        svg.id = ("svg_" + file).replace(/\W/g, ""); 
        document.getElementById("svgContainer").appendChild(svg);
        */

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

        const ID = ("svg_" + file).replace(/\W/g, "");
        d3.select("#svgContainer")
          .append("svg")
          .attr("class", "xmlsvg")
          .attr("width", SVG_WIDTH)
          .attr("height", SVG_HEIGHT)
          .attr("viewBox", viewboxStr) // Basically lets us define our bounds
          .attr("id", ID); // Strip non-alphanumeric characters, else d3's select() fails to work

        outputTrajectories(trajectories, ID);
        console.debug("Displayed trajectories.");
      });
  });
}

// Returns a [min x, min y, max x, max y] bounding box corresponding to the passed-in trajectories
function getBoundingBoxForTrajectories(trajectories) {
  let output = [0, 0, 0, 0];
  trajectories.contours.forEach((contour) => {
    // Min X Check
    if (contour[0] < output[0]) {
      output[0] = contour[0];
    }
    if (contour[2] < output[0]) {
      output[0] = contour[2];
    }

    // Max X Check
    if (contour[0] > output[2]) {
      output[2] = contour[0];
    }
    if (contour[2] > output[2]) {
      output[2] = contour[2];
    }

    // Min Y Check
    if (contour[1] < output[1]) {
      output[1] = contour[1];
    }
    if (contour[3] < output[1]) {
      output[1] = contour[3];
    }

    // Max Y Check
    if (contour[1] > output[3]) {
      output[3] = contour[1];
    }
    if (contour[3] > output[3]) {
      output[3] = contour[3];
    }
  });

  // TODO: Compare hatches as well, which theoretically aren't ever the max points, but it's important for theoretical completeness

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
const d3 = require("./d3.min.js");
function outputTrajectories(data, svg_id) {
  data.contours.forEach((line) => {
    d3.select("#" + svg_id).attr({
      visualViewport,
    });

    d3.select("#" + svg_id)
      .append("line")
      .attr("x1", line[0])
      .attr("y1", line[1])
      .attr("x2", line[2])
      .attr("y2", line[3])
      .attr("stroke", "#000000")
      .attr("stroke-width", 0.1);
  });

  // TODO: Plot hatches as well
}
