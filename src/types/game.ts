/**
 * Dou Dizhu (斗地主) types and definitions
 */

export type Suit = 'spade' | 'heart' | 'club' | 'diamond' | 'joker';

export interface Card {
  id: string;        // e.g. "spade-3", "joker-black"
  suit: Suit;
  rank: string;      // "3".."10", "J", "Q", "K", "A", "2", "BJ", "RJ"
  displayRank: string; // "3", "J", "小王", "大王"
  value: number;     // 3..17 (BJ=16, RJ=17)
  color: 'red' | 'black';
}

export type HandType =
  | 'PASS'
  | 'SINGLE'
  | 'PAIR'
  | 'TRIO'
  | 'TRIO_SINGLE'
  | 'TRIO_PAIR'
  | 'STRAIGHT'
  | 'CONSECUTIVE_PAIRS'
  | 'AIRPLANE'
  | 'AIRPLANE_SINGLES'
  | 'AIRPLANE_PAIRS'
  | 'FOUR_TWO_SINGLES'
  | 'FOUR_TWO_PAIRS'
  | 'BOMB'
  | 'ROCKET';

export interface CardHand {
  type: HandType;
  cards: Card[];
  mainValue: number; // For comparisons (e.g. trio rank in trio-with-single, highest card in straight)
  length?: number;   // Length for straights, airplane trios count
}

export type Role = 'LANDLORD' | 'FARMER' | 'UNKNOWN';

export interface Player {
  id: string;
  name: string;
  role: Role;
  cards: Card[];
  isAI: boolean;
  score: number;
  avatar: string;
  biddingScore?: number; // 0 (pass), 1, 2, 3
}

export type GamePhase =
  | 'WAITING'
  | 'DEALING'
  | 'BIDDING'
  | 'PLAYING'
  | 'GAME_OVER';

export interface PlayHistoryItem {
  playerId: string;
  playerName: string;
  isAI: boolean;
  action: 'BID' | 'PLAY' | 'PASS';
  hand?: CardHand;
  bidScore?: number;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  landlordIndex: number;
  bottomCards: Card[];
  lastValidHand: {
    playerId: string;
    hand: CardHand;
  } | null;
  passCount: number;
  multiplier: number;
  bombCount: number;
  history: PlayHistoryItem[];
  winnerIndex: number | null;
  roundNumber: number;
}
