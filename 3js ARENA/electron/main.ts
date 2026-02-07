// =============================================================================
// Electron main process — creates the native desktop window
// =============================================================================

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;

// Vite dev server URL from env
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    title: 'SUPERMECHAFIGHTER ULTRAREALITY 3600 OF DOOM',
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#000000',
  });

  // Enable hardware acceleration
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'));
  }
}

// ---- IPC: Save file to disk (used by map generator dev tool) ----

ipcMain.handle(
  'save-arena-image',
  async (_event, { filename, base64Data }: { filename: string; base64Data: string }) => {
    try {
      const envDir = path.join(
        app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'),
        'public',
        'assets',
        'environments'
      );
      if (!fs.existsSync(envDir)) {
        fs.mkdirSync(envDir, { recursive: true });
      }
      const filePath = path.join(envDir, filename);
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
);

ipcMain.handle('list-arena-images', async () => {
  try {
    const envDir = path.join(
      app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'),
      'public',
      'assets',
      'environments'
    );
    if (!fs.existsSync(envDir)) return [];
    return fs.readdirSync(envDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  } catch {
    return [];
  }
});

// ---- IPC: Quit application ----

ipcMain.on('quit-app', () => {
  app.quit();
});

// ---- Lifecycle ----

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
