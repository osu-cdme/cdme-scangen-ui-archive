// PURPOSE: Handle everything about the Layer List

const natsort = require("natsort").default;
const { path, paths, d3, getLayerFromFilePath } = require("../../common");
const { drawBuild } = require("../drawing");
const { getBuildFromFilePath, setCurrentBuild, setCurrentPath } = require("../../common");

const glob = require("glob");
module.exports.RenderLayerList = () => {
    return new Promise((resolve) => {
        const files = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml")).sort(natsort());
        let numDrawn = 0;
        files.forEach(async (file) => {
            const filePath = file;

            const layerNum = getLayerFromFilePath(file);
            const li = d3.select("#layerList").append("li");

            li.append("img")
                .attr("src", path.join(paths.GetUIPath(), "xml", `${layerNum}.png`))
                .attr("width", 30)
                .attr("height", 30);

            if (layerNum === 1) {
                li.classed("selectedLayer", true);
            }

            li.append("p")
                .text("Layer " + layerNum) // Extract only the number from the file name
                .on("click", async (e) => {
                    wipeSelectedLayers();
                    li.classed("selectedLayer", true);
                    e.preventDefault();
                    const layerNum = getLayerFromFilePath(filePath);
                    const build = await getBuildFromFilePath(layerNum, true);
                    setCurrentBuild(build);
                    setCurrentPath(filePath);
                    drawBuild(build, "mainsvg");
                });

            // Update loading screen based on how far in we are
            numDrawn++;
            const progress = Math.floor((numDrawn / files.length) * 100);
            document.getElementById("loading").textContent = `Loading. Please wait a sec... (Progress: ${progress}%)`;
            if (numDrawn === files.length) {
                resolve();
            }
        });
    });
};

function wipeSelectedLayers() {
    d3.select("#layerList")
        .selectAll("li")
        .each(function () {
            d3.select(this).classed("selectedLayer", false);
        });
}
