// Using React or similar would make this much easier, but that's additional technical complexity I don't want to put on whoever's maintaining after me
// I'm basically reimplementing automatic state updating from React, lol
const { SegmentStyle, Traveler, Wobble } = require("../../../../alsam-xml/alsam-xml.js");
const paths = require("../paths.js");
const optionsData = require(path.join(paths.GetBackendPath(), "schema.json"));
const { createInputWithLabel, createElementWithText } = require("./utility.js");

class SegmentStyles {
    constructor() {
        this.styles = [];
        this.defaultHatchSegmentStyleID = "default";
        this.defaultContourSegmentStyleID = "default";
        this.New();
    }
    Get() {
        // Used during form input to super easily handle these
        return this.styles;
    }
    GetDefaults() {
        return { hatchID: this.defaultHatchSegmentStyleID, contourID: this.defaultContourSegmentStyleID };
    }
    Add(style) {
        this.styles.push(style);
        this.Refresh();
    }
    Remove() {
        this.styles.pop();
        this.Refresh();
    }
    New() {
        this.styles.push(
            new SegmentStyle({
                id: "",
                velocityProfileID: "",
                laserMode: "",
                travelers: [
                    new Traveler({
                        id: "",
                        syncDelay: "",
                        power: "",
                        spotSize: "",
                        wobble: new Wobble({
                            on: "",
                            freq: "",
                            shape: "",
                            transAmp: "",
                            longAmp: "",
                        }),
                    }),
                ],
            })
        );
        this.Refresh();
    }
    Refresh() {
        // Wipe segmentStyles section
        while (document.getElementById("segmentStyles").firstChild) {
            document.getElementById("segmentStyles").removeChild(document.getElementById("segmentStyles").firstChild);
        }

        let hatchDefaultInput = createInputWithLabel("Default Segment Style ID for Hatches: ", "", "");
        hatchDefaultInput.onchange = (e) => {
            this.defaultHatchSegmentStyleID = e.target.value;
        };
        document.getElementById("segmentStyles").append(hatchDefaultInput);

        let contourDefaultInput = createInputWithLabel("Default Segment Style ID for Contours: ", "", "");
        contourDefaultInput.onchange = (e) => {
            this.defaultContourSegmentStyleID = e.target.value;
        };
        document.getElementById("segmentStyles").append(contourDefaultInput);

        for (let i = 0; i < this.styles.length; i++) {
            document.getElementById("segmentStyles").append(createElementWithText("h4", "Segment Style #" + (i + 1)));
            document.getElementById("segmentStyles").append(this.StyleToHTML(i));
        }

        // "New Velocity Profile" Button
        let button = document.createElement("button");
        button.textContent = "New Segment Style";
        button.type = "button";
        button.addEventListener("click", (e) => {
            e.preventDefault();
            this.New();
        });
        document.getElementById("segmentStyles").append(button);
    }
    StyleToHTML(i) {
        let style = this.styles[i];
        const div = document.createElement("div");
        div.classList.toggle("segmentStyle"); // Used to accurately grab the inputs during form submission
        div.classList.toggle("style"); // Used for styling common between Velocity Profiles / Segment Styles

        let idInput = createInputWithLabel("ID: ", style.id, "");
        idInput.onchange = (e) => {
            style.id = e.target.value;
        };
        div.append(idInput);

        let velocityProfileIDInput = createInputWithLabel("Velocity Profile ID: ", style.velocityProfileID, "");
        velocityProfileIDInput.onchange = (e) => {
            style.velocityProfileID = e.target.value;
        };
        div.append(velocityProfileIDInput);

        let laserModeInput = createInputWithLabel(
            "Laser Mode Select: ",
            style.velocityProfileID,
            " (either 'Independent' or 'FollowMe'; Case Sensitive)"
        );
        laserModeInput.onchange = (e) => {
            style.laserMode = e.target.value;
        };
        div.append(laserModeInput);

        for (let j = 0; j < style.travelers.length; j++) {
            let traveler = style.travelers[j];
            let travelerDiv = document.createElement("div");
            travelerDiv.classList.toggle("traveler");

            travelerDiv.append(createElementWithText("h5", "Traveler #" + (j + 1)));

            // TODO: Check the constraints on these
            let travelerIDInput = createInputWithLabel("ID: ", traveler.id, " (integer)");
            travelerIDInput.onchange = (e) => {
                traveler.id = e.target.value;
            };
            travelerDiv.append(travelerIDInput);

            let syncDelayInput = createInputWithLabel("Sync Delay: ", traveler.syncDelay, " (microseconds)");
            syncDelayInput.onchange = (e) => {
                traveler.syncDelay = e.target.value;
            };
            travelerDiv.append(syncDelayInput);

            let powerInput = createInputWithLabel("Power: ", traveler.power, " (watts)");
            powerInput.onchange = (e) => {
                traveler.power = e.target.value;
            };
            travelerDiv.append(powerInput);

            let spotSizeInput = createInputWithLabel("Spot Size: ", traveler.spotSize, " (microns)");
            spotSizeInput.onchange = (e) => {
                traveler.spotSize = e.target.value;
            };
            travelerDiv.append(spotSizeInput);

            if (traveler.wobble) {
                let wobbleDiv = document.createElement("div");
                wobbleDiv.classList.toggle("wobble");
                wobbleDiv.append(createElementWithText("h5", "Wobble"));

                let onInput = createInputWithLabel("On: ", traveler.wobble.on, "(0 or 1)");
                onInput.onchange = (e) => {
                    traveler.wobble.on = e.target.value;
                };
                wobbleDiv.append(onInput);

                let freqInput = createInputWithLabel("Frequency: ", traveler.wobble.freq, " (positive or negative integer, Hz)");
                freqInput.onchange = (e) => {
                    traveler.wobble.freq = e.target.value;
                };
                wobbleDiv.append(freqInput);

                let shapeInput = createInputWithLabel("Shape: ", traveler.wobble.shape, " (-1, 0, or 1)");
                shapeInput.onchange = (e) => {
                    traveler.wobble.shape = e.target.value;
                };
                wobbleDiv.append(shapeInput);

                let transAmpInput = createInputWithLabel("Transient Amplitude: ", traveler.wobble.transAmp, " (mm)");
                transAmpInput.onchange = (e) => {
                    traveler.wobble.transAmp = e.target.value;
                };
                wobbleDiv.append(transAmpInput);

                let longAmpInput = createInputWithLabel("Longitudinal Amplitude: ", traveler.wobble.longAmp, " (mm)");
                longAmpInput.onchange = (e) => {
                    traveler.wobble.longAmp = e.target.value;
                };
                wobbleDiv.append(longAmpInput);

                let button = document.createElement("button");
                button.textContent = "Disable Wobble";
                button.onclick = (e) => {
                    e.preventDefault();
                    traveler.wobble = null;
                    this.Refresh();
                };
                wobbleDiv.appendChild(button);
                travelerDiv.appendChild(wobbleDiv);
            } else {
                let button = document.createElement("button");
                button.textContent = "Enable Wobble";
                button.onclick = (e) => {
                    e.preventDefault();
                    traveler.wobble = new Wobble({
                        on: "",
                        freq: "",
                        shape: "",
                        transAmp: "",
                        longAmp: "",
                    });
                    this.Refresh();
                };
                travelerDiv.appendChild(button);
            }

            // Delete Traveler button
            let deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete Traveler";
            deleteButton.onclick = (e) => {
                e.preventDefault();
                style.travelers.splice(j, 1);
                this.Refresh();
            };
            travelerDiv.appendChild(deleteButton);

            div.appendChild(travelerDiv);
        }

        // Add traveler button
        let addTravelerButton = document.createElement("button");
        addTravelerButton.textContent = "Add Traveler";
        addTravelerButton.type = "button";
        addTravelerButton.onclick = (e) => {
            e.preventDefault();
            style.travelers.push(
                new Traveler({
                    id: "",
                    syncDelay: "",
                    power: "",
                    spotSize: "",
                    wobble: null,
                })
            );
            this.Refresh();
        };
        div.append(addTravelerButton);

        // "Delete This Segment Style" Button
        let deleteSegmentStyleButton = document.createElement("button");
        deleteSegmentStyleButton.textContent = "Delete Segment Style";
        deleteSegmentStyleButton.addEventListener("click", (e) => {
            e.preventDefault();
            this.styles.splice(i, 1); // Remove the element at index i
            this.Refresh();
        });
        div.append(deleteSegmentStyleButton);

        return div;
    }
}

exports.SegmentStyles = SegmentStyles;
