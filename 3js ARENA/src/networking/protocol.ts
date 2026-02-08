// =============================================================================
// protocol.ts — Client-side message type definitions (mirrors server/protocol.ts)
// =============================================================================

// ---- Messages client sends ----

export interface CreateRoomMsg { type: 'create_room' }
export interface JoinRoomMsg { type: 'join_room'; roomId: string }
export interface FindMatchMsg { type: 'find_match' }
export interface CancelMatchMsg { type: 'cancel_match' }

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
  /** The target's new health after this damage (authoritative from attacker) */
  newHealth: number;
}

export interface GameStartMsg {
  type: 'game_start';
  themeId: string;
}

export interface RoundEndMsg {
  type: 'round_end';
  winner: 'player1' | 'player2' | 'draw';
}

export interface SetUsernameMsg {
  type: 'set_username';
  username: string;
}

export interface SpellCastMsg {
  type: 'spell_cast';
  spellType: string;
  origin: [number, number, number];
  direction: [number, number, number];
}

export type ClientMessage =
  | CreateRoomMsg | JoinRoomMsg | FindMatchMsg | CancelMatchMsg
  | PlayerInputMsg | DamageEventMsg | GameStartMsg | RoundEndMsg
  | SetUsernameMsg | SpellCastMsg;

// ---- Messages client receives ----

export interface RoomCreatedMsg {
  type: 'room_created'; roomId: string; playerSlot: 'player1' | 'player2';
}
export interface RoomJoinedMsg {
  type: 'room_joined'; roomId: string; playerSlot: 'player1' | 'player2';
}
export interface MatchFoundMsg {
  type: 'match_found'; roomId: string; playerSlot: 'player1' | 'player2';
}
export interface OpponentJoinedMsg { type: 'opponent_joined' }
export interface OpponentLeftMsg { type: 'opponent_left' }
export interface ErrorMsg { type: 'error'; message: string }

export interface OpponentInputMsg {
  type: 'opponent_input';
  position: [number, number, number];
  rotation: [number, number];
  isSwinging: boolean;
  isBlocking: boolean;
}

export interface OpponentDamageMsg {
  type: 'opponent_damage';
  target: 'player1' | 'player2';
  amount: number;
  /** The target's new health after this damage (authoritative from attacker) */
  newHealth: number;
}

export interface OpponentGameStartMsg {
  type: 'opponent_game_start';
  themeId: string;
}

export interface OpponentRoundEndMsg {
  type: 'opponent_round_end';
  winner: 'player1' | 'player2' | 'draw';
}

export interface OpponentUsernameMsg {
  type: 'opponent_username';
  username: string;
}

export interface OpponentSpellCastMsg {
  type: 'opponent_spell_cast';
  spellType: string;
  origin: [number, number, number];
  direction: [number, number, number];
}

export type ServerMessage =
  | RoomCreatedMsg | RoomJoinedMsg | MatchFoundMsg
  | OpponentJoinedMsg | OpponentLeftMsg | ErrorMsg
  | OpponentInputMsg | OpponentDamageMsg | OpponentGameStartMsg | OpponentRoundEndMsg
  | OpponentUsernameMsg | OpponentSpellCastMsg;
