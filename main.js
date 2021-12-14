const path = require("path");
const building = false;
const pathToResources = building
    ? path.join(__dirname, "../")
    : path.join(__dirname, "../cdme-scangen/");

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
            files.forEach((file) => {
                let data = fs.readFileSync(path.join(__dirname, "xml", file));
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

ipc.on("import-scn", (e) => {
    dialog
        .showOpenDialog({
            title: "Select .SCN File",
            filters: [{ name: ".SCN File", extensions: ["scn"] }],
        })
        .then((fileSelection) => {
            // Verify they didn't cancel
            if (fileSelection.canceled) return;

            // Unzip, wipe `xml` dir, then copy all files over
            let filePath = fileSelection.filePaths[0];
            fs.readFile(filePath, (err, data) => {
                if (err) console.error("Error: " + err);

                // Wipe Directory
                let files = fs.readdirSync(path.join(__dirname, "xml"));
                files.forEach((file) => {
                    fs.unlinkSync(path.join(__dirname, "xml", file));
                });

                // Load zip (that we already verified existed before wiping)
                JSZip.loadAsync(data).then((zip) => {
                    let keys = Object.keys(zip.files);
                    keys.forEach((key) => {
                        zip.files[key].async("string").then((data) => {
                            fs.writeFileSync(
                                path.join(__dirname, "xml", key),
                                data
                            );
                        });
                    });
                });
            });
        });
});

ipc.on("import-stl", (e) => {
    // Import STL file
    dialog
        .showOpenDialog({
            title: "Select .STL File",
            filters: [{ name: ".STL File", extensions: ["stl"] }],
        })
        .then((fileSelection) => {
            // Verify they didn't cancel
            if (fileSelection.canceled) return;

            // Read file
            let filePath = fileSelection.filePaths[0];
            fs.readFile(filePath, (err, data) => {
                if (err) console.error("Error: " + err);
                console.debug("Copying over STL file at path " + filePath);

                // Extract file name from file path
                let fileName = filePath.split("\\").pop(filePath);
                console.debug("Extracted file name " + fileName);

                // Copy stl file over to main project
                console.debug(
                    "Writing file to " +
                        path.join(pathToResources, "geometry", fileName)
                );
                fs.writeFileSync(
                    path.join(pathToResources, "geometry", fileName),
                    data
                );
            });
        });
});
