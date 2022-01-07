// Source https://css-tricks.com/creating-a-panning-effect-for-svg/
// Functionality for svg panning / movement

// We select the SVG into the page
var svg = document.querySelector("svg");

// If browser supports pointer events
if (window.PointerEvent) {
    svg.addEventListener("pointerdown", onPointerDown); // Pointer is pressed
    svg.addEventListener("pointerup", onPointerUp); // Releasing the pointer
    svg.addEventListener("pointerleave", onPointerUp); // Pointer gets out of the SVG area
    svg.addEventListener("pointermove", onPointerMove); // Pointer is moving
} else {
    // Add all mouse events listeners fallback
    svg.addEventListener("mousedown", onPointerDown); // Pressing the mouse
    svg.addEventListener("mouseup", onPointerUp); // Releasing the mouse
    svg.addEventListener("mouseleave", onPointerUp); // Mouse gets out of the SVG area
    svg.addEventListener("mousemove", onPointerMove); // Mouse is moving

    // Add all touch events listeners fallback
    svg.addEventListener("touchstart", onPointerDown); // Finger is touching the screen
    svg.addEventListener("touchend", onPointerUp); // Finger is no longer touching the screen
    svg.addEventListener("touchmove", onPointerMove); // Finger is moving
}

// This function returns an object with X & Y values from the pointer event
var point = svg.createSVGPoint();
function getPointFromEvent(e) {
    point.x = e.clientX;
    point.y = e.clientY;
    point = point.matrixTransform(svg.getScreenCTM().inverse());
    return point;
}

// This variable will be used later for move events to check if pointer is down or not
var isPointerDown = false;

// This variable will contain the original coordinates when the user start pressing the mouse or touching the screen
var pointerOrigin = {
    x: 0,
    y: 0,
};

// Function called by the event listeners when user start pressing/touching
function onPointerDown(event) {
    isPointerDown = true; // We set the pointer as down

    // We get the pointer position on click/touchdown so we can get the value once the user starts to drag
    var pointerPosition = getPointFromEvent(event);
    pointerOrigin.x = pointerPosition.x;
    pointerOrigin.y = pointerPosition.y;
}

function onPointerUp() {
    isPointerDown = false;
}

/* 
// We save the original values from the viewBox
let startingViewbox;
svg.onload = (e) => {
    e.preventDefault();
    startingViewbox = svg.getAttribute("viewBox");
    startingViewbox = startingViewbox.split(/\s+|,/);
    console.log("startingViewbox", startingViewbox);
    viewBox[2] = parseFloat(startingViewbox[2]);
    viewBox[3] = parseFloat(startingViewbox[3]);
};
*/

// Function called by the event listeners when user start moving/dragging
function onPointerMove(event) {
    event.preventDefault();
    if (!isPointerDown) {
        return;
    }

    // This prevent user to do a selection on the page

    // Figure out dx/dy from pointer movement
    var pointerPosition = getPointFromEvent(event);
    console.log("pointerPosition", pointerPosition);
    console.log("pointerOrigin", pointerOrigin);
    let dx = pointerPosition.x - pointerOrigin.x,
        dy = pointerPosition.y - pointerOrigin.y;
    pointerOrigin.x = pointerPosition.x;
    pointerOrigin.y = pointerPosition.y;

    // Determine current viewBox
    var box = svg.getAttribute("viewBox");
    box = box.split(/\s+|,/);
    box[0] = parseFloat(box[0]);
    box[1] = parseFloat(box[1]);
    box[2] = parseFloat(box[2]);
    box[3] = parseFloat(box[3]);
    viewBox = {
        x: box[0],
        y: box[1],
        width: box[2],
        height: box[3],
    };

    // I have no clue why, but setting this .8 to anything closer to 1 (or leaving the number out) leads to a jittering effect where the viewbox jumps between two points
    // This is officially "good enough" I guess though
    let newViewBox = {
        x: viewBox.x - 0.8 * dx,
        y: viewBox.y - 0.8 * dy,
        width: viewBox.width,
        height: viewBox.height,
    };
    console.log("newViewBox", newViewBox);
    var viewBoxString = `${newViewBox.x} ${newViewBox.y} ${viewBox.width} ${viewBox.height}`;
    svg.setAttribute("viewBox", viewBoxString);
}
