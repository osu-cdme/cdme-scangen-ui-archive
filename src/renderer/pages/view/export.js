const { ExportXML } = require("alsam-xml");
const { getCurrentBuild, getCurrentPath } = require("../../Build");
const { cache } = require("../../caching");
const { fs } = require("../../imports");

document.getElementById("saveLayer").addEventListener("click", SaveChangesToLayer);
async function SaveChangesToLayer() {
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
    for (const segment of build.segments) {
        if (!SegmentStyleIDs.has(segment.segStyle)) {
            const error =
                "Segment style " + segment.segStyle + " not found! Please either remove it from the segment or add it to the segment styles list.";
            alert(error);
            throw new Error(error);
        }
    }

    console.log("Exporting this build: ", build);
    const text = ExportXML(build);
    fs.writeFile(getCurrentPath(), text, (err) => {
        if (err) {
            alert("An error ocurred creating the file: " + err);
        }
        alert("Saved successfully!");
    });

    // As we changed the .XML file, we have to regenerate thumbnails and the cached 'Build' object
    await cache(build.header.layerNum, build);
}
