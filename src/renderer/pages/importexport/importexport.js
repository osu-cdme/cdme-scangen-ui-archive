const ipc = require("electron").ipcRenderer;
const { cacheBuilds, cacheThumbnails, cache } = require("../../caching");
const { fs, path, paths } = require("../../imports");
const { getLayerFromFilePath } = require("../../Build");

// Imports
document.getElementById("stlImport").addEventListener("click", (e) => {
    e.preventDefault();
    ipc.send("import-stl");
    console.log("Sent import-stl signal to main process.");
});

document.getElementById("scnImport").addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("Sending import-scn signal to main process.");
    const result = await ipc.invoke("import-scn"); // Promise that we explicitly wait for a response for
    console.log("Result: ", result);
    if (!result) {
        alert("Error importing .SCN file!");
        throw new Error("Error importing .SCN file!");
    }

    // TODO: Essentially duplicate code of generate.html; source them from one place
    let numDone = 0;
    const glob = require("glob");
    const xmlFiles = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
    for (const file of xmlFiles) {
        cache(getLayerFromFilePath(file)).then(() => {
            numDone++;

            // General case
            if (numDone < xmlFiles.length) {
                document.getElementById("progressText").textContent = `Caching Thumbnails & 'Build' Objects (${numDone}/${xmlFiles.length})`;
            }

            // All done
            else {
                alert('Successfully imported! Files can now be viewed under the "View Vectors" tab.');
                document.getElementById("progressText").textContent = "Importing complete!";
            }
        });
    }
});

// Exports
document.getElementById("scnExport").addEventListener("click", (e) => {
    e.preventDefault();
    ipc.send("export-scn");
    console.log("Sent export-scn signal to main process..");
});

// Generic feedback handler that takes message from `main` process and displays it in the UI
ipc.on("alert", (e, arg) => {
    window.alert(arg);
});
