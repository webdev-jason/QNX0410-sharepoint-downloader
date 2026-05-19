const { contextBridge } = require('electron');

// We expose specific, safe APIs to the frontend UI
contextBridge.exposeInMainWorld('electronAPI', {
    // We will add functions here later, like:
    // runPythonScript: () => ipcRenderer.invoke('run-python')
});