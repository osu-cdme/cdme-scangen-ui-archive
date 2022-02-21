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
    document.getElementById("progressText").textContent = `Unzipping & Copying. Wait a moment...`;
    document.getElementById("done").style.width = `0%`;
    const result = await ipc.invoke("import-scn").catch((errMsg) => {
        if (!err) return;
        alert(errMsg);
    });
    if (result === undefined) return;

    let numDone = 0;
    const glob = require("glob");
    const xmlFiles = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
    for (const file of xmlFiles) {
        cache(getLayerFromFilePath(file)).then(() => {
            numDone++;

            // General case
            if (numDone < xmlFiles.length) {
                document.getElementById("progressText").textContent = `Caching Thumbnails & 'Build' Objects (${numDone}/${xmlFiles.length})`;
                document.getElementById("done").style.width = `${(numDone / xmlFiles.length) * 100}%`;
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

document.getElementById("hdf5Export").addEventListener("click", (e) => {
    e.preventDefault();
    ipc.send("export-hdf5");
    console.log("Sent export-hdf5 signal to main process..");
});

// Generic feedback handler that takes message from `main` process and displays it in the UI
ipc.on("alert", (e, arg) => {
    window.alert(arg);
});

const progressTextElem = document.getElementById("progressText");
const doneElem = document.getElementById("done");
const tqdmRegex = /(.*): *(\d+%).*(\d+\/\d+) +\[(\d+:\d+)<(\d+:\d+), +(\d+.\d+.*\/s)\]/;
ipc.on("progress", (e, arg) => {
    if (!progressText) {
        const msg = "Progress reported, but no display element found!";
        alert(msg);
        throw new Error(msg);
    }

    const match = arg.match(tqdmRegex);
    if (match) {
        const label = match[1];
        const percent = match[2];
        const count = match[3]; // Only the percent and label are really "necessary" - these are still available for easy addition in the future
        const elapsed = match[4];
        const left = match[5];
        const rate = match[6];
        progressTextElem.textContent = `${label}: ${percent} (${elapsed} elapsed, ${left} left, ${rate})`;
        doneElem.style.width = percent;
    }
});
