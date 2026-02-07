// =============================================================================
// socket.ts — WebSocket connection singleton
// =============================================================================

import type { ClientMessage, ServerMessage } from './protocol';

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (connected: boolean) => void;

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

class GameSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;

  get isConnected() {
    return this._isConnected;
  }

  /**
   * Connect to the game server.
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }

    try {
      this.ws = new WebSocket(WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[socket] Connected to', WS_URL);
      this._isConnected = true;
      this.notifyStatus(true);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data as string);
        for (const handler of this.messageHandlers) {
          handler(msg);
        }
      } catch (err) {
        console.error('[socket] Failed to parse message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[socket] Disconnected');
      this._isConnected = false;
      this.notifyStatus(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  /**
   * Disconnect from the server.
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    this.notifyStatus(false);
  }

  /**
   * Send a message to the server.
   */
  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /**
   * Subscribe to incoming server messages.
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to connection status changes.
   */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private notifyStatus(connected: boolean) {
    for (const handler of this.statusHandlers) {
      handler(connected);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[socket] Reconnecting...');
      this.connect();
    }, 2000);
  }
}

// Singleton
export const gameSocket = new GameSocket();
