// Generator which returns segment by segment
function * getSegmentsFromBuild (build) {
  console.log('getSegmentsFromBuild given this input: ', build);
  for (const trajectory of build.trajectories) {
    console.log('trajectory: ', trajectory);
    if (trajectory.paths === []) return;
    for (const path of trajectory.paths) {
      if (path.length === 0) return;
      for (const segment of path.segments) {
        yield segment;
      }
    }
  }
}
exports.getSegmentsFromBuild = getSegmentsFromBuild;

// Generator which returns only hatch segments
function * getHatchesFromBuild (build) {
  for (const segment of getSegmentsFromBuild(build)) {
    if (segment.type === 'hatch') yield segment;
  }
}
exports.getHatchesFromBuild = getHatchesFromBuild;

// Generator which returns only contour segments
function * getContoursFromBuild (build) {
  for (const segment of getSegmentsFromBuild(build)) {
    if (segment.type === 'contour') yield segment;
  }
}
exports.getContoursFromBuild = getContoursFromBuild;

// Generator which returns only jump segments
function * getJumpsFromBuild (build) {
  for (const segment of getSegmentsFromBuild(build)) {
    if (segment.type === 'jump') yield segment;
  }
}
exports.getJumpsFromBuild = getJumpsFromBuild;

const { LoadXML } = require('alsam-xml');
const fetch = require('node-fetch');
exports.getBuildFromFilePath = async function getBuildFromFilePath (filePath) {
  const response = await fetch(filePath);
  const text = await response.text();
  const build = LoadXML(text);

  // --------------------------------------------------------------------------------
  // Make some additions to the base alsam-xml.js structure, which simplifies some stuff
  // --------------------------------------------------------------------------------

  // 1. Add a segment type to each segment from { "hatch", "contour", "jump" }
  const SegmentIDType = (path, segmentStyleID) => {
    // console.log("path: ", path);
    // console.log("segmentStyleID: ", segmentStyleID);
    const segmentStyle = build.segmentStyles.find((segmentStyle) => {
      return segmentStyle.id === segmentStyleID;
    });
    // console.log("segmentStyle: ", segmentStyle);
    if (segmentStyle.travelers.length === 0) return 'jump';
    return path.type === 'contour' ? 'contour' : 'hatch';
  };
  build.trajectories.forEach((trajectory) => {
    if (trajectory.paths === []) return;
    trajectory.paths.forEach((path) => {
      if (path.segments.length === 0) return; // Likely never true, but worth checking
      path.segments.forEach((segment) => {
        segment.type = SegmentIDType(path, segment.segStyle);
      });
    });
  });

  // 2. Add numbering into our data structure, which lets us do lookups to match HTML segments to data structure segments
  let num = 0;
  for (const segment of getSegmentsFromBuild(build)) {
    segment.number = num;
    num++;
  }

  return build;
};
