const { path, paths, fs } = require("../common");

// Load data; requires cdme-scangen repository to be in parallel folder to cdme-scangen-ui, for now
const optionsData = require("./optionsdata");

let selectedScanStrategy = null;
function getOptionHTML(data) {
    const option = document.createElement("div");
    option.classList.toggle("field");

    // Title
    const label = document.createElement("label");
    label.textContent = data.name;
    option.append(label);

    // Behavior from here depends on type
    if (data.type === "string") {
        if ("options" in data) {
            const select = document.createElement("select");
            select.name = data.name;
            data.options.forEach((option) => {
                const optionElement = document.createElement("option");
                optionElement.value = option;
                optionElement.textContent = option;
                select.appendChild(optionElement);
            });
            if (data.name === "Scan Strategy") {
                select.onchange = () => {
                    // We update our record then re-render the Strategy Specific part of the schema
                    // Re-rendering live is necessary because on first run-through, it'll just be set to Default
                    selectedScanStrategy = select.value;
                    let div = document.getElementById("options-nonsegorvelocity");
                    let thingsToDelete = div.querySelectorAll(".options-nonsegorvelocity-setting");
                    thingsToDelete.forEach((thing) => {
                        thing.remove();
                    });
                    let subDiv = document.createElement("div");
                    subDiv.classList.toggle("options-nonsegorvelocity-setting");
                    for (const key in optionsData) {
                        if (key === "Strategy Specific") {
                            subDiv.appendChild(SectionHeaderDOM("Strategy Specific"));
                            for (const key2 in optionsData[key]) {
                                if (selectedScanStrategy === key2) {
                                    for (const key3 in optionsData[key][key2]) {
                                        subDiv.appendChild(getOptionHTML(optionsData[key][key2][key3]));
                                    }
                                }
                            }
                        }
                    }
                    div.appendChild(subDiv);
                };
            }
            select.value = data.default;
            option.appendChild(select);
        } else {
            const input = document.createElement("input");
            input.value = data.default;
            input.name = data.name;
            input.type = "text";
            option.appendChild(input);
        }
    } else if (data.type === "bool") {
        const select = document.createElement("select");
        select.name = data.name;
        const option1 = document.createElement("option");
        option1.value = option1.textContent = "Yes";
        select.appendChild(option1);
        const option2 = document.createElement("option");
        option2.value = option2.textContent = "No";
        select.appendChild(option2);
        select.value = data.default;
        option.appendChild(select);
    } else if (data.type === "float" || data.type === "int") {
        const input = document.createElement("input");
        input.value = data.default;
        input.name = data.name;
        input.type = "text";
        option.appendChild(input);
    }

    if ("units" in data) {
        const units = document.createElement("p");
        units.classList.toggle("units");
        units.textContent = "(" + data.units + ")";
        option.appendChild(units);
    }

    const desc = document.createElement("p");
    desc.classList.toggle("desc");
    desc.textContent = data.desc;
    option.appendChild(desc);
    return option;
}

// Handles generating UI inputs for the rest, which is generalizable
const specialElements = new Set(["Hatch Default ID", "Contour Default ID", "Segment Styles", "Velocity Profiles", "Strategy Specific"]);
function generateRemainingDOM() {
    const div = document.createElement("div");
    div.id = "options-nonsegorvelocity";
    for (const key in optionsData) {
        if (specialElements.has(key)) continue;
        div.appendChild(SectionHeaderDOM(key));
        for (const key2 in optionsData[key]) {
            // Overall append
            const option = getOptionHTML(optionsData[key][key2]);
            div.appendChild(option);
        }
    }

    return div;
}

function SectionHeaderDOM(text) {
    const header = document.createElement("h2");
    header.textContent = text;
    return header;
}

// Generate and append UI corresponding to the schema
const { SegmentStyles } = require("./SegmentStyles.js");
const { VelocityProfiles } = require("./VelocityProfiles.js");
const styles = new SegmentStyles(true);
const profiles = new VelocityProfiles(true);
document.getElementById("options").appendChild(generateRemainingDOM());

// Make the contents of the select menu the contents of the 'xml' directory
const files = fs.readdirSync(path.join(paths.GetBackendPath(), "geometry"));
for (const file of files) {
    const option = document.createElement("option");
    option.textContent = file;
    option.value = file;
    document.getElementsByName("Part File Name")[0].appendChild(option);
}

document.getElementById("start").addEventListener("click", () => {
    spawnProcess(styles.Get(), profiles.Get(), styles.GetDefaults());
});

// Functionality to spawn the pyslm child process and interface correctly with it
const pythonPath = path.join(paths.GetUIPath(), "python", "python.exe");
const FOLDERS_TO_ADD_TO_PYTHONPATH = [
    paths.GetBackendPath(),
    path.join(paths.GetBackendPath(), "pyslm"),
    path.join(paths.GetBackendPath(), "pyslm", "pyslm"),
];

