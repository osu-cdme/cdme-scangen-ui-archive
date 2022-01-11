const ipc = require('electron').ipcRenderer;

// Imports
document.getElementById('stlImport').addEventListener('click', (e) => {
  e.preventDefault();
  ipc.send('import-stl');
  console.log('Sent import-stl signal to main process.');
});

document.getElementById('scnImport').addEventListener('click', (e) => {
  e.preventDefault();
  ipc.send('import-scn');
  console.log('Sent import-scn signal to main process.');
});

// Exports
document.getElementById('scnExport').addEventListener('click', (e) => {
  e.preventDefault();
  ipc.send('export-scn');
  console.log('Sent export-scn signal to main process..');
});

// Generic feedback handler that takes message from `main` process and displays it in the UI
ipc.on('alert', (e, arg) => {
  window.alert(arg);
});
