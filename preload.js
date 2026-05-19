const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Step 1: OCR Methods
    selectPdf: () => ipcRenderer.invoke('dialog:selectPdf'),
    extractData: (filePath) => ipcRenderer.invoke('python:extract', filePath),

    // Step 2: Downloader Methods
    downloadReports: (serialNumbers) => ipcRenderer.invoke('node:download', serialNumbers),
    openFolder: (folderPath) => ipcRenderer.invoke('shell:openFolder', folderPath)
});