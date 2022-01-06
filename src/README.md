In Electron, apps either run as part of the main process, or as a renderer process. The folders in here correspond to which type of process each file is run as

While the distinction _shouldn't_ matter to us, as we pass in `nodeIntegration: true` in `main.js`, by default the main process runs with Node-level permissions (i.e. access to the file path and so on) and the renderer processes run with browser-level, sandboxed permissions.

Certain packages only work when imported as a backend package vs a frontend package, as well.
