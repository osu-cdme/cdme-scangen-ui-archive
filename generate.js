// Some small stuff needs changed based on whether we're testing or building; it all switches off of one variable
const building = false; // Set to true if about to build the application; modifies some file paths to work with the new config
const ipc = require("electron").ipcRenderer;

// Packaging puts us in a folder inside the resources directory
// Whereas not packaging leaves us in the current directory
const path = require("path");
const pathToResources = building ? path.join(__dirname, "../") : path.join(__dirname, "../cdme-scangen/");
const pythonPath = building ? path.join(__dirname, "../python/python.exe") : path.join(__dirname, "python/python.exe"); // absolute paths needed (for some reason)
const FOLDERS_TO_ADD_TO_PYTHONPATH = [
    building ? path.join(__dirname, "../pyslm/") : path.join(__dirname, "../cdme-scangen/pyslm"), // pyslm
    building ? path.join(__dirname, "../") : path.join(__dirname, "../cdme-scangen/"), // src (custom scan paths)
    building ? path.join(__dirname, "../pyslm/pyslm") : path.join(__dirname, "../cdme-scangen/pyslm/pyslm"),
];

console.log(FOLDERS_TO_ADD_TO_PYTHONPATH);
console.log("PYTHONPATH: " + pythonPath);

console.log("Current working directory: " + __dirname);

// Load data; requires cdme-scangen repository to be in same folder as cdme-scangen-ui, for now
const optionsData = require(pathToResources + "schema.json");

// Remove the placeholder "waiting for data" text
const optionsDiv = document.getElementById("options");
while (optionsDiv.firstChild) {
    optionsDiv.removeChild(optionsDiv.firstChild);
}

for (const key in optionsData) {
    // Create section header
    const header = document.createElement("h2");
    header.textContent = key;
    header.classList.toggle("rightPartHeader");
    optionsDiv.appendChild(header);

    for (const key2 in optionsData[key]) {
        // Overall container we'll append at the end
        const div = document.createElement("div");
        div.classList.toggle("field"); // Inline formatting and other misc. stuff

        // Title
        const label = document.createElement("label");
        label.textContent = optionsData[key][key2].name;
        div.append(label);

        // Behavior from here depends on type
        if (optionsData[key][key2].type === "string") {
            if ("options" in optionsData[key][key2]) {
                const select = document.createElement("select");
                select.name = optionsData[key][key2].name;
                optionsData[key][key2].options.forEach((option) => {
                    const optionElement = document.createElement("option");
                    optionElement.value = option;
                    optionElement.textContent = option;
                    select.appendChild(optionElement);
                });
                select.value = optionsData[key][key2].default;
                div.appendChild(select);
            }

            // Otherwise, let them specify their own string
            else {
                const input = document.createElement("input");
                input.value = optionsData[key][key2].default;
                input.name = optionsData[key][key2].name;
                input.type = "text";
                div.appendChild(input);
            }
        }

        // Boolean, meaning we should give them a selection menu representing True/False
        else if (optionsData[key][key2].type === "bool") {
            const select = document.createElement("select");
            select.name = optionsData[key][key2].name;
            const option1 = document.createElement("option");
            option1.value = option1.textContent = "Yes";
            select.appendChild(option1);
            const option2 = document.createElement("option");
            option2.value = option2.textContent = "No";
            select.appendChild(option2);
            select.value = optionsData[key][key2].default;
            div.appendChild(select);
        }

        // For floats, just give them an input
        else if (optionsData[key][key2].type === "float" || optionsData[key][key2].type === "int") {
            const input = document.createElement("input");
            input.value = optionsData[key][key2].default;
            input.name = optionsData[key][key2].name;
            input.type = "text";
            div.appendChild(input);
        }

        if ("units" in optionsData[key][key2]) {
            const units = document.createElement("p");
            units.classList.toggle("units");
            units.textContent = "(" + optionsData[key][key2].units + ")";
            div.appendChild(units);
        }

        const desc = document.createElement("p");
        desc.classList.toggle("desc");
        desc.textContent = optionsData[key][key2].desc;
        div.appendChild(desc);

        // Overall append
        optionsDiv.appendChild(div);
    }
}

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
    const fields = {};
    for (const key in optionsData) {
        for (const key2 in optionsData[key]) {
            fields[optionsData[key][key2].name] = formData.get(optionsData[key][key2].name);
        }
    }
    console.log("pathToResources: " + pathToResources);
    console.log("Running script " + pathToResources + "main.py using interpreter " + pythonPath);

    const process = spawn(
        pythonPath,
        [
            "-u", // Don't buffer output, we want that live
            pathToResources + "main.py",
            JSON.stringify(fields),
            JSON.stringify(FOLDERS_TO_ADD_TO_PYTHONPATH),
        ], // Serialize the data and feed it in as a command line argument],
        { cwd: pathToResources }
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
        const xmlFiles = fs.readdirSync(path.join(__dirname, "xml"));
        xmlFiles.forEach((file) => {
            fs.unlinkSync(path.join(__dirname, "xml", file));
        });

        // Copy over the XML files produced by `cdme-scangen` to the directory read from by `cdme-scangen-ui`

        const files = fs.readdirSync(path.join(pathToResources, "XMLOutput"));
        files.forEach((file) => {
            fs.copyFileSync(path.join(pathToResources, "XMLOutput", file), path.join(__dirname, "xml", file));
        });
        alert('Build complete! Files can now be viewed under the "View Vectors" tab.');
    });
});

// Make the contents of the select menu the contents of the 'xml' directory
const fs = require("fs");
let files = fs.readdirSync(path.join(pathToResources, "geometry"));
for (let file of files) {
    console.log("Adding file " + file);
    let option = document.createElement("option");
    option.textContent = file;
    option.value = file;
    document.getElementsByName("Part File Name")[0].appendChild(option);
}