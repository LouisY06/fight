import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

export function startServer(port = 8080) {
  const wss = new WebSocketServer({ port });
  const players = new Map();
  let nextId = 1;

  wss.on('connection', (ws) => {
    const id = nextId++;
    players.set(id, ws);
    console.log(`Player ${id} connected (${players.size} total)`);

    ws.send(JSON.stringify({ type: 'welcome', id, side: id % 2 === 1 ? 'left' : 'right' }));
    broadcast({ type: 'player_joined', id }, ws);

    ws.on('message', (raw) => {
      const msg = raw.toString();
      for (const [pid, player] of players) {
        if (pid !== id && player.readyState === 1) {
          player.send(msg);
        }
      }
    });

    ws.on('close', () => {
      players.delete(id);
      console.log(`Player ${id} disconnected (${players.size} total)`);
      broadcast({ type: 'player_left', id });
    });
  });

  function broadcast(data, exclude) {
    const msg = JSON.stringify(data);
    for (const [, player] of players) {
      if (player !== exclude && player.readyState === 1) {
        player.send(msg);
      }
    }
  }

  console.log(`Mecha-Mime relay server running on ws://localhost:${port}`);
  return wss;
}

// Run standalone when executed directly: node server.js
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  startServer();
}
