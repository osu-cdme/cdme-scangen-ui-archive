const { ExportXML } = require('alsam-xml');
const { getCurrentBuild, getCurrentPath } = require('../common');
const { fs } = require('../common');

function SaveChangesToLayer () {
  const text = ExportXML(getCurrentBuild());
  fs.writeFile(getCurrentPath(), text, err => {
    if (err) throw new Error('Error writing file: ' + err);
    alert('Successfully saved changes to layer!');
  });
}
