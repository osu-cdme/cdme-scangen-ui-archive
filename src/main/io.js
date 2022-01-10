// This file handles backend file i/o
const fs = require("fs");
const path = require("path");
const paths = require("./paths");
const ipc = require("electron").ipcMain;
const dialog = require("electron").dialog;

module.exports.Setup = () => {
    // Imports
    SetupSCNImport();
    SetupSTLImport();

    // Exports
    SetupSCNExport();
};

function SetupSCNImport() {
    var JSZip = require("jszip");
    var fs = require("fs");
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
                    if (err) {
                        e.reply("alert", `Error importing .SCN file from ${filePath}: ${err}`);
                        return;
                    }

                    // Wipe Directory
                    console.log("Reading directory " + path.join(paths.GetUIPath(), "xml"));
                    let files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
                    files.forEach((file) => {
                        fs.unlinkSync(path.join(paths.GetUIPath(), "xml", file));
                    });

                    // Load zip (that we already verified existed before wiping)
                    JSZip.loadAsync(data).then((zip) => {
                        let keys = Object.keys(zip.files);
                        keys.forEach((key) => {
                            zip.files[key].async("string").then((data) => {
                                fs.writeFileSync(path.join(paths.GetUIPath(), "xml", key), data);
                            });
                        });
                    });
                    e.reply("alert", "SCN file successfully imported!");
                });
            });
    });
}

function SetupSTLImport() {
    ipc.on("import-stl", (e) => {
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
                    if (err) {
                        e.reply("alert", `Error reading file at ${filePath}: ${err}`);
                        return;
                    }

                    // Extract file name from file path
                    let fileName = filePath.split("\\").pop(filePath);

                    // Copy stl file over to main project
                    fs.writeFileSync(path.join(paths.GetBackendPath(), "geometry", fileName), data);
                    e.reply("alert", "STL file successfully imported!");
                });
            });
    });
}

function SetupSCNExport() {
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
                let files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
                files.forEach((file) => {
                    let data = fs.readFileSync(path.join(paths.GetUIPath(), "xml", file));
                    zip.file(file, data);
                });

                // 2: Actually save it
                zip.generateNodeStream({ type: "nodebuffer", streamFiles: true })
                    .pipe(fs.createWriteStream(filePath))
                    .on("finish", function () {
                        console.log("SCN file written.");
                        e.reply("alert", "SCN file successfully exported!");
                    })
                    .on("error", alert(err));
            });
    });
}
