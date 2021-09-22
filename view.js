const path = require("path")
const building = false

console.log("__dirname" + __dirname);
const pathToResources = building ? path.join(__dirname, "../") : path.join(__dirname, "../cdme-scangen/")
console.log("pathToResources: " + pathToResources);
var natsort = require("natsort");

let parent = document.getElementById("rightPart")
const fs = require("fs")

let files = fs.readdirSync(path.join(pathToResources, "LayerFiles"))
console.log("Files: " + files)

// TODO: Why the hell does this not work?
// console.log(natsort)
// let filesSorted = files.sort(natsort)
// console.log("Natsorted: " + filesSorted)

files.forEach(file => {
    
    let text = document.createElement("p")
    text.textContent = file

    let img = document.createElement("img")
    img.src = path.join(pathToResources, "LayerFiles", file)

    let container = document.createElement("div")
    container.classList.toggle("layerimage")
    container.appendChild(text)
    container.appendChild(img)

    parent.appendChild(container)
})