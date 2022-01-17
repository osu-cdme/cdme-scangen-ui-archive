const path = require('path');
/*
const { app } = require("electron");
const { BrowserWindow } = require("@electron/remote/main");
*/

require('@electron/remote/main').initialize();
const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,

    // Note that nodeIntegration is very hacky, but we won't be interfacing with external
    // websites so it's not a security concern for us
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    }
  });

  win.loadFile('src/renderer/view/view.html');
  win.maximize();
  win.webContents.openDevTools();
}

// Makes it so hitting the "X" button actually quits the process (...usually)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(() => {
  createWindow();
});

const ipc = require('electron').ipcMain;
const paths = require('./src/main/paths.js');
ipc.on('get-ui-path', (event) => {
  event.returnValue = paths.GetUIPath();
});

ipc.on('get-backend-path', (event) => {
  event.returnValue = paths.GetBackendPath();
});

// Implements IPC signals and functionality for Imports/Exports
require('./src/main/io.js').Setup();
