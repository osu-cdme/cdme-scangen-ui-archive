const { ExportXML } = require("alsam-xml");
const { getCurrentBuild, getCurrentPath, getSegmentsFromBuild } = require("../../Build");
const { fs } = require("../../imports");

document.getElementById("saveLayer").addEventListener("click", SaveChangesToLayer);
function SaveChangesToLayer() {
    const build = getCurrentBuild();

    // Verify all velocity profiles on segment styles exist
    // TODO: Probably belongs better in ExportXML
    const VelocityProfileIDs = new Set(build.velocityProfiles.map((profile) => profile.id));
    for (const segmentStyle of build.segmentStyles) {
        if (!VelocityProfileIDs.has(segmentStyle.velocityProfileID)) {
            const error = `Velocity Profile ${segmentStyle.velocityProfileID} does not exist`;
            alert(error);
            throw new Error(error);
        }
    }

    // Verify all Segment Styles on segments exist
    // TODO: Probably belongs better in ExportXML
    const SegmentStyleIDs = new Set(build.segmentStyles.map((segmentStyle) => segmentStyle.id));
    for (const segment of getSegmentsFromBuild(build)) {
        if (!SegmentStyleIDs.has(segment.segStyle)) {
            const error =
                "Segment style " + segment.segStyle + " not found! Please either remove it from the segment or add it to the segment styles list.";
            alert(error);
            throw new Error(error);
        }
    }

    console.log("Exporting this build: ", build);
    const text = ExportXML(build);
    console.log("text: ", text);
    console.log("Saving to this file: ", getCurrentPath());
    fs.writeFile(getCurrentPath(), text, (err) => {
        if (err) {
            alert("An error ocurred creating the file: " + err);
        }
        alert("Saved successfully!");
    });
}
