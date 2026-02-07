// =============================================================================
// Type declarations for the Electron preload bridge
// =============================================================================

export interface ElectronAPI {
  saveArenaImage: (
    filename: string,
    base64Data: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  listArenaImages: () => Promise<string[]>;
  quit?: () => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
