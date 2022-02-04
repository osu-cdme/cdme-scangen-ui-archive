// Manages DOM updating for the Segment Styles / Velocity Profiles section
// Also updates a build object, if passed into the constructor

const { VelocityProfile } = require("alsam-xml");
const { createInputWithLabel, createElementWithText } = require("./pages/generate/utility");
const { path, paths } = require("./imports");

const defaults = require(path.join(paths.GetBackendPath(), "schema.json"));

class VelocityProfiles {
    constructor(build) {
        // If build passed in, use the velocityProfiles it has
        if (build) {
            this.profiles = build.velocityProfiles;
        }

        // Else, use passed-in build
        else {
            this.profiles = [];
            this.New();
        }
        this.Refresh();
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
                id: defaults["Velocity Profiles"][0].id,
                velocity: defaults["Velocity Profiles"][0].velocity,
                mode: defaults["Velocity Profiles"][0].mode,
                laserOnDelay: defaults["Velocity Profiles"][0].laserOnDelay,
                laserOffDelay: defaults["Velocity Profiles"][0].laserOffDelay,
                jumpDelay: defaults["Velocity Profiles"][0].jumpDelay,
                markDelay: defaults["Velocity Profiles"][0].markDelay,
                polygonDelay: defaults["Velocity Profiles"][0].polygonDelay,
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
            document.getElementById("velocityProfiles").append(this.ProfileToHTML(i));
        }

        // "New Velocity Profile" Button
        const button = document.createElement("button");
        button.textContent = "New Velocity Profile";
        button.type = "button";
        button.addEventListener("click", (e) => {
            e.preventDefault();
            this.New();
        });
        document.getElementById("velocityProfiles").append(button);
    }

    ProfileToHTML(i) {
        const profile = this.profiles[i];
        const div = document.createElement("div");
        div.classList.toggle("velocityProfile"); // Used to accurately grab the inputs during form submission
        div.classList.toggle("style"); // Used for styling common between Velocity Profiles / Segment Styles

        div.append(createElementWithText("h3", "Velocity Profile #" + (i + 1)));

        // TODO: Lots of repeated code, definitely possible to functionalize / iterate it
        const idInput = createInputWithLabel("ID: ", profile.id, "");
        idInput.onchange = (e) => {
            profile.id = e.target.value;
        };
        div.append(idInput);

        const velocityInput = createInputWithLabel("Velocity: ", profile.velocity, "(mm/s)");
        velocityInput.onchange = (e) => {
            profile.velocity = e.target.value;
        };
        div.append(velocityInput);

        const modeInput = createInputWithLabel("Mode: ", profile.mode, "(Any string from set {Delay, Auto}");
        modeInput.onchange = (e) => {
            profile.mode = e.target.value;
        };
        div.append(modeInput);

        const laserOnDelayInput = createInputWithLabel("Laser On Delay: ", profile.laserOnDelay, "(μs)");
        laserOnDelayInput.onchange = (e) => {
            profile.laserOnDelay = e.target.value;
        };
        div.append(laserOnDelayInput);

        const laserOffDelayInput = createInputWithLabel("Laser Off Delay: ", profile.laserOffDelay, "(μs)");
        laserOffDelayInput.onchange = (e) => {
            profile.laserOffDelay = e.target.value;
        };
        div.append(laserOffDelayInput);

        const jumpDelayInput = createInputWithLabel("Jump Delay: ", profile.jumpDelay, "(μs)");
        jumpDelayInput.onchange = (e) => {
            profile.jumpDelay = e.target.value;
        };
        div.append(jumpDelayInput);

        const markDelayInput = createInputWithLabel("Mark Delay: ", profile.markDelay, "(μs)");
        markDelayInput.onchange = (e) => {
            profile.markDelay = e.target.value;
        };
        div.append(markDelayInput);

        const polygonDelayInput = createInputWithLabel("Polygon Delay: ", profile.polygonDelay, "(μs)");
        polygonDelayInput.onchange = (e) => {
            profile.polygonDelay = e.target.value;
        };
        div.append(polygonDelayInput);

        // "Delete This Velocity Profile" Button
        const button = document.createElement("button");
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
