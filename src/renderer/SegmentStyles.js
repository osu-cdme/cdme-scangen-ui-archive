// Manages DOM updating for the Segment Styles / Velocity Profiles section
// Also updates a build object, if passed into the constructor

const { SegmentStyle, Traveler, Wobble } = require("alsam-xml");
const { path, paths } = require("./imports");
const defaults = require(path.join(paths.GetBackendPath(), "schema.json"));
const { createInputWithLabel, createElementWithText } = require("./pages/generate/utility.js");

class SegmentStyles {
    constructor(build) {
        this.build = build;

        // If a build was passed in, assume this isn't the generate page and load everything from that Build
        if (build) {
            this.styles = build.segmentStyles;
        }

        // Otherwise, load defaults from the schema and populate/manage HTML fields
        // If generating, construct with all default values
        else {
            this.styles = [];
            this.New(); // New style defaults to first in the schema

            // Manually add the second one from the schema
            this.styles.push(
                new SegmentStyle({
                    id: defaults["Segment Styles"][1].id,
                    velocityProfileID: defaults["Segment Styles"][1].velocityProfileID,
                    laserMode: defaults["Segment Styles"][1].laserMode,
                    travelers: [],
                })
            );
        }

        this.Refresh();
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
                id: defaults["Segment Styles"][0].id,
                velocityProfileID: defaults["Segment Styles"][0].velocityProfileID,
                laserMode: defaults["Segment Styles"][0].laserMode,
                travelers: [
                    new Traveler({
                        id: defaults["Segment Styles"][0].travelers[0].id,
                        syncDelay: defaults["Segment Styles"][0].travelers[0].syncDelay,
                        power: defaults["Segment Styles"][0].travelers[0].power,
                        spotSize: defaults["Segment Styles"][0].travelers[0].spotSize,
                        wobble: new Wobble({
                            on: defaults["Segment Styles"][0].travelers[0].wobble.on,
                            freq: defaults["Segment Styles"][0].travelers[0].wobble.freq,
                            shape: defaults["Segment Styles"][0].travelers[0].wobble.shape,
                            transAmp: defaults["Segment Styles"][0].travelers[0].wobble.transAmp,
                            longAmp: defaults["Segment Styles"][0].travelers[0].wobble.longAmp,
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

        for (let i = 0; i < this.styles.length; i++) {
            document.getElementById("segmentStyles").append(this.StyleToHTML(i));
        }

        // "New Velocity Profile" Button
        const button = document.createElement("button");
        button.textContent = "New Segment Style";
        button.type = "button";
        button.addEventListener("click", (e) => {
            e.preventDefault();
            this.New();
        });
        document.getElementById("segmentStyles").append(button);
    }

    StyleToHTML(i) {
        const style = this.styles[i];
        const div = document.createElement("div");
        div.classList.toggle("segmentStyle"); // Used to accurately grab the inputs during form submission
        div.classList.toggle("style"); // Used for styling common between Velocity Profiles / Segment Styles

        div.append(createElementWithText("h4", "Segment Style #" + (i + 1)));

        const idInput = createInputWithLabel("ID: ", style.id, "");
        idInput.onchange = (e) => {
            style.id = e.target.value;
        };
        div.append(idInput);

        const velocityProfileIDInput = createInputWithLabel("Velocity Profile ID: ", style.velocityProfileID, "");
        velocityProfileIDInput.onchange = (e) => {
            style.velocityProfileID = e.target.value;
        };
        div.append(velocityProfileIDInput);

        const laserModeInput = createInputWithLabel("Laser Mode: ", style.laserMode, " (either 'Independent' or 'FollowMe'; Case Sensitive)");
        laserModeInput.onchange = (e) => {
            style.laserMode = e.target.value;
        };
        div.append(laserModeInput);

        for (let j = 0; j < style.travelers.length; j++) {
            const traveler = style.travelers[j];
            const travelerDiv = document.createElement("div");
            travelerDiv.classList.toggle("traveler");

            travelerDiv.append(createElementWithText("h5", "Traveler #" + (j + 1)));

            // TODO: Check the constraints on these
            const travelerIDInput = createInputWithLabel("ID: ", traveler.id, " (integer)");
            travelerIDInput.onchange = (e) => {
                traveler.id = e.target.value;
            };
            travelerDiv.append(travelerIDInput);

            const syncDelayInput = createInputWithLabel("Sync Delay: ", traveler.syncDelay, " (μs)");
            syncDelayInput.onchange = (e) => {
                traveler.syncDelay = e.target.value;
            };
            travelerDiv.append(syncDelayInput);

            const powerInput = createInputWithLabel("Power: ", traveler.power, " (watts)");
            powerInput.onchange = (e) => {
                traveler.power = e.target.value;
            };
            travelerDiv.append(powerInput);

            const spotSizeInput = createInputWithLabel("Spot Size: ", traveler.spotSize, " (microns)");
            spotSizeInput.onchange = (e) => {
                traveler.spotSize = e.target.value;
            };
            travelerDiv.append(spotSizeInput);

            if (traveler.wobble) {
                const wobbleDiv = document.createElement("div");
                wobbleDiv.classList.toggle("wobble");
                wobbleDiv.append(createElementWithText("h5", "Wobble"));

                const onInput = createInputWithLabel("On: ", traveler.wobble.on, "(0 or 1)");
                onInput.onchange = (e) => {
                    traveler.wobble.on = e.target.value;
                };
                wobbleDiv.append(onInput);

                const freqInput = createInputWithLabel("Frequency: ", traveler.wobble.freq, " (positive or negative integer, Hz)");
                freqInput.onchange = (e) => {
                    traveler.wobble.freq = e.target.value;
                };
                wobbleDiv.append(freqInput);

                const shapeInput = createInputWithLabel("Shape: ", traveler.wobble.shape, " (-1, 0, or 1)");
                shapeInput.onchange = (e) => {
                    traveler.wobble.shape = e.target.value;
                };
                wobbleDiv.append(shapeInput);

                const transAmpInput = createInputWithLabel("Transient Amplitude: ", traveler.wobble.transAmp, " (mm)");
                transAmpInput.onchange = (e) => {
                    traveler.wobble.transAmp = e.target.value;
                };
                wobbleDiv.append(transAmpInput);

                const longAmpInput = createInputWithLabel("Longitudinal Amplitude: ", traveler.wobble.longAmp, " (mm)");
                longAmpInput.onchange = (e) => {
                    traveler.wobble.longAmp = e.target.value;
                };
                wobbleDiv.append(longAmpInput);

                const button = document.createElement("button");
                button.textContent = "Disable Wobble";
                button.onclick = (e) => {
                    e.preventDefault();
                    traveler.wobble = null;
                    this.Refresh();
                };
                wobbleDiv.appendChild(button);
                travelerDiv.appendChild(wobbleDiv);
            } else {
                const button = document.createElement("button");
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
            const deleteButton = document.createElement("button");
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
        const addTravelerButton = document.createElement("button");
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
        const deleteSegmentStyleButton = document.createElement("button");
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
