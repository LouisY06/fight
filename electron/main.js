import { app, BrowserWindow, session, systemPreferences } from 'electron';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const HTTP_PORT = 9123;

let mainWindow;
let httpServer;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

function startFileServer(distPath, port) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(distPath, urlPath === '/' ? 'index.html' : urlPath);

      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';

      try {
        const data = await readFile(filePath);
        res.writeHead(200, {
          'Content-Type': mime,
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      } catch (err) {
        console.error('File server error:', err);
        res.writeHead(500);
        res.end('Server error');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`Static file server on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

app.whenReady().then(async () => {
  // Request macOS camera permission
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('camera');
    console.log('Camera permission status:', status);
    if (status !== 'granted') {
      await systemPreferences.askForMediaAccess('camera');
    }
  }

  // Auto-grant Chromium-level permissions (camera, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  // In production, serve dist/ via local HTTP (WASM needs HTTP, not file://)
  if (!isDev) {
    const distPath = path.join(__dirname, '../dist');
    httpServer = await startFileServer(distPath, HTTP_PORT);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Mecha-Mime',
    backgroundColor: '#88aacc',
    webPreferences: {
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${HTTP_PORT}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  if (httpServer) httpServer.close();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) app.quit();
});
