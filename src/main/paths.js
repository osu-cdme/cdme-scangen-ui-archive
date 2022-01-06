const path = require("path");
module.exports.GetUIPath = () => {
    return path.join(__dirname, "..", "..");
};

module.exports.GetBackendPath = () => {
    return path.join(__dirname, "..", "..", "..", "cdme-scangen");
};
