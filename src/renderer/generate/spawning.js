// Functionality to spawn the pyslm child process and interface correctly with it
const pythonPath = path.join(paths.GetUIPath(), "python", "python.exe");
const FOLDERS_TO_ADD_TO_PYTHONPATH = [
    paths.GetBackendPath(),
    path.join(paths.GetBackendPath(), "pyslm"),
    path.join(paths.GetBackendPath(), "pyslm", "pyslm"),
];

const currentTaskElem = document.getElementById("currentTask");
const currentProgressElem = document.getElementById("currentProgress");
currentTaskElem.textContent = "Waiting for user input.";
function parseStderr(chunkBuf) {
    const chunkStr = chunkBuf.toString("utf8");
    const regex = /(\d+(\.\d+)?%)/g; // Matches a number and a percent
    console.log("stderr: " + chunkStr);
    if (chunkStr.includes("Processing Layers")) {
        const number = regex.exec(chunkStr)[0]; // Exec used rather than string.match() b/c exec only returns the first match by default
        console.log(number);
        if (number) {
            currentTaskElem.textContent = "Processing Layers";
            currentProgressElem.textContent = number;
        }
    } else if (chunkStr.includes("Generating Layer Plots")) {
        const number = regex.exec(chunkStr)[0];
        if (number) {
            currentTaskElem.textContent = "Generating Layer Plots";
            currentProgressElem.textContent = number;
        }
        if (number.includes("100")) {
            currentTaskElem.textContent = "Done.";
        }
    }
}

// Launch the application when they hit the button
const spawn = require("child_process").spawn;
document.getElementById("start").addEventListener("click", () => {
    currentTaskElem.textContent = "Spawning child process.";
    const formEl = document.forms.rightPart;
    const formData = new FormData(formEl);
    console.log("formData", formData);
    const fields = {};
    for (const key in optionsData) {
        for (const key2 in optionsData[key]) {
            fields[optionsData[key][key2].name] = formData.get(optionsData[key][key2].name);
        }
    }
    console.log("paths.GetBackendPath(): " + paths.GetBackendPath());
    console.log("Running script " + paths.GetBackendPath() + "main.py using interpreter " + pythonPath);

    const process = spawn(
        pythonPath,
        [
            "-u", // Don't buffer output, we want that live
            path.join(paths.GetBackendPath(), "main.py"),
            JSON.stringify(fields),
            JSON.stringify(FOLDERS_TO_ADD_TO_PYTHONPATH),
        ], // Serialize the data and feed it in as a command line argument],
        { cwd: paths.GetBackendPath() }
    ); // Python interpreter needs run from the other directory b/c relative paths
    process.stdout.on("data", (chunk) => {
        console.log("stdout: " + chunk);
    });
    process.stderr.on("data", (chunk) => {
        parseStderr(chunk);
    });
    process.on("close", (code) => {
        console.log("child process exited with code " + code);

        // Wipe all files currently in 'xml' directory, getting rid of whatever build was previously in there (if any)
        const fs = require("fs");
        const path = require("path");
        const xmlFiles = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
        xmlFiles.forEach((file) => {
            fs.unlinkSync(path.join(paths.GetUIPath(), "xml", file));
        });

        // Copy over the XML files produced by `cdme-scangen` to the directory read from by `cdme-scangen-ui`

        const files = fs.readdirSync(path.join(paths.GetBackendPath(), "XMLOutput"));
        files.forEach((file) => {
            fs.copyFileSync(path.join(paths.GetBackendPath(), "XMLOutput", file), path.join(paths.GetUIPath(), "xml", file));
        });
        alert('Build complete! Files can now be viewed under the "View Vectors" tab.');
    });
});
