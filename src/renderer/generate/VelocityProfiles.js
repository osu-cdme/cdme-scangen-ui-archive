const { VelocityProfile } = require("../../../../alsam-xml/alsam-xml.js");
const { createInputWithLabel, createElementWithText } = require("./utility.js");

class VelocityProfiles {
    constructor() {
        this.profiles = [];
        this.New();
    }
    Add(profile) {
        this.profiles.push(profile);
        this.Refresh();
    }
    Remove() {
        this.profiles.pop();
        this.Refresh();
    }
    New() {
        this.profiles.push(
            new VelocityProfile({
                id: "",
                velocity: "",
                mode: "",
                laserOnDelay: "",
                laserOffDelay: "",
                jumpDelay: "",
                markDelay: "",
                polygonDelay: "",
            })
        );
        this.Refresh();
    }
    Refresh() {
        // Wipe the contents of the Velocity Profiles section
        while (document.getElementById("velocityProfiles").firstChild) {
            document.getElementById("velocityProfiles").removeChild(document.getElementById("velocityProfiles").firstChild);
        }

        for (let i = 0; i < this.profiles.length; i++) {
            document.getElementById("velocityProfiles").append(createElementWithText("h3", "Velocity Profile #" + (i + 1)));
            document.getElementById("velocityProfiles").append(this.ProfileToHTML(i));
        }

        // "New Velocity Profile" Button
        let button = document.createElement("button");
        button.textContent = "New Velocity Profile";
        button.type = "button";
        button.addEventListener("click", (e) => {
            e.preventDefault();
            this.New();
        });
        document.getElementById("velocityProfiles").append(button);
    }
    ProfileToHTML(i) {
        let profile = this.profiles[i];
        const div = document.createElement("div");
        div.classList.toggle("velocityProfile"); // Used to accurately grab the inputs during form submission
        div.classList.toggle("style"); // Used for styling common between Velocity Profiles / Segment Styles
        div.append(createInputWithLabel("ID: ", profile.id, ""));
        div.append(createInputWithLabel("Velocity: ", profile.velocity, "(Any Number)"));
        div.append(createInputWithLabel("Mode: ", profile.mode, "(Any string from set {Delay, Auto}"));
        div.append(createInputWithLabel("Laser On Delay: ", profile.laserOnDelay, "(microseconds)"));
        div.append(createInputWithLabel("Laser Off Delay: ", profile.laserOffDelay, "(microseconds)"));
        div.append(createInputWithLabel("Jump Delay: ", profile.jumpDelay, "(microseconds)"));
        div.append(createInputWithLabel("Mark Delay: ", profile.markDelay, "(microseconds)"));
        div.append(createInputWithLabel("Polygon Delay: ", profile.polygonDelay, "(microseconds)"));

        // "Delete This Velocity Profile" Button
        let button = document.createElement("button");
        button.textContent = "Delete Velocity Profile";
        button.addEventListener("click", (e) => {
            e.preventDefault();
            this.profiles.splice(i, 1); // Remove the element at index i
            this.Refresh();
        });
        div.append(button);

        return div;
    }
}

exports.VelocityProfiles = VelocityProfiles;
