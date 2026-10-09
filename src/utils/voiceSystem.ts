/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Voice Synthesis, Dialects & Audio Chat Engine for 锄大地 (Big Two)
export type VoiceDialect = 'mandarin' | 'sichuan' | 'cantonese' | 'dongbei' | 'anime';

export interface VoiceActor {
  id: string;
  name: string;
  pitch: number;
  rate: number;
  lang: string;
  avatar: string;
  roleDescription: string;
}

export const DIALECT_OPTIONS: { id: VoiceDialect; label: string; desc: string; icon: string }[] = [
  { id: 'mandarin', label: '经典普通话', desc: '字正腔圆，沉稳大气', icon: '🎙️' },
  { id: 'sichuan', label: '川味麻辣风', desc: '巴适得板，幽默风趣', icon: '🌶️' },
  { id: 'cantonese', label: '粤语情怀风', desc: '港式粤韵，原汁原味', icon: '🇭🇰' },
  { id: 'dongbei', label: '东北豪爽风', desc: '干脆利落，霸气连击', icon: '❄️' },
  { id: 'anime', label: '萌系二次元', desc: '软萌活力，趣味互动', icon: '✨' },
];

export const CHARACTER_VOICE_PROFILES: Record<string, VoiceActor> = {
  'player-0': { id: 'player-0', name: '玩家(南)', pitch: 1.05, rate: 1.05, lang: 'zh-CN', avatar: '😎', roleDescription: '主视角选手' },
  'player-1': { id: 'player-1', name: '西家(左)', pitch: 0.88, rate: 0.98, lang: 'zh-CN', avatar: '🤖', roleDescription: '沉着老手' },
  'player-2': { id: 'player-2', name: '北家(顶)', pitch: 1.15, rate: 1.08, lang: 'zh-CN', avatar: '👑', roleDescription: '牌局大师' },
  'player-3': { id: 'player-3', name: '东家(右)', pitch: 1.25, rate: 1.12, lang: 'zh-CN', avatar: '🐱', roleDescription: '机敏萌友' },
};

const SUIT_SPEECH: Record<string, string> = {
  spade: '黑桃',
  heart: '红桃',
  club: '草花',
  diamond: '方块',
};

const RANK_SPEECH: Record<string, string> = {
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A',
  '2': '2',
};

// Dialect-specific card call mappings for Big Two
const DIALECT_HAND_LINES: Record<VoiceDialect, Record<string, string[]>> = {
  mandarin: {
    PASS: ['要不起', '不要', '过', '过牌'],
    BEAT: ['管上！', '大你！', '压死！', '走你！'],
    STRAIGHT: ['顺子！', '一条龙顺子！'],
    FLUSH: ['同花！'],
    FULL_HOUSE: ['葫芦！三带二！'],
    FOUR_OF_A_KIND: ['铁支！四带一！'],
    STRAIGHT_FLUSH: ['同花顺！横扫全场！'],
    TWO_CARDS_LEFT: ['小心，我就剩两张牌了！'],
    ONE_CARD_LEFT: ['报警！我就剩一张牌了！'],
    WIN: ['我清盘跑清啦！第一名！', '赢牌！承让承让！'],
    LOSE: ['惨啦，这把被关门了！', '胜败乃兵家常事！'],
  },
  sichuan: {
    PASS: ['要不起哦', '过嘛过嘛', '要不得'],
    BEAT: ['压到起！', '吃老子一牌！', '管你！'],
    STRAIGHT: ['顺子！巴适得板！'],
    FLUSH: ['同花！安逸！'],
    FULL_HOUSE: ['葫芦！整起走！'],
    FOUR_OF_A_KIND: ['铁支！炸崩你！'],
    STRAIGHT_FLUSH: ['同花顺！天地同寿！'],
    TWO_CARDS_LEFT: ['哎呀，只剩两张牌了撒！'],
    ONE_CARD_LEFT: ['赶紧跑，就剩最后一张了！'],
    WIN: ['哈哈，跑清了，巴适！'],
    LOSE: ['手气背得很，被关门了！'],
  },
  cantonese: {
    PASS: ['要唔起', '過', '唔要'],
    BEAT: ['食住你！', '大你！', '壓死！'],
    STRAIGHT: ['一條龍順子！'],
    FLUSH: ['同花！'],
    FULL_HOUSE: ['葫蘆！三帶二！'],
    FOUR_OF_A_KIND: ['鐵支！大晒！'],
    STRAIGHT_FLUSH: ['同花順！天下無雙！'],
    TWO_CARDS_LEFT: ['得返兩張牌咋！'],
    ONE_CARD_LEFT: ['得返一張牌！睇住呀！'],
    WIN: ['跑清啦！贏到開巷！'],
    LOSE: ['慘啦，被關門三倍！'],
  },
  dongbei: {
    PASS: ['要不起！', '过！', '不要！'],
    BEAT: ['卡你！', '大你！', '杠杠硬！'],
    STRAIGHT: ['顺子！老溜了！'],
    FLUSH: ['同花！老霸道了！'],
    FULL_HOUSE: ['葫芦！带劲！'],
    FOUR_OF_A_KIND: ['铁支！崩得稀碎！'],
    STRAIGHT_FLUSH: ['同花顺！谁与争锋！'],
    TWO_CARDS_LEFT: ['瞧好了，就剩两张了！'],
    ONE_CARD_LEFT: ['就剩一张牌了，要输了吧！'],
    WIN: ['清盘！老铁们承让，老爽了！'],
    LOSE: ['这把点背，下把我必赢！'],
  },
  anime: {
    PASS: ['呜呜要不起~', '过过过~', '不要哦~'],
    BEAT: ['看我的必杀技！', '压制成功！', '嘿呀！'],
    STRAIGHT: ['闪光顺子！✨'],
    FLUSH: ['梦幻同花！🌸'],
    FULL_HOUSE: ['超级葫芦！魔法打击！'],
    FOUR_OF_A_KIND: ['究极铁支！💥'],
    STRAIGHT_FLUSH: ['神圣同花顺！🚀'],
    TWO_CARDS_LEFT: ['注意！仅剩两枚魔法卡！'],
    ONE_CARD_LEFT: ['最后一击准备！只剩一张牌！'],
    WIN: ['耶！跑清胜利！太棒啦！🎉'],
    LOSE: ['虽然输了，但下次一定能赢！✨'],
  },
};

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
  type: 'text' | 'voice' | 'emoji';
  content: string;
  audioUrl?: string;
  durationSec?: number;
  timestamp: number;
}

