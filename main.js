const path = require("path");

/*
const { app } = require("electron");
const { BrowserWindow } = require("@electron/remote/main");
*/

require("@electron/remote/main").initialize();
const { app, BrowserWindow } = require("electron");

// See https://stackoverflow.com/q/60106922/6402548 for the error I was running into; this line fixes it
app.allowRendererProcessReuse = false;

const ipc = require("electron").ipcMain;
const paths = require("./src/main/paths.js");
ipc.on("get-ui-path", (event) => {
    event.returnValue = paths.GetUIPath();
});

ipc.on("get-backend-path", (event) => {
    event.returnValue = paths.GetBackendPath();
});

// Implements IPC signals and functionality for Imports/Exports
require("./src/main/io.js").Setup();

function createWindow() {
    const win = new BrowserWindow({
        icon: "/static/logo.jpg",
        width: 800,
        height: 600,

        // Note that nodeIntegration is very hacky, but we aren't working with confidential data or anything like that
        // so there's nothing anyone really gains from trying to exploit any security issues
        // It also opens the door for us to do file system operations and stuff in the browser, which is nice
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true,
        },
    });

    win.loadFile("src/renderer/view/view.html");
    win.maximize();
    win.webContents.openDevTools();
}

// Makes it so hitting the "X" button actually quits the process (...usually)
app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

app.whenReady().then(() => {
    createWindow();
});