const getFractionRegex = /\d+\/\d+/g;
let lastLayer;
function parseStderr(chunkBuf) {
    const chunkStr = chunkBuf.toString("utf8");
    const regex = /(\d+(\.\d+)?%)/g; // Matches a number and a percent
    console.log("stderr: " + chunkStr);
    if (chunkStr.includes("Processing Layers")) {
        const fraction = chunkStr.match(getFractionRegex)[0];
        lastLayer = parseInt(fraction.match(/\d+/g)[1]);
        console.log("lastLayer: " + lastLayer);
        const number = regex.exec(chunkStr)[0]; // Exec used rather than string.match() b/c exec only returns the first match by default
        console.log("number: " + number);
        if (number) {
            if (number.includes("100")) {
                document.getElementById("progressText").textContent = "Done!";
            } else {
                document.getElementById("done").style.width = number;
                document.getElementById("progressText").textContent = `(1/2) Processing Layers (${number})`;
            }
        }
    }
}

const finishRegex = /XML Layer # \d+ Complete/g;
const numberRegex = /\d+/g;
function parseStdout(chunkBuf) {
    const chunkStr = chunkBuf.toString("utf8");
    console.log("chunkStr: " + chunkStr);

    if (chunkStr.includes("XML Layer")) {
        if (chunkStr.match(finishRegex)) {
            const finishText = chunkStr.match(finishRegex)[0];
            const number = finishText.match(numberRegex)[0];
            document.getElementById("done").style.width = (number / lastLayer) * 100 + "%";
            document.getElementById("progressText").textContent = `(2/2) Generating XML Files (${number}/${lastLayer})`;
        }
    }
}

// Launch the application when they hit the button
const spawn = require("child_process").spawn;
function spawnProcess(styles, profiles, defaults) {
    // console.log("styles: ", styles);
    // console.log("profiles: ", profiles);
    document.getElementById("progressText").textContent = "Spawning child process.";
    const formEl = document.forms.mainsection;
    const formData = new FormData(formEl);
    const fields = {};
    for (const key in optionsData) {
        for (const key2 in optionsData[key]) {
            fields[optionsData[key][key2].name] = formData.get(optionsData[key][key2].name);
        }
    }

    // Segment specific options need special handling
    for (const key in optionsData["Strategy Specific"]) {
        for (const key2 in optionsData["Strategy Specific"][key]) {
            if (formData.get(optionsData["Strategy Specific"][key][key2].name) === null) continue;
            fields[optionsData["Strategy Specific"][key][key2].name] = formData.get(optionsData["Strategy Specific"][key][key2].name);
        }
    }
    fields["Hatch Default ID"] = defaults.hatchID;
    fields["Contour Default ID"] = defaults.contourID;
    fields["Segment Styles"] = styles;
    fields["Velocity Profiles"] = profiles;

    console.log("Passing as first cmd line parameter: ", fields);
    console.log("Passing as second cmd line parameter: ", FOLDERS_TO_ADD_TO_PYTHONPATH);
    console.log("Running script " + path.join(paths.GetBackendPath(), "main.py") + " using interpreter " + pythonPath);

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
        parseStdout(chunk);
    });
    process.stderr.on("data", (chunk) => {
        parseStderr(chunk);
    });
    process.on("close", (code) => {
        console.log("Child process exited with code " + code + ".");
        if (code !== 0) {
            alert(
                "Build process did not work correctly! Please send the .STL file you were using and screenshots of your generation settings to the developers of this application."
            );
            document.getElementById("progressText").textContent = "Error spawning child process.";
            document.getElementById("done").style.width = "0%";
            return;
        }

        // Wipe all files currently in 'xml' directory, getting rid of whatever build was previously in there (if any)
        const fs = require("fs");
        const path = require("path");
        if (!fs.existsSync(path.join(paths.GetUIPath(), "xml"))) {
            fs.mkdirSync(path.join(paths.GetUIPath(), "xml"));
        }
        const xmlFiles = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
        xmlFiles.forEach((file) => {
            fs.unlinkSync(path.join(paths.GetUIPath(), "xml", file));
        });

        // Copy over the XML files produced by `cdme-scangen` to the directory read from by `cdme-scangen-ui`
        const files = fs.readdirSync(path.join(paths.GetBackendPath(), "XMLOutput"));
        files.forEach((file) => {
            if (file.includes(".xml")) {
                // Ignore the .SCN file
                fs.copyFileSync(path.join(paths.GetBackendPath(), "XMLOutput", file), path.join(paths.GetUIPath(), "xml", file));
            }
        });
        alert('Build complete! Files can now be viewed under the "View Vectors" tab.');
    });
}
