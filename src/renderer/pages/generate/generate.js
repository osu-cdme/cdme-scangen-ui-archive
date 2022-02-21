const { path, paths, fs } = require("../../imports");
const { cache } = require("../../caching");
const { getLayerFromFilePath } = require("../../Build");
const glob = require("glob");

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
                    let div = document.getElementById("scanpath-specific");
                    let thingsToDelete = div.querySelectorAll(".scanpath-specific-setting");
                    thingsToDelete.forEach((thing) => {
                        thing.remove();
                    });
                    let subDiv = document.createElement("div");
                    subDiv.classList.toggle("scanpath-specific-setting");
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
const specialElements = new Set(["Segment Styles", "Velocity Profiles", "Strategy Specific", "Output"]);
function generateRemainingDOM() {
    const preDiv = document.getElementById("pre-options");
    const postDiv = document.getElementById("post-options");

    for (const key in optionsData) {
        if (specialElements.has(key)) continue;

        const divToAppendTo = key === "Input" || key === "General" ? preDiv : postDiv;
        divToAppendTo.appendChild(SectionHeaderDOM(key));
        for (const key2 in optionsData[key]) {
            // Overall append
            const option = getOptionHTML(optionsData[key][key2]);
            divToAppendTo.appendChild(option);
        }
    }
}

function SectionHeaderDOM(text) {
    const header = document.createElement("h2");
    header.textContent = text;
    return header;
}

// Generate and append UI corresponding to the schema
const { SegmentStyles } = require("../../SegmentStyles.js");
const { VelocityProfiles } = require("../../VelocityProfiles.js");
const styles = new SegmentStyles();
const profiles = new VelocityProfiles();
generateRemainingDOM();

// Make the contents of the select menu the contents of the 'xml' directory
const files = fs.readdirSync(path.join(paths.GetBackendPath(), "geometry"));
for (const file of files) {
    const option = document.createElement("option");
    option.textContent = file;
    option.value = file;
    document.getElementsByName("Part File Name")[0].appendChild(option);
}

let running = false;
document.getElementById("start").addEventListener("click", (e) => {
    console.log("Event listener fired!");
    e.preventDefault();

    if (running) {
        if (child !== null) {
            child.kill();
            child = null;
        }
        running = false;
        document.getElementById("start").textContent = "Generate";
    } else {
        running = true;
        document.getElementById("start").textContent = "Cancel";
        spawnProcess(styles.styles, profiles.profiles);
    }
});

// Functionality to spawn the pyslm child process and interface correctly with it
const pythonPath = path.join(paths.GetUIPath(), "python", "python.exe");
const FOLDERS_TO_ADD_TO_PYTHONPATH = [
    paths.GetBackendPath(),
    path.join(paths.GetBackendPath(), "pyslm"),
    path.join(paths.GetBackendPath(), "pyslm", "pyslm"),
];

// Matches TQDM progress bar,
// using capture groups to "save" each section's value so we don't have to do another regex to extract it
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match if you're confused
const tqdmRegex = /(.*): *(\d+%).*(\d+\/\d+) +\[(\d+:\d+)<(\d+:\d+), +(\d+.\d+.*\/s)\]/;

// TODO: If stuff gets printed to stderr, should get thrown. Figure out why non-errors are currently being printed to stderr.
// TODO: Actual time format is XX:XX<XX:XX; I extract first, I think, but that's actually the TIME ELAPSED, not time left estimate
function processStderr(chunk) {
    throw new Error("ERROR: " + chunk.toString("utf8"));
}
function processStdout(chunk) {
    const str = chunk.toString("utf8");
    console.log("stdout str: ", str);

    // Only do anything with it if it matches TQDM progress bar
    const match = str.match(tqdmRegex);
    if (match) {
        const label = match[1];
        const percent = match[2];
        const count = match[3]; // Only the percent and label are really "necessary" - these are still available for easy addition in the future
        const elapsed = match[4];
        const left = match[5];
        const rate = match[6];
        document.getElementById("progressText").textContent = `${label}: ${percent} (${elapsed} elapsed, ${left} left, ${rate})`;
        document.getElementById("done").style.width = percent;
    }
}

