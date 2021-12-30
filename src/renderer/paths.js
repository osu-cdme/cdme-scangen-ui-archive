// Renderer functions that grab path values from the UI; makes building and such dramatically easier
const ipc = require("electron").ipcRenderer;
module.exports.GetUIPath = () => {
    return ipc.sendSync("get-ui-path");
};

module.exports.GetBackendPath = () => {
    return ipc.sendSync("get-backend-path");
};
