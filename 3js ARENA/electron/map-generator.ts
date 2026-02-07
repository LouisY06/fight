// =============================================================================
// Electron main process for the Map Generator dev tool (separate window)
// Launch with: npm run map-generator
// =============================================================================

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'Map Generator — Dev Tool',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
  });

  if (VITE_DEV_SERVER_URL) {
    // In dev, load the map-generator.html page from the Vite server
    const url = VITE_DEV_SERVER_URL.replace(/\/$/, '') + '/map-generator.html';
    win.loadURL(url);
  } else {
    win.loadFile(path.join(process.env.DIST!, 'map-generator.html'));
  }
}

// ---- IPC: Save file to disk ----

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

// ---- Lifecycle ----

app.on('window-all-closed', () => {
  app.quit();
  win = null;
});

app.whenReady().then(createWindow);
