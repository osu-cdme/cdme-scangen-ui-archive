const { getCurrentBuild } = require("../../Build");
const { SegmentStyles } = require("../../SegmentStyles.js");
const { VelocityProfiles } = require("../../VelocityProfiles.js");

// Manages the HTML; these modify the Build object as well
const initialBuild = getCurrentBuild();
let segmentStyles = new SegmentStyles(initialBuild);
let velocityProfiles = new VelocityProfiles(initialBuild);

// These functions re-link the segment style/velocity profile display to a new build
exports.refreshSegmentStyles = (build) => {
    segmentStyles = new SegmentStyles(build);
};
exports.refreshVelocityProfiles = (build) => {
    velocityProfiles = new VelocityProfiles(build);
};
