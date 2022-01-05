const path = require("path");
const paths = require("../paths.js");

// Load data; requires cdme-scangen repository to be in parallel folder to cdme-scangen-ui, for now
const optionsData = require(path.join(paths.GetBackendPath(), "schema.json"));

// Functionality performed on initial page render
// Handles generating UI inputs for the segment styles
function generateSegmentStylesDOM() {
    let div = document.createElement("ul");
    return div;
}

// Handles generating UI inputs for the velocity profiles
function generateVelocityProfilesDOM() {
    let div = document.createElement("div");
    console.log("optionsData", optionsData);
    for (let i = 0; i < optionsData["Velocity Profiles"].length; i++) {
        let velocityProfile = optionsData["Velocity Profiles"][i];
        div.append(createElementWithText("h3", "Velocity Profile #" + (i + 1)));
        div.append(VelocityProfileToHTML(velocityProfile));
    }
    return div;
}

// Handles generating UI inputs for the rest, which is generalizable
let specialElements = new Set(["Hatch Default ID", "Contour Default ID", "Segment Styles", "Velocity Profiles"]);
function generateRemainingDOM() {
    let div = document.createElement("div");
    div.appendChild(SectionHeaderDOM("General"));
    for (const key in optionsData) {
        if (specialElements.has(key)) continue;
        div.appendChild(SectionHeaderDOM(key));
        for (const key2 in optionsData[key]) {
            let option = document.createElement("div");
            option.classList.toggle("field");

            // Title
            const label = document.createElement("label");
            label.textContent = optionsData[key][key2].name;
            option.append(label);

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
                    option.appendChild(select);
                }

                // Otherwise, let them specify their own string
                else {
                    const input = document.createElement("input");
                    input.value = optionsData[key][key2].default;
                    input.name = optionsData[key][key2].name;
                    input.type = "text";
                    option.appendChild(input);
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
                option.appendChild(select);
            }

            // For floats, just give them an input
            else if (optionsData[key][key2].type === "float" || optionsData[key][key2].type === "int") {
                const input = document.createElement("input");
                input.value = optionsData[key][key2].default;
                input.name = optionsData[key][key2].name;
                input.type = "text";
                option.appendChild(input);
            }

            if ("units" in optionsData[key][key2]) {
                const units = document.createElement("p");
                units.classList.toggle("units");
                units.textContent = "(" + optionsData[key][key2].units + ")";
                option.appendChild(units);
            }

            const desc = document.createElement("p");
            desc.classList.toggle("desc");
            desc.textContent = optionsData[key][key2].desc;
            option.appendChild(desc);

            // Overall append
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

let velocityProfileCount = 1;
let segmentStyleCount = 1;
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
    document.getElementById("velocityProfiles").append(createElementWithText("h3", "Velocity Profile #" + (velocityProfileCount + 1)));
    document.getElementById("velocityProfiles").append(VelocityProfileToHTML(velocityProfile));
    velocityProfileCount++;
    return velocityProfile;
}

let segmentStylesHTML = document.getElementById("segmentStyles");
let velocityProfilesHTML = document.getElementById("velocityProfiles");
document.getElementById("addSegmentStyleButton").addEventListener("click", (e) => {
    e.preventDefault();
    throw new Error("Not implemented");
});
document.getElementById("deleteSegmentStyleButton").addEventListener("click", (e) => {
    e.preventDefault();
    if (segmentStylesHTML.lastChild) {
        segmentStylesHTML.removeChild(segmentStylesHTML.lastChild);
    }
});
document.getElementById("addVelocityProfileButton").addEventListener("click", (e) => {
    e.preventDefault();
    NewVelocityProfile();
});
document.getElementById("deleteVelocityProfileButton").addEventListener("click", (e) => {
    e.preventDefault();
    if (velocityProfilesHTML.lastChild) {
        velocityProfilesHTML.removeChild(velocityProfilesHTML.lastChild); // Remove the actual profiile
        velocityProfilesHTML.removeChild(velocityProfilesHTML.lastChild); // Remove the "Velocity Profile #" header
        velocityProfileCount--;
    }
});

// Generate and append UI corresponding to the schema
document.getElementById("segmentStyles").appendChild(generateSegmentStylesDOM());
document.getElementById("velocityProfiles").appendChild(generateVelocityProfilesDOM());
document.getElementById("options").appendChild(generateRemainingDOM());

// Make the contents of the select menu the contents of the 'xml' directory
const fs = require("fs");
let files = fs.readdirSync(path.join(paths.GetBackendPath(), "geometry"));
for (let file of files) {
    let option = document.createElement("option");
    option.textContent = file;
    option.value = file;
    document.getElementsByName("Part File Name")[0].appendChild(option);
}
