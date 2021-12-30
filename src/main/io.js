// This file handles backend file i/o

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
                    let files = fs.readdirSync(path.join(__dirname, "xml"));
                    files.forEach((file) => {
                        fs.unlinkSync(path.join(__dirname, "xml", file));
                    });

                    // Load zip (that we already verified existed before wiping)
                    JSZip.loadAsync(data).then((zip) => {
                        let keys = Object.keys(zip.files);
                        keys.forEach((key) => {
                            zip.files[key].async("string").then((data) => {
                                fs.writeFileSync(path.join(__dirname, "xml", key), data);
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
                    console.debug("Copying over STL file at path " + filePath);

                    // Extract file name from file path
                    let fileName = filePath.split("\\").pop(filePath);
                    console.debug("Extracted file name " + fileName);

                    // Copy stl file over to main project
                    console.debug("Writing file to " + path.join(pathToResources, "geometry", fileName));
                    fs.writeFileSync(path.join(pathToResources, "geometry", fileName), data);
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
                e.reply("alert", "SCN file successfully exported!");
            });
    });
}
