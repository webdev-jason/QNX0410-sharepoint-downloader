const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  // Create the native desktop browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // The preload script acts as a secure bridge between the UI and the OS
      preload: path.join(__dirname, 'preload.js'),
      // Security best practices: keep Node integration disabled in the UI
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the frontend UI
  mainWindow.loadFile('index.html');
}

// When Electron is ready, create the window
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // macOS specific functionality: re-create a window if dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});