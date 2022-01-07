const path = require("path");
const paths = require("../paths.js");
const { createInputWithLabel, createElementWithText } = require("./utility.js");

// Load data; requires cdme-scangen repository to be in parallel folder to cdme-scangen-ui, for now
const optionsData = require(path.join(paths.GetBackendPath(), "schema.json"));

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

// Generate and append UI corresponding to the schema
let { SegmentStyles } = require("./SegmentStyles.js");
let { VelocityProfiles } = require("./VelocityProfiles.js");
styles = new SegmentStyles();
profiles = new VelocityProfiles();
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

// const { spawnProcess } = require("./spawning.js");
document.getElementById("start").addEventListener("click", () => {
    spawnProcess(styles.Get(), profiles.Get(), styles.GetDefaults());
});
