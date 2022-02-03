const ipc = require("electron").ipcRenderer;
const { cacheBuilds, cacheThumbnails } = require("../common");

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
    await cacheBuilds(false);
    await cacheThumbnails(false);
    alert("Successfully Imported!");
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
