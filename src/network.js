/**
 * WebSocket client for two-player pose relay.
 */

export class NetworkClient {
  constructor(url = 'ws://localhost:8080') {
    this.ws = null;
    this.url = url;
    this.playerId = null;
    this.side = null; // 'left' or 'right'
    this.connected = false;
    this.opponentPose = null;   // Latest opponent worldLandmarks
    this.opponentWeapon = 'none';
    this.opponentConnected = false;
    this._onStatusChange = null;
  }

  set onStatusChange(fn) {
    this._onStatusChange = fn;
  }

  connect() {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch {
        console.warn('WebSocket connection failed — running solo');
        resolve(false);
        return;
      }

      this.ws.onopen = () => {
        this.connected = true;
        console.log('Connected to relay server');
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'welcome') {
          this.playerId = data.id;
          this.side = data.side;
          console.log(`Assigned as Player ${data.id} (${data.side})`);
          resolve(true);
        }

        if (data.type === 'pose') {
          this.opponentPose = data.worldLandmarks;
          this.opponentWeapon = data.weapon || 'none';
          this.opponentConnected = true;
        }

        if (data.type === 'player_joined') {
          this.opponentConnected = true;
          if (this._onStatusChange) this._onStatusChange('opponent_joined');
        }

        if (data.type === 'player_left') {
          this.opponentConnected = false;
          this.opponentPose = null;
          if (this._onStatusChange) this._onStatusChange('opponent_left');
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.opponentConnected = false;
        console.log('Disconnected from relay server');
      };

      this.ws.onerror = () => {
        this.connected = false;
        console.warn('WebSocket error — running solo');
        resolve(false);
      };

      // Timeout if server not available
      setTimeout(() => {
        if (!this.connected) {
          console.warn('WebSocket timeout — running solo');
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Send local player's pose data to the server.
   */
  sendPose(worldLandmarks, weapon) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'pose',
      worldLandmarks,
      weapon,
    }));
  }
}
