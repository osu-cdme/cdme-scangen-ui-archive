const path = require("path");
const paths = require("../../paths");
const fs = require("fs");
const clone = require("just-clone");

const { ExportXML } = require("alsam-xml");
const { getSegmentsFromBuild } = require("../../common.js");

/* MAIN FUNCTION WE'LL INTERFACE WITH
    Param 1: Build object representing this layer. 
    Param 2: 'vectors': List of Integer indices of vectors from this layer we want to tweak.
    Param 3: 'multipliers': List of multipliers, of same cardinality as getSegmentsFromBuild(), that we want to multiply by. 

    I think retaining segment style ids across the optimization process isn't worth it. We will only use this to make automated changes, then run it on the model again; we don't need to keep it human-readable or make it easy to change a segment style that targets additional vectors. 
*/
function optimize(build, vectors, multipliers) {
    // Caching existing segment style ids makes checking for duplicates much faster
    const segmentStyleIDs = new Set();
    build.segmentStyles.forEach((segmentStyle) => {
        segmentStyleIDs.add(segmentStyle.id);
    });

    // Tweak segments
    const segments = getSegmentsFromBuild(build);
    for (const index in vectors) {
        // Retrieve segment
        const segment = segments[vectors[index]]; // Actual segment we're modifying

        // Generate new ID
        const newStyle = clone(build.segmentStyles.find((segmentStyle) => segmentStyle.id === segment.segStyle));
        newStyle.power *= multipliers[index];
        newStyle.id = FindUnusedSegmentStyleID(build);

        // Actually "commit" changes to the build
        segment.segStyle = newStyle.id;
        build.segmentStyles.push(newStyle);
    }

    // Reexport to corresponding xml file
    const xml = ExportXML(build);
    fs.writeFileSync(path.join(paths.GetUIPath(), "xml", build.layerNum + ".xml"), xml);
}
exports.optimize = optimize;

// For speed probably best to do random numbers; for debugging probably best to do sequential numbers
function FindUnusedSegmentStyleID(build) {
    let segmentStyleID = "optimization-" + Math.floor(Math.random() * 10000000);
    while (build.segmentStyles.find((segmentStyle) => segmentStyle.id === segmentStyleID)) {
        segmentStyleID = "optimization-" + Math.floor(Math.random() * 10000000);
    }
    return segmentStyleID;
}
