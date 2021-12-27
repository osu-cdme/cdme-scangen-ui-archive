// Behavior linked to the navbar that we don't want to have to duplicate across all the files

// Don't let the user visit the 'View Vectors' page if there aren't XML files to view
// If fs hasn't been imported yet, import it
if (typeof fs === "undefined") {
    const fs = require("fs");
}

document.getElementById("ToViewVectorsScreen").addEventListener("click", (e) => {
    if (fs.readdirSync(path.join(__dirname, "xml")).length === 0) {
        e.preventDefault();
        alert("No XML files to view! Generate some via the 'Generate Vectors' tab.");
    }
});
