const path = require("path");

/* 
const { app } = require("electron");
const { BrowserWindow } = require("@electron/remote/main");


*/

require("@electron/remote/main").initialize();
const { app, BrowserWindow, BrowserView, ipcMain } = require("electron");

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,

        // Note that nodeIntegration is very hacky, but we won't be interfacing with external
        // websites so it's not a security concern for us
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true,
        },
    });

    win.loadFile("importexport.html");
    win.maximize();
    win.webContents.openDevTools();
}

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

app.whenReady().then(() => {
    createWindow();
});

const ipc = require("electron").ipcMain;
const dialog = require("electron").dialog;

// Handle file selection dialog for Export .SCN
var JSZip = require("jszip");
var fs = require("fs");
var FileSaver = require("file-saver");
ipc.on("export-scn", (e) => {
    dialog
        .showSaveDialog({
            title: "Specify .SCN file location and name.",
            filters: [{ name: ".scn File", extensions: ["scn"] }],
            defaultPath: "build",
        })
        .then((fileSelection) => {
            if (fileSelection.canceled) return;
            let filePath = fileSelection.filePath;
            // 1: zip up everything in the LayerFiles directory
            var zip = new JSZip();
            console.debug("Adding files to .zip.");
            let files = fs.readdirSync(path.join(__dirname, "xml"));
            console.log("files: ", files);
            files.forEach((file) => {
                console.log(
                    "Reading file " + path.join(__dirname, "xml", file)
                );
                let data = fs.readFileSync(path.join(__dirname, "xml", file));
                console.log(
                    "Writing data for file " + path.join(__dirname, "xml", file)
                );
                zip.file(file, data);
            });

            // 2: Actually save it
            console.debug("Saving .scn file at ", filePath);
            zip.generateNodeStream({ type: "nodebuffer", streamFiles: true })
                .pipe(fs.createWriteStream(filePath))
                .on("finish", function () {
                    console.log("SCN file written.");
                });
        });
});
