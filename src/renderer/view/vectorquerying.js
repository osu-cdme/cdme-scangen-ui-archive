// Given a click location on the svg, return the closest segment to that point
function getClosestSegment(x, y, build) {
    let closestSegment = null;
    let closestDistance = Infinity;
    build.trajectories.forEach((trajectory) => {
        if (trajectory.path === null) return; // It's allowed for a Trajectory to be zero-length, in which case it has no path
        trajectory.path.segments.forEach((segment) => {
            // It's complicated and intensive to sample every point, so we just get the endpoints and the midpoint
            const d1 = Math.sqrt(Math.pow(segment.x1 - x, 2) + Math.pow(segment.y1 - y, 2));
            const d2 = Math.sqrt(Math.pow(segment.x2 - x, 2) + Math.pow(segment.y2 - y, 2));
            let midX = (segment.x1 + segment.x2) / 2,
                midY = (segment.y1 + segment.y2) / 2;
            const d3 = Math.sqrt(Math.pow(midX - x, 2) + Math.pow(midY - y, 2));
            if (d1 < closestDistance || d2 < closestDistance || d3 < closestDistance) {
                closestSegment = segment;
                closestDistance = Math.min(d1, d2, d3);
            }
        });
    });
    return closestSegment;
}

function getHTMLSegmentFromNumber(number) {
    return document.getElementById(`segment-${number}`);
}

// When the user clicks on a segment, update the segment's style
function toggleSegment(segment) {
    wipeSelectedSegments();
    segment.classList.toggle("selected");
}

function wipeSelectedSegments() {
    const segments = document.querySelectorAll(".selected");
    segments.forEach((segment) => {
        segment.classList.remove("selected");
    });
}

function RenderSegmentInfo(segment, build) {
    // Render Segment Information
    document.getElementById("p1").textContent = `p1: (${segment.x1}, ${segment.y1})`;
    document.getElementById("p2").textContent = `p2: (${segment.x2}, ${segment.y2})`;
    if (segment.segmentID !== null) {
        document.getElementById("segmentID").textContent = `ID: ${segment.segmentID}`;
    }

    // Render Segment Style Information
    let segmentStyle = build.segmentStyles.find((segStyle) => segStyle.id === segment.segStyle);
    if (segmentStyle === undefined) throw new Error("Segment Style " + segStyle.id + "not found");
    document.getElementById("segmentStyleID").textContent = `ID: ${segmentStyle.id}`;
    document.getElementById("segmentStyleLaserMode").textContent = `Laser Mode: ${segmentStyle.laserMode}`;
    document.getElementById("travelersList").textContent = ""; // Need to clear each time we redraw, otherwise they keep getting appended
    if (segmentStyle.travelers.length !== 0) {
        for (let i = 0; i < segmentStyle.travelers.length; i++) {
            let traveler = segmentStyle.travelers[i];
            let li = document.createElement("li");
            let travelerNumber = document.createElement("h5");
            travelerNumber.textContent = `Traveler ${i + 1}`;
            let travelerID = document.createElement("p");
            travelerID.textContent = "ID: " + traveler.id;
            let travelerPower = document.createElement("p");
            travelerPower.textContent = "Power: " + traveler.power;
            let travelerSpotSize = document.createElement("p");
            travelerSpotSize.textContent = "Spot Size: " + traveler.spotSize;
            let travelerSyncDelay = document.createElement("p");
            travelerSyncDelay.textContent = "Sync Delay: " + traveler.syncDelay;
            li.appendChild(travelerNumber);
            li.appendChild(travelerID);
            li.appendChild(travelerPower);
            li.appendChild(travelerSpotSize);
            li.appendChild(travelerSyncDelay);
            if (traveler.wobble != null) {
                let travelerWobble = document.createElement("h6");
                travelerWobble.textContent = "Wobble";
                let wobbleOn = document.createElement("p");
                wobbleOn.textContent = "On: " + traveler.wobble.on;
                let wobbleFreq = document.createElement("p");
                wobbleFreq.textContent = "Freq: " + traveler.wobble.freq;
                let wobbleShape = document.createElement("p");
                wobbleShape.textContent = "Shape: " + traveler.wobble.shape;
                let wobbleTransAmp = document.createElement("p");
                wobbleTransAmp.textContent = "transAmp: " + traveler.wobble.transAmp;
                let wobbleLongAmp = document.createElement("p");
                wobbleLongAmp.textContent = "longAmp: " + traveler.wobble.longAmp;
                li.appendChild(travelerWobble);
                li.appendChild(wobbleOn);
                li.appendChild(wobbleFreq);
                li.appendChild(wobbleShape);
                li.appendChild(wobbleTransAmp);
                li.appendChild(wobbleLongAmp);
            }
            document.getElementById("travelersList").appendChild(li);
        }
    }

    // Render Velocity Profile Information
    let velocityProfile = build.velocityProfiles.find((velocityProfile) => velocityProfile.id === segmentStyle.velocityProfileID);
    if (velocityProfile === undefined) throw new Error("Velocity Profile " + velocityProfile.id + "not found");
    document.getElementById("velocityProfileID").textContent = `ID: ${velocityProfile.id}`;
    document.getElementById("velocityProfileVelocity").textContent = `Velocity: ${velocityProfile.velocity}`;
    document.getElementById("velocityProfileMode").textContent = `Mode: ${velocityProfile.mode}`;
    document.getElementById("velocityProfileJumpDelay").textContent = `Jump Delay: ${velocityProfile.jumpDelay}`;
    document.getElementById("velocityProfileMarkDelay").textContent = `Mark Delay: ${velocityProfile.markDelay}`;
    document.getElementById("velocityProfilePolygonDelay").textContent = `Polygon Delay: ${velocityProfile.polygonDelay}`;
    document.getElementById("velocityProfileLaserOnDelay").textContent = `Laser On Delay: ${velocityProfile.laserOnDelay}`;
    document.getElementById("velocityProfileLaserOffDelay").textContent = `Laser Off Delay: ${velocityProfile.laserOffDelay}`;
}

exports.RenderSegmentInfo = RenderSegmentInfo;
exports.getClosestSegment = getClosestSegment;
exports.getHTMLSegmentFromNumber = getHTMLSegmentFromNumber;
exports.toggleSegment = toggleSegment;
