const path = require("path")
const building = false
const pathToResources = building ? path.join(__dirname, "../") : path.join(__dirname, "../cdme-scangen/")

let parent = document.getElementById("rightPart")
const fs = require("fs")
let files = fs.readdirSync(path.join(pathToResources, "LayerFiles"))

// Puts a picture of each layer on the webpage
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

// Renders each provided XML file
fs.readdirSync(path.join(__dirname, "xml")).forEach(file => {
    fetch(path.join(__dirname, "xml", file))
    .then(response => response.text())
    .then(data => {
        let parser = new DOMParser()
        doc = parser.parseFromString(data, "text/xml") // XMLDocument (https://developer.mozilla.org/en-US/docs/Web/API/XMLDocument)
        getTrajectories(doc)
    })
})

/* 
Given a Document object that conforms to the OASIS XML Schema, returns a data object of the following form:
{
    "contours": [
        [start x, start y, end x, end y], ...
    ], 
    "hatches": [
        [start x, start y, end x, end y], ... 
    ]
}
*/
function getTrajectories(doc) {

    let contours = [], hatches = []
    let paths = doc.getElementsByTagName("Path")
    for (let path of paths) {

        // Debug 
        // console.log("Path: ")
        // console.log(path)

        // Save a reference to the array that we should append to
        // (needs saved before we lose a reference to the first child)
        let appendArr = path.firstChild.nextSibling.textContent === "contour" ? contours : hatches

        // Skip over the overall path parameters to get to the actual geometric numbers
        // ...don't ask. Can't find a better way to do it.
        // It seems to treat the textContent itself as a sibling as well
        let currentNode = path.childNodes.item(9) // Start at <Start> tag; text inside is also counted as tags
        let x1 = currentNode.firstChild.textContent, y1 = currentNode.lastChild.textContent
        let x2, y2
        while (currentNode.nextSibling != null) {

            // Connect current x1/y1 to next x2/y2 and add to list
            currentNode = currentNode.nextSibling.nextSibling
            x2 = currentNode.lastChild.firstChild.textContent
            y2 = currentNode.lastChild.lastChild.textContent 
            appendArr.push([x1, y1, x2, y2])

            // Cycle second vertex to first vertex; next loop iteration will set second vertex to next value
            x1 = x2 
            y1 = y2
        }
    }

    console.log("contours: ", contours)
    console.log("hatches: ", hatches)
}