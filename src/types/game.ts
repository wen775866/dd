/**
 * 锄大地 (Big Two / Big 2) types and definitions
 */

export type Suit = 'spade' | 'heart' | 'club' | 'diamond';

export interface Card {
  id: string;          // e.g. "spade-2", "diamond-3"
  suit: Suit;
  rank: string;        // "3".."10", "J", "Q", "K", "A", "2"
  displayRank: string; // "3", "10", "J", "Q", "K", "A", "2"
  rankValue: number;   // 3..15 (3=3, ..., A=14, 2=15)
  suitValue: number;   // diamond=1, club=2, heart=3, spade=4
  totalValue: number;  // rankValue * 10 + suitValue
  color: 'red' | 'black';
}

export type HandType =
  | 'PASS'
  | 'SINGLE'          // 单张
  | 'PAIR'            // 对子
  | 'TRIPLE'          // 三条
  | 'STRAIGHT'        // 顺子 (五张)
  | 'FLUSH'           // 同花 (五张)
  | 'FULL_HOUSE'      // 葫芦 (三带二)
  | 'FOUR_OF_A_KIND'  // 铁支 (四带一)
  | 'STRAIGHT_FLUSH'; // 同花顺 (五张)

export interface CardHand {
  type: HandType;
  cards: Card[];
  categoryWeight: number; // 1 for single/pair/triple, 10=Straight, 20=Flush, 30=FullHouse, 40=FourOfAKind, 50=StraightFlush
  primaryValue: number;   // Used for comparing hands of the same type/category
  suitValue: number;      // Used for comparing suits
}

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  isAI: boolean;
  score: number;       // 金币 / 积分
  avatar: string;
  position: 'bottom' | 'left' | 'top' | 'right'; // 4 玩家方位
  rankTitle?: string;
  lastActionText?: string;
}

export type GamePhase =
  | 'LOBBY'             // 游戏大厅
  | 'DEALING'           // 洗牌发牌
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
  badge: string;
  mode: 'classic' | 'express' | 'master'; // 经典场 / 快速场 / 雀圣至尊场
}

export interface UserProfile {
  nickname: string;
  avatar: string;
  coins: number;         // 锄大地金币
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
  action: 'PLAY' | 'PASS';
  hand?: CardHand;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  room: RoomConfig;
  players: Player[];           // 4 玩家
  currentPlayerIndex: number;  // 当前出牌玩家 (0, 1, 2, 3)
  starterCardId: string;       // 首出必备牌 (如方块3: "diamond-3")
  isFirstTrick: boolean;       // 是否是首局首出
  lastValidHand: {
    playerId: string;
    hand: CardHand;
  } | null;
  passCount: number;           // 连续 Pass 计数 (达到 3 时领牌者重新任意出牌)
  trickLeaderIndex: number;    // 当前轮的领牌玩家
  history: PlayHistoryItem[];
  winnerIndex: number | null;
  roundNumber: number;
  multiplier: number;          // 结算加倍乘数 (若出2清牌x2，铁支/同花顺清牌x4)
}
