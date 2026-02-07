// =============================================================================
// Electron preload — exposes safe IPC bridges to the renderer
// =============================================================================

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveArenaImage: (filename: string, base64Data: string) =>
    ipcRenderer.invoke('save-arena-image', { filename, base64Data }),

  listArenaImages: () => ipcRenderer.invoke('list-arena-images'),

  platform: process.platform,
});
