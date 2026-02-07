import { app, BrowserWindow, session } from 'electron';
import { startServer } from '../server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const WS_PORT = 8080;

let mainWindow;
let wss;

app.whenReady().then(() => {
  // Start the embedded WebSocket relay server
  wss = startServer(WS_PORT);

  // Auto-grant webcam permission (required for MediaPipe)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(true);
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Mecha-Mime: Phygital Combat',
    backgroundColor: '#667788',
    webPreferences: {
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    // In dev, load from the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  if (wss) wss.close();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    // macOS dock click re-open (simplified — just quit instead)
    app.quit();
  }
});
