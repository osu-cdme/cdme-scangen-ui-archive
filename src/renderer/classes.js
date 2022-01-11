exports.BoundingBox = class BoundingBox {
  constructor () {
    this.minX = 99999999; // Using Number.MAX_VALUE just doesn't work right for comparisons, for whatever reason
    this.minY = 99999999;
    this.maxX = -99999999;
    this.maxY = -99999999;
  }
};
