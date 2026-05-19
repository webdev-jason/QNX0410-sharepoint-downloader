const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, 
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  
  // --- STEP 1: OCR IPC LISTENERS ---
  ipcMain.handle('dialog:selectPdf', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Scanned PDF',
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (!canceled) {
      return filePaths[0];
    }
    return null;
  });

  ipcMain.handle('python:extract', (event, filePath) => {
    return new Promise((resolve, reject) => {
      const pythonExe = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
      const scriptPath = path.join(__dirname, 'extractor.py');

      execFile(pythonExe, [scriptPath, filePath], (error, stdout, stderr) => {
        if (error) {
          console.error('Python Error:', stderr);
          resolve({ success: false, error: stderr || error.message });
          return;
        }
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          resolve({ success: false, error: 'Failed to parse Python output.' });
        }
      });
    });
  });

  // --- STEP 2: DOWNLOADER IPC LISTENERS ---
  ipcMain.handle('node:download', async (event, serialNumbers) => {
    try {
      const userProfile = os.homedir();
      
      let sourceFolder = path.join(userProfile, 'proteor.com', 'QualityControlDataSync - GC_Outoing_QC');
      
      if (!fs.existsSync(sourceFolder)) {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: 'Select the Synced GC_Outgoing_QC Folder',
          properties: ['openDirectory']
        });
        if (canceled) return { success: false, error: 'SharePoint folder selection canceled.' };
        sourceFolder = filePaths[0];
      }

      const today = new Date().toISOString().split('T')[0];
      const destFolder = path.join(userProfile, 'Downloads', `${today} - QNX0401 Test Reports`);
      
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      let foundCount = 0;
      let missingCount = 0;
      let missingSerials = [];

      const allFiles = fs.readdirSync(sourceFolder);

      for (const sn of serialNumbers) {
        const matches = allFiles.filter(f => f.startsWith(sn) && f.toLowerCase().endsWith('.pdf'));

        if (matches.length > 0) {
          let newestFile = matches[0];
          let newestTime = fs.statSync(path.join(sourceFolder, newestFile)).mtimeMs;

          for (let i = 1; i < matches.length; i++) {
            const stats = fs.statSync(path.join(sourceFolder, matches[i]));
            if (stats.mtimeMs > newestTime) {
              newestTime = stats.mtimeMs;
              newestFile = matches[i];
            }
          }

          fs.copyFileSync(path.join(sourceFolder, newestFile), path.join(destFolder, newestFile));
          foundCount++;
        } else {
          missingCount++;
          missingSerials.push(sn);
        }
      }

      // REMOVED: shell.openPath(destFolder); -> We no longer force the folder open!

      return { success: true, foundCount, missingCount, missingSerials, destFolder };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shell:openFolder', (event, folderPath) => {
    shell.openPath(folderPath);
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});