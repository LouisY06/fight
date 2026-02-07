// =============================================================================
// rooms.ts — Room management and matchmaking queue
// =============================================================================

import type { WebSocket } from 'ws';

export interface PlayerConnection {
  ws: WebSocket;
  slot: 'player1' | 'player2';
}

export interface Room {
  id: string;
  players: PlayerConnection[];
  createdAt: number;
}

// Active rooms
const rooms = new Map<string, Room>();

// Matchmaking queue
const matchQueue: WebSocket[] = [];

// Generate a 4-character room code
function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure unique
  if (rooms.has(code)) return generateRoomId();
  return code;
}

/**
 * Create a new room. The creator is player1.
 */
export function createRoom(ws: WebSocket): Room {
  const id = generateRoomId();
  const room: Room = {
    id,
    players: [{ ws, slot: 'player1' }],
    createdAt: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

/**
 * Join an existing room by code. The joiner is player2.
 * Returns the room if successful, null if not found or full.
 */
export function joinRoom(ws: WebSocket, roomId: string): Room | null {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return null;
  if (room.players.length >= 2) return null;

  room.players.push({ ws, slot: 'player2' });
  return room;
}

/**
 * Add a player to the matchmaking queue.
 * If a match is found, returns the room. Otherwise returns null.
 */
export function findMatch(ws: WebSocket): Room | null {
  // Check if already in queue
  if (matchQueue.includes(ws)) return null;

  // If someone is waiting, pair them
  if (matchQueue.length > 0) {
    const opponent = matchQueue.shift()!;

    // Make sure opponent is still connected
    if (opponent.readyState !== opponent.OPEN) {
      // Skip disconnected, try again
      return findMatch(ws);
    }

    const room = createRoom(opponent);
    room.players.push({ ws, slot: 'player2' });
    return room;
  }

  // No one waiting — add to queue
  matchQueue.push(ws);
  return null;
}

/**
 * Remove a player from the matchmaking queue.
 */
export function cancelMatch(ws: WebSocket): void {
  const idx = matchQueue.indexOf(ws);
  if (idx !== -1) matchQueue.splice(idx, 1);
}

/**
 * Get the room a player is in.
 */
export function getRoomForPlayer(ws: WebSocket): Room | null {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.ws === ws)) {
      return room;
    }
  }
  return null;
}

/**
 * Get the opponent's WebSocket in the same room.
 */
export function getOpponent(ws: WebSocket): WebSocket | null {
  const room = getRoomForPlayer(ws);
  if (!room) return null;
  const opponent = room.players.find((p) => p.ws !== ws);
  return opponent?.ws ?? null;
}

/**
 * Remove a player from their room. If the room is empty, delete it.
 * Returns the opponent (if any) so they can be notified.
 */
export function removePlayer(ws: WebSocket): WebSocket | null {
  cancelMatch(ws);

  const room = getRoomForPlayer(ws);
  if (!room) return null;

  const opponent = room.players.find((p) => p.ws !== ws)?.ws ?? null;
  room.players = room.players.filter((p) => p.ws !== ws);

  if (room.players.length === 0) {
    rooms.delete(room.id);
  }

  return opponent;
}

/**
 * Get current stats for health check.
 */
export function getStats() {
  return {
    rooms: rooms.size,
    queueLength: matchQueue.length,
  };
}
