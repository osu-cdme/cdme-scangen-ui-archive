// Getting file paths quickly gets complicated, so we source all the info from the main backend Electron process then have files use IPC to get paths
const ipc = require("electron").ipcRenderer;
module.exports.GetUIPath = () => {
    return ipc.sendSync("get-ui-path");
};

module.exports.GetBackendPath = () => {
    return ipc.sendSync("get-backend-path");
};
