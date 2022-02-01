const path = require("path");
const app = require("electron").app;

// For anyone curious, I didn't realize app.isPackaged was a thing until like two months into development, so I seriously just switched a boolean flag in here whenever I wanted to build... at least I figured it out eventually
module.exports.GetUIPath = () => {
    if (app.isPackaged) return path.join(__dirname, "..", "..", "..");
    return path.join(__dirname, "..", "..");
};

module.exports.GetBackendPath = () => {
    if (app.isPackaged) return path.join(__dirname, "..", "..", "..", "cdme-scangen");
    return path.join(__dirname, "..", "..", "..", "cdme-scangen");
};
