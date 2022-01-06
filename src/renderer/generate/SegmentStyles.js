// Using React or similar would make this much easier, but that's additional technical complexity I don't want to put on whoever's maintaining after me
// I'm basically reimplementing automatic state updating from React, lol
const { SegmentStyle, Traveler, Wobble } = require("../../../../alsam-xml/alsam-xml.js");
const paths = require("../paths.js");
const optionsData = require(path.join(paths.GetBackendPath(), "schema.json"));
const { createInputWithLabel, createElementWithText } = require("./utility.js");

class SegmentStyles {
    constructor() {
        this.styles = [];
        this.New();
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

        for (let i = 0; i < this.styles.length; i++) {
            document.getElementById("segmentStyles").append(createElementWithText("h3", "Segment Style #" + (i + 1)));
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
    // TODO: Implement
    StyleToHTML(i) {
        let style = this.styles[i];
        const div = document.createElement("div");
        div.classList.toggle("segmentStyle"); // Used to accurately grab the inputs during form submission
        div.classList.toggle("style"); // Used for styling common between Velocity Profiles / Segment Styles
        div.append(createInputWithLabel("ID: ", style.id, ""));
        div.append(createInputWithLabel("Velocity Profile ID: ", style.velocityProfileID, "(any text)"));
        div.append(createInputWithLabel("Laser Mode: ", style.laserMode, "Either 'Independent' or 'Follow Me'"));
        for (let j = 0; j < style.travelers.length; j++) {
            let traveler = style.travelers[j];
            let travelerDiv = document.createElement("div");

            // TODO: Check the constraints on these
            travelerDiv.append(createElementWithText("h4", "Traveler #" + (j + 1)));
            travelerDiv.append(createInputWithLabel("ID: ", traveler.id, ""));
            travelerDiv.append(createInputWithLabel("syncDelay: ", traveler.syncDelay, "(Any Number)"));
            travelerDiv.append(createInputWithLabel("power: ", traveler.power, "(Any Number)"));
            travelerDiv.append(createInputWithLabel("Spot Size: ", traveler.spotSize, "(Any Number)"));
            if (traveler.wobble) {
                let wobbleDiv = document.createElement("div");
                wobbleDiv.append(createElementWithText("h5", "Wobble Information"));
                wobbleDiv.append(createInputWithLabel("On: ", traveler.wobble.on, "(Any Number)"));
                wobbleDiv.append(createInputWithLabel("Freq: ", traveler.wobble.freq, "(Any Number)"));
                wobbleDiv.append(createInputWithLabel("Shape: ", traveler.wobble.shape, "(Any Number)"));
                wobbleDiv.append(createInputWithLabel("Trans Amp: ", traveler.wobble.transAmp, "(Any Number)"));
                wobbleDiv.append(createInputWithLabel("Long Amp: ", traveler.wobble.longAmp, "(Any Number)"));
                travelerDiv.appendChild(wobbleDiv);

                let button = document.createElement("button");
                button.textContent = "Remove Wobble";
                button.onclick = (e) => {
                    e.preventDefault();
                    traveler.wobble = null;
                    this.Refresh();
                };
                travelerDiv.appendChild(button);
            } else {
                let button = document.createElement("button");
                button.textContent = "Add Wobble";
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
                style.travelers.splice(i, 1);
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
