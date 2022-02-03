const pt = document.getElementById('mainsvg').createSVGPoint();
const svg = document.getElementById('mainsvg');
svg.onwheel = e => {
  e.preventDefault();

  // Get cursor pos relative to svg coords
  pt.x = e.clientX;
  pt.y = e.clientY;
  const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());

  // Get current viewbox
  let box = svg.getAttribute('viewBox');
  box = box.split(/\s+|,/);
  box[0] = parseFloat(box[0]);
  box[1] = parseFloat(box[1]);
  box[2] = parseFloat(box[2]);
  box[3] = parseFloat(box[3]);

  const width = box[2];
  const height = box[3];
  const previousX = box[0] + width / 2;
  const previousY = box[1] + height / 2;

  // Zoom in
  let newWidth, newHeight;
  let newX, newY;
  if (ScrollDirectionIsUp(e)) {
    newWidth = width * 0.9;
    newHeight = height * 0.9;

    // Weighted average; move a little towards the new point, but not by much
    newX = (-newWidth / 2 + 0.9 * previousX + 0.1 * cursorpt.x).toFixed(2);
    newY = (-newHeight / 2 + 0.9 * previousY + 0.1 * cursorpt.y).toFixed(2);
  } else {
    newWidth = width * 1.1;
    newHeight = height * 1.1;

    // Don't move the origin when zooming out; it just feels unnatural
    newX = (-newWidth / 2 + previousX).toFixed(4);
    newY = (-newHeight / 2 + previousY).toFixed(4);
  }

  // TODO: Stroke width should be adjusted based on how far we're zoomed in
  // My brief attempts resulted in way too many iterations and lookups to be efficient
  // Best approach is probably to store each segment type (contour, hatch, jump) in a separate array which lets us map super quickly to them

  const viewboxStr = '' + newX + ' ' + newY + ' ' + newWidth + ' ' + newHeight;
  svg.setAttribute('viewBox', viewboxStr); // Basically lets us define our bounds
};

function ScrollDirectionIsUp (event) {
  if (event.wheelDelta) {
    return event.wheelDelta > 0;
  }
  return event.deltaY < 0;
}
