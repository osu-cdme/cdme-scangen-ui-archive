const { getCurrentBuild } = require("../../Build");
const { SegmentStyles } = require("../../SegmentStyles.js");
const { VelocityProfiles } = require("../../VelocityProfiles.js");

// Manages the HTML; these modify the Build object as well
const build = getCurrentBuild();
console.log("build: ", build);
const segmentStyles = new SegmentStyles(build);
module.exports.segmentStyles = segmentStyles;
const velocityProfiles = new VelocityProfiles(build);
module.exports.velocityProfiles = velocityProfiles;