class VoiceEngine {
  public enabled: boolean = true;
  public dialect: VoiceDialect = 'mandarin';
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordStartTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices().filter(v =>
      v.lang.includes('zh') || v.lang.includes('cmn') || v.lang.includes('CN') || v.lang.includes('HK') || v.lang.includes('TW')
    );
  }

  public setDialect(dialect: VoiceDialect) {
    this.dialect = dialect;
  }

  public speak(text: string, playerId: string = 'player-0', onEnd?: () => void) {
    if (!this.enabled || typeof window === 'undefined' || !this.synth) {
      onEnd?.();
      return;
    }

    try {
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const profile = CHARACTER_VOICE_PROFILES[playerId] || CHARACTER_VOICE_PROFILES['player-0'];

      let pitch = profile.pitch;
      let rate = profile.rate;
      if (this.dialect === 'anime') {
        pitch += 0.25;
        rate += 0.08;
      } else if (this.dialect === 'sichuan') {
        rate += 0.06;
      } else if (this.dialect === 'dongbei') {
        pitch -= 0.08;
        rate += 0.04;
      }

      utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
      utterance.rate = Math.max(0.5, Math.min(2.0, rate));
      utterance.lang = this.dialect === 'cantonese' ? 'zh-HK' : 'zh-CN';

      if (this.voices.length > 0) {
        if (this.dialect === 'cantonese') {
          const hkVoice = this.voices.find(v => v.lang.includes('HK') || v.lang.includes('cantonese'));
          if (hkVoice) utterance.voice = hkVoice;
          else utterance.voice = this.voices[0];
        } else {
          utterance.voice = this.voices[0];
        }
      }

      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();

      this.synth.speak(utterance);
    } catch {
      onEnd?.();
    }
  }

  // Spoken voice line for played hands in Big Two
  public getHandVoiceLine(handType: string, cards: { rank: string; suit: string; displayRank: string }[]): string {
    if (!cards || cards.length === 0) {
      const passLines = DIALECT_HAND_LINES[this.dialect]?.PASS || DIALECT_HAND_LINES.mandarin.PASS;
      return passLines[Math.floor(Math.random() * passLines.length)];
    }

    const dict = DIALECT_HAND_LINES[this.dialect] || DIALECT_HAND_LINES.mandarin;

    switch (handType) {
      case 'SINGLE': {
        const c = cards[0];
        const suitName = SUIT_SPEECH[c.suit] || '';
        const rankName = RANK_SPEECH[c.rank] || c.displayRank;
        return `${suitName}${rankName}`;
      }
      case 'PAIR': {
        const c = cards[0];
        const rankName = RANK_SPEECH[c.rank] || c.displayRank;
        return `对${rankName}`;
      }
      case 'TRIPLET': {
        const c = cards[0];
        const rankName = RANK_SPEECH[c.rank] || c.displayRank;
        return `三个${rankName}`;
      }
      case 'STRAIGHT':
        return dict.STRAIGHT?.[0] || '顺子！';
      case 'FLUSH':
        return dict.FLUSH?.[0] || '同花！';
      case 'FULL_HOUSE':
        return dict.FULL_HOUSE?.[0] || '葫芦！';
      case 'FOUR_OF_A_KIND':
        return dict.FOUR_OF_A_KIND?.[0] || '铁支！';
      case 'STRAIGHT_FLUSH':
        return dict.STRAIGHT_FLUSH?.[0] || '同花顺！';
      default:
        return '出牌';
    }
  }

  public getActionVoiceLine(action: 'TWO_CARDS_LEFT' | 'ONE_CARD_LEFT' | 'WIN' | 'LOSE' | 'PASS'): string {
    const dict = DIALECT_HAND_LINES[this.dialect] || DIALECT_HAND_LINES.mandarin;
    const lines = dict[action] || DIALECT_HAND_LINES.mandarin[action] || ['出牌'];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  public async startRecording(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.recordStartTime = Date.now();
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);
      return true;
    } catch {
      return false;
    }
  }

  public stopRecording(): Promise<{ audioUrl: string; durationSec: number } | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const duration = Math.max(1, Math.round((Date.now() - this.recordStartTime) / 1000));

      this.mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
          this.mediaRecorder = null;
          resolve({ audioUrl, durationSec: duration });
        } catch {
          resolve(null);
        }
      };

      this.mediaRecorder.stop();
    });
  }
}

export const voiceEngine = new VoiceEngine();
