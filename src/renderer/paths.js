// Renderer functions grab paths from one place to avoid constantly having different __dirname stuff everywhere
// IPC is used because it's much less ambiguous where a given script is being run if we always grab it from main.js
const ipc = require("electron").ipcRenderer;
module.exports.GetUIPath = () => {
    return ipc.sendSync("get-ui-path");
};

module.exports.GetBackendPath = () => {
    return ipc.sendSync("get-backend-path");
};
