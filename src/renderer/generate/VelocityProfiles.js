const { VelocityProfile } = require("../../../../alsam-xml/alsam-xml.js");
const { createInputWithLabel, createElementWithText } = require("./utility.js");

class VelocityProfiles {
    constructor() {
        this.profiles = [];
        this.New();
    }
    Get() {
        // Used during form input to super easily handle these
        return this.profiles;
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

        // TODO: Lots of repeated code, definitely possible to functionalize / iterate it
        let idInput = createInputWithLabel("ID: ", profile.id, "");
        idInput.onchange = (e) => {
            profile.id = e.target.value;
        };
        div.append(idInput);

        let velocityInput = createInputWithLabel("Velocity: ", profile.velocity, "(Any Number)");
        velocityInput.onchange = (e) => {
            profile.velocity = e.target.value;
        };
        div.append(velocityInput);

        let modeInput = createInputWithLabel("Mode: ", profile.mode, "(Any string from set {Delay, Auto}");
        modeInput.onchange = (e) => {
            profile.mode = e.target.value;
        };
        div.append(modeInput);

        let laserOnDelayInput = createInputWithLabel("Laser On Delay: ", profile.laserOnDelay, "(microseconds)");
        laserOnDelayInput.onchange = (e) => {
            profile.laserOnDelay = e.target.value;
        };
        div.append(laserOnDelayInput);

        let laserOffDelayInput = createInputWithLabel("Laser Off Delay: ", profile.laserOffDelay, "(microseconds)");
        laserOffDelayInput.onchange = (e) => {
            profile.laserOffDelay = e.target.value;
        };
        div.append(laserOffDelayInput);

        let jumpDelayInput = createInputWithLabel("Jump Delay: ", profile.jumpDelay, "(microseconds)");
        jumpDelayInput.onchange = (e) => {
            profile.jumpDelay = e.target.value;
        };
        div.append(jumpDelayInput);

        let markDelayInput = createInputWithLabel("Mark Delay: ", profile.markDelay, "(microseconds)");
        markDelayInput.onchange = (e) => {
            profile.markDelay = e.target.value;
        };
        div.append(markDelayInput);

        let polygonDelayInput = createInputWithLabel("Polygon Delay: ", profile.polygonDelay, "(microseconds)");
        polygonDelayInput.onchange = (e) => {
            profile.polygonDelay = e.target.value;
        };
        div.append(polygonDelayInput);

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
