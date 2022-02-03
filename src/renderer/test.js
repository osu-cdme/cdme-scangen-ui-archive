// Purely used for testing functions, not needed for production

const { getSubsegmentsOfSegment } = require("./common");
const result = getSubsegmentsOfSegment({ x1: 0, y1: 0, x2: 1, y2: 1 }, 0.1);
for (const segment of result) {
    console.log(`segment: ${JSON.stringify(segment)}`);
}
