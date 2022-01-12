// Functionality to spawn the pyslm child process and interface correctly with it
const { path, paths } = require('../common');
const pythonPath = path.join(paths.GetUIPath(), 'python', 'python.exe');
const FOLDERS_TO_ADD_TO_PYTHONPATH = [
  paths.GetBackendPath(),
  path.join(paths.GetBackendPath(), 'pyslm'),
  path.join(paths.GetBackendPath(), 'pyslm', 'pyslm')
];
const optionsData = require('./optionsdata');

const getFractionRegex = /\d+\/\d+/g;
let lastLayer;
function parseStderr (chunkBuf) {
  const chunkStr = chunkBuf.toString('utf8');
  const regex = /(\d+(\.\d+)?%)/g; // Matches a number and a percent
  // console.log("stderr: " + chunkStr);
  if (chunkStr.includes('Processing Layers')) {
    const fraction = chunkStr.match(getFractionRegex)[0];
    lastLayer = parseInt(fraction.match(/\d+/g)[1]);
    const number = regex.exec(chunkStr)[0]; // Exec used rather than string.match() b/c exec only returns the first match by default
    if (number) {
      if (number.includes('100')) {
        document.getElementById('progressText').textContent = 'Done!';
      } else {
        document.getElementById('done').style.width = number;
        document.getElementById('progressText').textContent = `(1/2) Processing Layers (${number})`;
      }
    }
  }
}

const finishRegex = /XML Layer # \d+ Complete/g;
const numberRegex = /\d+/g;
function parseStdout (chunkBuf) {
  const chunkStr = chunkBuf.toString('utf8');
  // console.log("chunkStr: " + chunkStr);

  if (chunkStr.includes('XML Layer')) {
    if (chunkStr.match(finishRegex)) {
      const finishText = chunkStr.match(finishRegex)[0];
      const number = finishText.match(numberRegex)[0];
      document.getElementById('done').style.width = (number / lastLayer) * 100 + '%';
      document.getElementById('progressText').textContent = `(2/2) Generating XML Files (${number}/${lastLayer})`;
    }
  }
}

// Launch the application when they hit the button
const spawn = require('child_process').spawn;
function spawnProcess (styles, profiles, defaults) {
  // console.log("styles: ", styles);
  // console.log("profiles: ", profiles);
  document.getElementById('progressText').textContent = 'Spawning child process.';
  const formEl = document.forms.rightPart;
  const formData = new FormData(formEl);
  const fields = {};
  for (const key in optionsData) {
    for (const key2 in optionsData[key]) {
      fields[optionsData[key][key2].name] = formData.get(optionsData[key][key2].name);
    }
  }
  fields['Hatch Default ID'] = defaults.hatchID;
  fields['Contour Default ID'] = defaults.contourID;
  fields['Segment Styles'] = styles;
  fields['Velocity Profiles'] = profiles;

  console.log('Passing as first cmd line parameter: ', fields);
  console.log('Passing as second cmd line parameter: ', FOLDERS_TO_ADD_TO_PYTHONPATH);
  console.log('Running script ' + path.join(paths.GetBackendPath(), 'main.py') + ' using interpreter ' + pythonPath);

  const process = spawn(
    pythonPath,
    [
      '-u', // Don't buffer output, we want that live
      path.join(paths.GetBackendPath(), 'main.py'),
      JSON.stringify(fields),
      JSON.stringify(FOLDERS_TO_ADD_TO_PYTHONPATH)
    ], // Serialize the data and feed it in as a command line argument],
    { cwd: paths.GetBackendPath() }
  ); // Python interpreter needs run from the other directory b/c relative paths
  process.stdout.on('data', (chunk) => {
    parseStdout(chunk);
  });
  process.stderr.on('data', (chunk) => {
    parseStderr(chunk);
  });
  process.on('close', (code) => {
    console.log('Child process exited with code ' + code + '.');
    if (code !== 0) {
      alert(
        'Build process did not work correctly! Please send the .STL file you were using and screenshots of your generation settings to the developers of this application.'
      );
      document.getElementById('progressText').textContent = 'Error spawning child process.';
      document.getElementById('done').style.width = '0%';
    }

    // Wipe all files currently in 'xml' directory, getting rid of whatever build was previously in there (if any)
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(path.join(paths.GetUIPath(), 'xml'))) {
      fs.mkdirSync(path.join(paths.GetUIPath(), 'xml'));
    }
    const xmlFiles = fs.readdirSync(path.join(paths.GetUIPath(), 'xml'));
    xmlFiles.forEach((file) => {
      fs.unlinkSync(path.join(paths.GetUIPath(), 'xml', file));
    });

    // Copy over the XML files produced by `cdme-scangen` to the directory read from by `cdme-scangen-ui`
    const files = fs.readdirSync(path.join(paths.GetBackendPath(), 'XMLOutput'));
    files.forEach((file) => {
      if (file.includes('.xml')) {
        // Ignore the .SCN file
        fs.copyFileSync(path.join(paths.GetBackendPath(), 'XMLOutput', file), path.join(paths.GetUIPath(), 'xml', file));
      }
    });
    alert('Build complete! Files can now be viewed under the "View Vectors" tab.');
  });
}
exports.spawnProcess = spawnProcess;
