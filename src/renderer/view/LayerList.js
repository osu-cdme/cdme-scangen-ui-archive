// PURPOSE: Handle everything about the Layer List

const natsort = require('natsort').default;
const { fs, path, paths, d3 } = require('../common');
const { drawBuild, drawBuildCanvas } = require('./drawing');
const { getBuildFromFilePath, setCurrentBuild, setCurrentPath } = require('../common');

module.exports.RenderLayerList = () => {
  return new Promise((resolve, reject) => {
    const files = fs.readdirSync(path.join(paths.GetUIPath(), 'xml')).sort(natsort());
    let numDrawn = 0;
    files.forEach(async file => {
      const filePath = path.join(paths.GetUIPath(), 'xml', file);
      const layerNum = parseInt(file.match(/(\d+)/)[0]); // First part finds the number, second part trims zeroes

      const li = d3.select('#layerList').append('li');

      li.append('canvas')
        .attr('id', 'canvas_' + layerNum)
        .attr('width', 50)
        .attr('height', 50);
      const build = await getBuildFromFilePath(filePath);
      drawBuildCanvas(build, 'canvas_' + layerNum);

      if (layerNum === 1) {
        li.classed('selectedLayer', true);
      }

      li.append('p')
        .text('Layer ' + layerNum) // Extract only the number from the file name
        .on('click', async e => {
          wipeSelectedLayers();
          li.classed('selectedLayer', true);
          e.preventDefault();
          const build = await getBuildFromFilePath(filePath);
          setCurrentBuild(build);
          setCurrentPath(filePath);
          drawBuild(build, 'mainsvg');
        });

      // Update loading screen based on how far in we are
      numDrawn++;
      const progress = Math.floor(numDrawn / files.length * 100);
      document.getElementById('loading').textContent = `Loading. Please wait a sec... (Progress: ${progress}%)`;
      if (numDrawn === files.length) {
        resolve();
      }
    });
  });
};

function wipeSelectedLayers () {
  d3.select('#layerList').selectAll('li').each(function () {
    d3.select(this).classed('selectedLayer', false);
  });
}
