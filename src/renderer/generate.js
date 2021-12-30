const path = require("path");
const paths = require("./paths.js");
const pythonPath = path.join(paths.GetUIPath(), "python", "python.exe");
const FOLDERS_TO_ADD_TO_PYTHONPATH = [
    paths.GetBackendPath(),
    path.join(paths.GetBackendPath(), "pyslm"),
    path.join(paths.GetBackendPath(), "pyslm", "pyslm"),
];

// Load data; requires cdme-scangen repository to be in same folder as cdme-scangen-ui, for now
const optionsData = require(paths.GetBackendPath() + "schema.json");

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

    // These are structured differently, so are handled differently
    if (key === "Segment Styles") {
        let div = document.createElement("div");
        div.id = "SegmentStyles";

        const label = document.createElement("label");
        label.textContent = "Segment Styles";
        div.append(label);
        for (let i = 0; i < optionsData[key].length; i++) {
            segmentStyle = optionsData[key][i];
            let segmentStyleDiv = document.createElement("div");
        }
    } else if (key === "Velocity Profiles") {
        const div = document.createElement("div");
        div.id = "VelocityProfiles";

        let createVelocityProfileButton = document.createElement("button");
        createVelocityProfileButton.textContent = "+";
        createVelocityProfileButton.onclick = (e) => {
            e.preventDefault(); // Prevent form submission
            NewVelocityProfile();
        };
        div.append(createVelocityProfileButton);

        // const label = document.createElement("label");
        //label.textContent = "Velocity Profiles";
        //div.append(label);
        for (let i = 0; i < optionsData[key].length; i++) {
            let velocityProfile = optionsData[key][i];
            div.append(createElementWithText("h3", "Velocity Profile #" + (i + 1)));
            div.append(VelocityProfileToHTML(velocityProfile));
        }
        optionsDiv.append(div);
    } else {
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
}

function createInputWithLabel(label, value, constraintsText) {
    const div = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = label;
    div.append(span);
    const input = document.createElement("input");
    input.type = "text";
    input.id = "input_" + label;
    input.value = value;
    div.append(input);
    const constraints = document.createElement("span");
    constraints.classList.toggle("constraints");
    constraints.textContent = constraintsText;
    div.append(constraints);
    return div;
}

function createElementWithText(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}

function VelocityProfileToHTML(velocityProfile) {
    const div = document.createElement("div");
    div.classList.toggle("velocityProfile"); // Used to accurately grab the inputs during form submission
    div.classList.toggle("style"); // Used for styling common between Velocity Profiles / Segment Styles
    div.append(createInputWithLabel("ID: ", velocityProfile.id, ""));
    div.append(createInputWithLabel("Velocity: ", velocityProfile.velocity, "(Any Number)"));
    div.append(createInputWithLabel("Mode: ", velocityProfile.mode, "(Any string from set {Delay, Auto}"));
    div.append(createInputWithLabel("Laser On Delay: ", velocityProfile.laserOnDelay, "(microseconds)"));
    div.append(createInputWithLabel("Laser Off Delay: ", velocityProfile.laserOffDelay, "(microseconds)"));
    div.append(createInputWithLabel("Jump Delay: ", velocityProfile.jumpDelay, "(microseconds)"));
    div.append(createInputWithLabel("Mark Delay: ", velocityProfile.markDelay, "(microseconds)"));
    div.append(createInputWithLabel("Polygon Delay: ", velocityProfile.polygonDelay, "(microseconds)"));
    return div;
}

function NewVelocityProfile() {
    const velocityProfile = {
        id: "",
        velocity: "",
        mode: "",
        laserOnDelay: "",
        laserOffDelay: "",
        jumpDelay: "",
        markDelay: "",
        polygonDelay: "",
    };
    document.getElementById("VelocityProfiles").append(VelocityProfileToHTML(velocityProfile));
    return velocityProfile;
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

// Make the contents of the select menu the contents of the 'xml' directory
const fs = require("fs");
let files = fs.readdirSync(path.join(paths.GetBackendPath(), "geometry"));
for (let file of files) {
    let option = document.createElement("option");
    option.textContent = file;
    option.value = file;
    document.getElementsByName("Part File Name")[0].appendChild(option);
}