// Launch the application when they hit the button
const spawn = require("child_process").spawn;
let child = null;
function spawnProcess(styles, profiles) {
    // Either create the folder, or wipe whatever's in it, just to make sure we're starting fresh
    if (!fs.existsSync(path.join(paths.GetUIPath(), "xml"))) {
        fs.mkdirSync(path.join(paths.GetUIPath(), "xml"));
    } else {
        const files = fs.readdirSync(path.join(paths.GetUIPath(), "xml"));
        for (const file of files) {
            fs.unlinkSync(path.join(paths.GetUIPath(), "xml", file));
        }
    }

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
    fields["Segment Styles"] = styles;
    fields["Velocity Profiles"] = profiles;
    fields["Output .HDF5"] = false;

    console.log("Passing as first cmd line parameter: ", fields);
    console.log("Passing as second cmd line parameter: ", FOLDERS_TO_ADD_TO_PYTHONPATH);
    console.log("Running script " + path.join(paths.GetBackendPath(), "main.py") + " using interpreter " + pythonPath);

    child = spawn(
        pythonPath,
        [
            "-u", // Don't buffer output, we want that live
            path.join(paths.GetBackendPath(), "main.py"),
            JSON.stringify(fields),
            JSON.stringify(FOLDERS_TO_ADD_TO_PYTHONPATH),
        ], // Serialize the data and feed it in as a command line argument],
        {
            cwd: paths.GetBackendPath(), // Python interpreter needs run from the other directory b/c relative paths
        }
    );
    child.stdout.on("data", (chunk) => {
        processStdout(chunk);
    });
    child.stderr.on("data", (chunk) => {
        processStderr(chunk);
    });
    child.on("close", (code) => {
        running = false;
        console.log("Child process exited with code " + code + ".");

        // More complicated to cancel at this point now that it's back in this progress, so just don't bother
        document.getElementById("start").textContent = "Please wait.";
        document.getElementById("start").style.fontSize = ".8rem";

        // Occurs when child_process.kill() is used, as occurs when the user clicks the cancel button
        if (code === null) {
            document.getElementById("progressText").textContent = "Waiting for user.";
            document.getElementById("done").style.width = "0%";
            document.getElementById("start").textContent = "Start";
            document.getElementById("start").style.fontSize = "1.2rem";
            return;
        } else if (code !== 0) {
            alert(
                "Build process did not work correctly! If you were using Island/Striping, please lower Island/Stripe size and try again. Otherwise, please consider sending some information regarding what you were doing to developers of this application if you'd like it fixed."
            );
            document.getElementById("progressText").textContent = "Error spawning child process.";
            document.getElementById("done").style.width = "0%";
            document.getElementById("start").textContent = "Start";
            document.getElementById("start").style.fontSize = "1.2rem";
            return;
        }

        // Copy over the XML files produced by `cdme-scangen` to the directory read from by `cdme-scangen-ui`
        document.getElementById("progressText").textContent = "(Step 2 of 3) Finalizing some operations.";
        const files = fs.readdirSync(path.join(paths.GetBackendPath(), "XMLOutput"));
        files.forEach((file) => {
            if (file.includes(".xml")) {
                // Ignore the .SCN file
                fs.copyFileSync(
                    path.join(paths.GetBackendPath(), "XMLOutput", file),
                    path.join(paths.GetUIPath(), "xml", getLayerFromFilePath(file).toString() + ".xml") // Trim to just layer num
                );
            }
        });

        // Cache builds and thumbnails
        // Using Promise.all() would make this more readable, but we use a counter and invididual callbacks, which lets us keep a progress bar
        const xmlFiles = glob.sync(path.join(paths.GetUIPath(), "xml", "*.xml"));
        document.getElementById("progressText").textContent = `Caching Thumbnails & 'Build' Objects (0/${xmlFiles.length})`;
        document.getElementById("done").style.width = "0%";
        let numDone = 0;
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
                    alert('Build complete! Files can now be viewed under the "View Vectors" tab.');
                    document.getElementById("progressText").textContent = "Build complete!";
                    document.getElementById("done").style.width = "100%";
                    document.getElementById("start").textContent = "Start";
                    document.getElementById("start").style.fontSize = "1.2rem";
                }
            });
        }
    });
}
