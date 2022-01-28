const path = require("path");
const building = false;
module.exports.GetUIPath = () => {
    if (building) return path.join(__dirname, "..", "..", "..");
    return path.join(__dirname, "..", "..");
};

module.exports.GetBackendPath = () => {
    if (building) return path.join(__dirname, "..", "..", "..", "cdme-scangen");
    return path.join(__dirname, "..", "..", "..", "cdme-scangen");
};
