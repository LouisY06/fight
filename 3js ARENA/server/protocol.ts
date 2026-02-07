// =============================================================================
// protocol.ts — Shared message types for client <-> server communication
// =============================================================================

// ---- Client -> Server messages ----

export interface CreateRoomMsg {
  type: 'create_room';
}

export interface JoinRoomMsg {
  type: 'join_room';
  roomId: string;
}

export interface FindMatchMsg {
  type: 'find_match';
}

export interface CancelMatchMsg {
  type: 'cancel_match';
}

export interface PlayerInputMsg {
  type: 'player_input';
  position: [number, number, number];
  rotation: [number, number];
  isSwinging: boolean;
  isBlocking: boolean;
}

export interface DamageEventMsg {
  type: 'damage_event';
  target: 'player1' | 'player2';
  amount: number;
}

export interface GameStartMsg {
  type: 'game_start';
  themeId: string;
}

export interface RoundEndMsg {
  type: 'round_end';
  winner: 'player1' | 'player2' | 'draw';
}

export type ClientMessage =
  | CreateRoomMsg
  | JoinRoomMsg
  | FindMatchMsg
  | CancelMatchMsg
  | PlayerInputMsg
  | DamageEventMsg
  | GameStartMsg
  | RoundEndMsg;

// ---- Server -> Client messages ----

export interface RoomCreatedMsg {
  type: 'room_created';
  roomId: string;
  playerSlot: 'player1' | 'player2';
}

export interface RoomJoinedMsg {
  type: 'room_joined';
  roomId: string;
  playerSlot: 'player1' | 'player2';
}

export interface MatchFoundMsg {
  type: 'match_found';
  roomId: string;
  playerSlot: 'player1' | 'player2';
}

export interface OpponentJoinedMsg {
  type: 'opponent_joined';
}

export interface OpponentLeftMsg {
  type: 'opponent_left';
}

export interface ErrorMsg {
  type: 'error';
  message: string;
}

// Relayed messages from opponent (same shape as client messages)
export interface RelayedPlayerInputMsg {
  type: 'opponent_input';
  position: [number, number, number];
  rotation: [number, number];
  isSwinging: boolean;
  isBlocking: boolean;
}

export interface RelayedDamageEventMsg {
  type: 'opponent_damage';
  target: 'player1' | 'player2';
  amount: number;
}

export interface RelayedGameStartMsg {
  type: 'opponent_game_start';
  themeId: string;
}

export interface RelayedRoundEndMsg {
  type: 'opponent_round_end';
  winner: 'player1' | 'player2' | 'draw';
}

export type ServerMessage =
  | RoomCreatedMsg
  | RoomJoinedMsg
  | MatchFoundMsg
  | OpponentJoinedMsg
  | OpponentLeftMsg
  | ErrorMsg
  | RelayedPlayerInputMsg
  | RelayedDamageEventMsg
  | RelayedGameStartMsg
  | RelayedRoundEndMsg;
