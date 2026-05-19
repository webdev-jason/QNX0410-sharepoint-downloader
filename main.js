const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  
  // IPC Listener 1: Open the native Windows file picker
  ipcMain.handle('dialog:selectPdf', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Scanned PDF',
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (!canceled) {
      return filePaths[0]; // Return the selected path to the frontend
    }
    return null;
  });

  // IPC Listener 2: Execute the Python script
  ipcMain.handle('python:extract', (event, filePath) => {
    return new Promise((resolve, reject) => {
      // Point explicitly to the Python executable inside our venv
      const pythonExe = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
      const scriptPath = path.join(__dirname, 'extractor.py');

      // Run the Python script in a child process
      execFile(pythonExe, [scriptPath, filePath], (error, stdout, stderr) => {
        if (error) {
          console.error('Python Error:', stderr);
          resolve({ success: false, error: stderr || error.message });
          return;
        }
        
        try {
          // Parse the JSON printed by the Python script
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          resolve({ success: false, error: 'Failed to parse Python output.' });
        }
      });
    });
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});