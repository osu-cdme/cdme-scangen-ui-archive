// This file handles backend file i/o
const fs = require("fs");
const glob = require("glob");
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
    SetupHDF5Export();
};

function SetupSCNImport() {
    const JSZip = require("jszip");
    const fs = require("fs");

    // We use handle() here because we want to use invoke() on the frontend so we can work with Promises
    ipc.handle("import-scn", (e) => {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(path.join(paths.GetUIPath(), "xml"))) {
                fs.mkdirSync(path.join(paths.GetUIPath(), "xml"));
            } else {
                // Wipe 'xml' directory
                fs.readdirSync(path.join(paths.GetUIPath(), "xml")).forEach((file) => {
                    fs.unlinkSync(path.join(paths.GetUIPath(), "xml", file));
                });
            }
            dialog
                .showOpenDialog({
                    title: "Select .SCN File",
                    filters: [{ name: ".SCN File", extensions: ["scn"] }],
                })
                .then((fileSelection) => {
                    // Verify they didn't cancel
                    if (fileSelection.canceled) {
                        return reject(); // By personal convention, empty reject means we shouldn't alert user
                    }

                    // Unzip, wipe `xml` dir, then copy all files over
                    const filePath = fileSelection.filePaths[0];
                    fs.readFile(filePath, async (err, data) => {
                        if (err) {
                            return reject(new Error("Unable to read file."));
                        }

                        // Load zip (that we already verified existed before wiping)
                        await JSZip.loadAsync(data).then((zip) => {
                            const keys = Object.keys(zip.files);
                            if (!keys.length) {
                                return reject("ERROR: Tried to import empty .SCN file!");
                            }
                            let promises = [];
                            keys.forEach((key) => {
                                promises.push(
                                    new Promise(async (resolve, reject) => {
                                        const data = await zip.files[key].async("string");
                                        console.log("Writing file: " + key);
                                        let layerNum = parseInt(key.match(/\d+.xml/)[0].match(/\d+/)[0]);
                                        fs.writeFileSync(path.join(paths.GetUIPath(), "xml", layerNum + ".xml"), data);
                                        resolve();
                                    })
                                );
                            });

                            // Have to do some weird promises stuff to make sure we don't return before all the async operations are done
                            Promise.all(promises)
                                .then(() => {
                                    return resolve("SCN file successfully imported!");
                                })
                                .catch((err) => {
                                    return reject(err);
                                });
                        });
                    });
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
                const filePath = fileSelection.filePaths[0];
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        e.reply("alert", `Error reading file at ${filePath}: ${err}`);
                        return;
                    }

                    // Extract file name from file path
                    const fileName = filePath.split("\\").pop(filePath);

                    // Copy stl file over to main project
                    fs.writeFileSync(path.join(paths.GetBackendPath(), "geometry", fileName), data);
                    e.reply("alert", "STL file successfully imported!");
                });
            });
    });
}

function SetupHDF5Export() {}

function SetupSCNExport() {
    const JSZip = require("jszip");
    const fs = require("fs");
    ipc.on("export-scn", (e) => {
        dialog
            .showSaveDialog({
                title: "Specify .SCN file location and name.",
                filters: [{ name: ".scn File", extensions: ["scn"] }],
                defaultPath: "build",
            })
            .then((fileSelection) => {
                if (fileSelection.canceled) return;
                const filePath = fileSelection.filePath;
                // 1: zip up everything in the LayerFiles directory
                const zip = new JSZip();
                console.debug("Adding files to .zip.");

                const files = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
                if (!files.length) {
                    e.reply("alert", "ERROR: No layers to export! Please generate or import them first.");
                    return;
                }
                files.forEach((file) => {
                    const data = fs.readFileSync(file);
                    zip.file(path.basename(file), data);
                });

                // 2: Actually save it
                zip.generateNodeStream({ type: "nodebuffer", streamFiles: true })
                    .pipe(fs.createWriteStream(filePath))
                    .on("finish", function () {
                        console.log("SCN file written.");
                        e.reply("alert", "SCN file successfully exported!");
                    })
                    .on("error", (err) => {
                        throw err;
                    });
            });
    });
}
