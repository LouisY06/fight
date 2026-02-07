// =============================================================================
// index.ts — WebSocket relay server for SUPERMECHAFIGHTER
// Deploy to Railway. Clients connect via WebSocket.
// =============================================================================

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  createRoom,
  joinRoom,
  findMatch,
  cancelMatch,
  getOpponent,
  removePlayer,
  getStats,
} from './rooms.js';
import type { ClientMessage } from './protocol.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Health check endpoint
app.get('/', (_req, res) => {
  const stats = getStats();
  res.json({
    status: 'ok',
    game: 'SUPERMECHAFIGHTER ULTRAREALITY 3600 OF DOOM',
    ...stats,
  });
});

// ---- WebSocket handling ----

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws: WebSocket) => {
  console.log(`[+] Player connected (${wss.clients.size} total)`);

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      // ---- Lobby ----

      case 'create_room': {
        const room = createRoom(ws);
        send(ws, {
          type: 'room_created',
          roomId: room.id,
          playerSlot: 'player1',
        });
        console.log(`[room] Created ${room.id}`);
        break;
      }

      case 'join_room': {
        const room = joinRoom(ws, msg.roomId);
        if (!room) {
          send(ws, { type: 'error', message: 'Room not found or full' });
          break;
        }
        send(ws, {
          type: 'room_joined',
          roomId: room.id,
          playerSlot: 'player2',
        });
        // Notify the other player
        const host = room.players.find((p) => p.slot === 'player1');
        if (host) send(host.ws, { type: 'opponent_joined' });
        send(ws, { type: 'opponent_joined' });
        console.log(`[room] ${room.id} — player2 joined`);
        break;
      }

      case 'find_match': {
        const room = findMatch(ws);
        if (room) {
          // Match found — notify both players
          for (const p of room.players) {
            send(p.ws, {
              type: 'match_found',
              roomId: room.id,
              playerSlot: p.slot,
            });
            send(p.ws, { type: 'opponent_joined' });
          }
          console.log(`[match] Paired in room ${room.id}`);
        }
        // If no match yet, player sits in queue — they'll be notified when matched
        break;
      }

      case 'cancel_match': {
        cancelMatch(ws);
        break;
      }

      // ---- Gameplay relay ----

      case 'player_input': {
        const opponent = getOpponent(ws);
        if (opponent) {
          send(opponent, {
            type: 'opponent_input',
            position: msg.position,
            rotation: msg.rotation,
            isSwinging: msg.isSwinging,
            isBlocking: msg.isBlocking,
          });
        }
        break;
      }

      case 'damage_event': {
        const opponent = getOpponent(ws);
        if (opponent) {
          send(opponent, {
            type: 'opponent_damage',
            target: msg.target,
            amount: msg.amount,
          });
        }
        break;
      }

      case 'game_start': {
        const opponent = getOpponent(ws);
        if (opponent) {
          send(opponent, {
            type: 'opponent_game_start',
            themeId: msg.themeId,
          });
        }
        break;
      }

      case 'round_end': {
        const opponent = getOpponent(ws);
        if (opponent) {
          send(opponent, {
            type: 'opponent_round_end',
            winner: msg.winner,
          });
        }
        break;
      }

      case 'set_username': {
        const opponent = getOpponent(ws);
        if (opponent) {
          send(opponent, {
            type: 'opponent_username',
            username: msg.username,
          });
        }
        break;
      }

      default:
        send(ws, { type: 'error', message: `Unknown message type` });
    }
  });

  ws.on('close', () => {
    const opponent = removePlayer(ws);
    if (opponent) {
      send(opponent, { type: 'opponent_left' });
    }
    console.log(`[-] Player disconnected (${wss.clients.size} total)`);
  });

  ws.on('error', (err) => {
    console.error('[ws error]', err.message);
  });
});

// ---- Start ----

server.listen(PORT, () => {
  console.log(`\n  SUPERMECHAFIGHTER server running on port ${PORT}\n`);
});
