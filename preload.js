const { contextBridge, ipcRenderer } = require('electron');

// We expose specific, safe APIs to the frontend UI
contextBridge.exposeInMainWorld('electronAPI', {
    // Tells the backend to open a Windows File Picker
    selectPdf: () => ipcRenderer.invoke('dialog:selectPdf'),
    
    // Tells the backend to run Python on a specific file path
    extractData: (filePath) => ipcRenderer.invoke('python:extract', filePath)
});