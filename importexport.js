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

document.getElementById("scnImport").addEventListener("click", (e) => {
    e.preventDefault();
});

// Exports
document.getElementById("scnExport").addEventListener("click", (e) => {
    // Puts everything into a .zip and renames it .scn
    ipc.send("export-scn");
    console.log("Sent ipc signal to main.");
});
