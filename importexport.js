const ipc = require("electron").ipcRenderer;

// Project file path access
const path = require("path");
const building = false;
const pathToResources = building
    ? path.join(__dirname, "../")
    : path.join(__dirname, "../cdme-scangen/");

// Imports
document.getElementById("stlImport").addEventListener("click", (e) => {
    e.preventDefault();
});

// Exports
document.getElementById("scnExport").addEventListener("click", (e) => {
    e.preventDefault();
    ipc.send("export-scn");
    console.log("Sent export-scn signal to main process..");
});

document.getElementById("scnImport").addEventListener("click", (e) => {
    e.preventDefault();
    ipc.send("import-scn");
    console.log("Sent import-scn signal to main process.");
});
