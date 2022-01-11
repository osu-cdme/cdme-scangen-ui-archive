const { getSegmentsFromBuild, getPointsOfSegment } = require('../common');

// Given a click location on the svg, return the closest segment to that point
function getClosestSegment (x, y, build) {
  let closestSegment = null;
  let closestDistance = Infinity;

  for (const segment of getSegmentsFromBuild(build)) {
    // TODO: Probably best to scale this based on zoom level or bounding box, as this'll start to get unperformant very quickly with longer vectors
    const INTERVAL = 0.1; // mm
    for (const point of getPointsOfSegment(segment, INTERVAL)) {
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance < closestDistance) {
        closestSegment = segment;
        closestDistance = distance;
      }
    }
  }
  return closestSegment;
}

function getHTMLSegmentFromNumber (number) {
  return document.getElementById(`segment-${number}`);
}

// When the user clicks on a segment, update the segment's style
function toggleSegment (segment) {
  wipeSelectedSegments();
  segment.classList.toggle('selected');
}

function wipeSelectedSegments () {
  const segments = document.querySelectorAll('.selected');
  segments.forEach((segment) => {
    segment.classList.remove('selected');
  });
}

function RenderSegmentInfo (segment, build) {
  // Render Segment Information
  document.getElementById('p1').textContent = `p1: (${segment.x1}, ${segment.y1})`;
  document.getElementById('p2').textContent = `p2: (${segment.x2}, ${segment.y2})`;
  if (segment.segmentID !== null) {
    document.getElementById('segmentID').textContent = `ID: ${segment.segmentID}`;
  }

  // Render Segment Style Information
  const segmentStyle = build.segmentStyles.find((segStyle) => segStyle.id === segment.segStyle);
  if (segmentStyle === undefined) throw new Error('Segment Style ' + segmentStyle.id + 'not found');
  document.getElementById('segmentStyleID').textContent = `ID: ${segmentStyle.id}`;
  document.getElementById('segmentStyleLaserMode').textContent = `Laser Mode: ${segmentStyle.laserMode}`;
  document.getElementById('travelersList').textContent = ''; // Need to clear each time we redraw, otherwise they keep getting appended
  if (segmentStyle.travelers.length !== 0) {
    for (let i = 0; i < segmentStyle.travelers.length; i++) {
      const traveler = segmentStyle.travelers[i];
      const li = document.createElement('li');
      const travelerNumber = document.createElement('h5');
      travelerNumber.textContent = `Traveler ${i + 1}`;
      const travelerID = document.createElement('p');
      travelerID.textContent = 'ID: ' + traveler.id;
      const travelerPower = document.createElement('p');
      travelerPower.textContent = 'Power: ' + traveler.power;
      const travelerSpotSize = document.createElement('p');
      travelerSpotSize.textContent = 'Spot Size: ' + traveler.spotSize;
      const travelerSyncDelay = document.createElement('p');
      travelerSyncDelay.textContent = 'Sync Delay: ' + traveler.syncDelay;
      li.appendChild(travelerNumber);
      li.appendChild(travelerID);
      li.appendChild(travelerPower);
      li.appendChild(travelerSpotSize);
      li.appendChild(travelerSyncDelay);
      if (traveler.wobble != null) {
        const travelerWobble = document.createElement('h6');
        travelerWobble.textContent = 'Wobble';
        const wobbleOn = document.createElement('p');
        wobbleOn.textContent = 'On: ' + traveler.wobble.on;
        const wobbleFreq = document.createElement('p');
        wobbleFreq.textContent = 'Freq: ' + traveler.wobble.freq;
        const wobbleShape = document.createElement('p');
        wobbleShape.textContent = 'Shape: ' + traveler.wobble.shape;
        const wobbleTransAmp = document.createElement('p');
        wobbleTransAmp.textContent = 'transAmp: ' + traveler.wobble.transAmp;
        const wobbleLongAmp = document.createElement('p');
        wobbleLongAmp.textContent = 'longAmp: ' + traveler.wobble.longAmp;
        li.appendChild(travelerWobble);
        li.appendChild(wobbleOn);
        li.appendChild(wobbleFreq);
        li.appendChild(wobbleShape);
        li.appendChild(wobbleTransAmp);
        li.appendChild(wobbleLongAmp);
      }
      document.getElementById('travelersList').appendChild(li);
    }
  }

  // Render Velocity Profile Information
  const velocityProfile = build.velocityProfiles.find((velocityProfile) => velocityProfile.id === segmentStyle.velocityProfileID);
  if (velocityProfile === undefined) throw new Error('Velocity Profile ' + velocityProfile.id + 'not found');
  document.getElementById('velocityProfileID').textContent = `ID: ${velocityProfile.id}`;
  document.getElementById('velocityProfileVelocity').textContent = `Velocity: ${velocityProfile.velocity}`;
  document.getElementById('velocityProfileMode').textContent = `Mode: ${velocityProfile.mode}`;
  document.getElementById('velocityProfileJumpDelay').textContent = `Jump Delay: ${velocityProfile.jumpDelay}`;
  document.getElementById('velocityProfileMarkDelay').textContent = `Mark Delay: ${velocityProfile.markDelay}`;
  document.getElementById('velocityProfilePolygonDelay').textContent = `Polygon Delay: ${velocityProfile.polygonDelay}`;
  document.getElementById('velocityProfileLaserOnDelay').textContent = `Laser On Delay: ${velocityProfile.laserOnDelay}`;
  document.getElementById('velocityProfileLaserOffDelay').textContent = `Laser Off Delay: ${velocityProfile.laserOffDelay}`;
}

exports.RenderSegmentInfo = RenderSegmentInfo;
exports.getClosestSegment = getClosestSegment;
exports.getHTMLSegmentFromNumber = getHTMLSegmentFromNumber;
exports.toggleSegment = toggleSegment;
