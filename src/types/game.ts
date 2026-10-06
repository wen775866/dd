/**
 * Dou Dizhu (斗地主) types and definitions
 */

export type Suit = 'spade' | 'heart' | 'club' | 'diamond' | 'joker';

export interface Card {
  id: string;          // e.g. "spade-3", "joker-black"
  suit: Suit;
  rank: string;        // "3".."10", "J", "Q", "K", "A", "2", "BJ", "RJ"
  displayRank: string; // "3", "J", "小王", "大王"
  value: number;       // 3..17 (BJ=16, RJ=17)
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
  mainValue: number; // For comparisons
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
  isDoubled?: boolean;       // 是否加倍
  hasSuperDoubled?: boolean;  // 是否超级加倍
  biddingScore?: number;
  robCount?: number;
}

export type GamePhase =
  | 'LOBBY'             // 游戏大厅
  | 'DEALING'           // 发牌动画
  | 'CALL_LANDLORD'     // 叫地主
  | 'ROB_LANDLORD'      // 抢地主
  | 'DOUBLING'          // 加倍阶段
  | 'PLAYING'           // 出牌对战
  | 'GAME_OVER';        // 结算

export interface RoomConfig {
  id: string;
  name: string;
  tag: string;
  baseScore: number;     // 底分
  entryMin: number;      // 准入豆数
  maxMultiplier: number; // 封顶倍数
  colorTheme: string;
  isNoShuffle?: boolean; // 不洗牌模式
  badge: string;
}

export interface UserProfile {
  nickname: string;
  avatar: string;
  coins: number;         // 欢乐豆
  diamonds: number;      // 钻石
  wins: number;
  losses: number;
  title: string;
  lastCheckinDate?: string;
  hasCheckedInToday?: boolean;
}

export interface PlayHistoryItem {
  playerId: string;
  playerName: string;
  isAI: boolean;
  action: 'CALL' | 'ROB' | 'DOUBLE' | 'PLAY' | 'PASS';
  hand?: CardHand;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  room: RoomConfig;
  players: Player[];
  currentPlayerIndex: number;
  landlordIndex: number;
  firstCallerIndex: number;  // 第一个叫地主的人
  currentRobberIndex: number;
  lastValidHand: {
    playerId: string;
    hand: CardHand;
  } | null;
  bottomCards: Card[];
  passCount: number;
  multiplier: number;
  bombCount: number;
  isSpring: boolean;         // 春天
  isAntiSpring: boolean;     // 反春天
  history: PlayHistoryItem[];
  winnerIndex: number | null;
  roundNumber: number;
  dealingIndex?: number;     // 发牌动画计数
}
