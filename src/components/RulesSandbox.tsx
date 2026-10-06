import React, { useState } from 'react';
import { Card, CardHand } from '../types/game';
import { SUIT_SYMBOLS, analyzeHand, canBeat, createDeck, getHandDescription, sortCards } from '../utils/doudizhuRules';
import { aiChoosePlay } from '../utils/doudizhuAI';
import { Sparkles, CheckCircle2, XCircle, HelpCircle, Layers, Swords, RotateCcw } from 'lucide-react';

export const RulesSandbox: React.FC = () => {
  const all54Cards = React.useMemo(() => sortCards(createDeck()), []);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  // Comparison test state
  const [handA, setHandA] = useState<CardHand | null>(null);
  const [handB, setHandB] = useState<CardHand | null>(null);

  const toggleSelectCard = (card: Card) => {
    setSelectedCards(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : sortCards([...prev, card])
    );
  };

  const clearSelection = () => setSelectedCards([]);

  // Preset quick picks
  const selectPreset = (type: string) => {
    switch (type) {
      case 'straight':
        // 3-4-5-6-7
        setSelectedCards(
          all54Cards.filter(c => ['3', '4', '5', '6', '7'].includes(c.rank) && c.suit === 'spade')
        );
        break;
      case 'pairs':
        // 33 44 55
        setSelectedCards(
          all54Cards.filter(
            c =>
              ['3', '4', '5'].includes(c.rank) &&
              (c.suit === 'spade' || c.suit === 'heart')
          )
        );
        break;
      case 'airplane':
        // 333 444 + 5 + 6
        const c3 = all54Cards.filter(c => c.rank === '3').slice(0, 3);
        const c4 = all54Cards.filter(c => c.rank === '4').slice(0, 3);
        const wing1 = all54Cards.find(c => c.rank === '5')!;
        const wing2 = all54Cards.find(c => c.rank === '6')!;
        setSelectedCards(sortCards([...c3, ...c4, wing1, wing2]));
        break;
      case 'bomb':
        setSelectedCards(all54Cards.filter(c => c.rank === '9'));
        break;
      case 'rocket':
        setSelectedCards(all54Cards.filter(c => c.suit === 'joker'));
        break;
      default:
        break;
    }
  };

  const currentAnalysis = analyzeHand(selectedCards);

  // AI response preview
  const mockAIPlayer = {
    id: 'ai-tester',
    name: 'AI 裁判',
    role: 'FARMER' as const,
    cards: all54Cards.slice(0, 17),
    isAI: true,
    score: 0,
    avatar: '',
  };
  const aiPlay = currentAnalysis
    ? aiChoosePlay(
        mockAIPlayer,
        mockAIPlayer.cards,
        { playerId: 'player-tester', hand: currentAnalysis },
        [mockAIPlayer]
      )
    : [];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            斗地主出牌规则与算法实验室
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            实时验证顺子、连对、飞机带翅膀、四带二、炸弹等 13 种牌型判定与压牌算法。
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 mr-1">预设牌型:</span>
          <button
            onClick={() => selectPreset('straight')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            顺子(3-7)
          </button>
          <button
            onClick={() => selectPreset('pairs')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            连对(334455)
          </button>
          <button
            onClick={() => selectPreset('airplane')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            飞机带单(333444+56)
          </button>
          <button
            onClick={() => selectPreset('bomb')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            炸弹(9999)
          </button>
          <button
            onClick={() => selectPreset('rocket')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            王炸
          </button>
        </div>
      </div>

      {/* Main Grid: Card Picker & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 54 Cards Selector */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              点击卡牌挑选组合 (已选 {selectedCards.length} 张):
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              清空重置
            </button>
          </div>

          <div className="grid grid-cols-9 sm:grid-cols-13 gap-1 overflow-y-auto max-h-[360px] p-1 bg-slate-950 rounded-lg border border-slate-800/80">
            {all54Cards.map(card => {
              const isSelected = selectedCards.some(c => c.id === card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => toggleSelectCard(card)}
                  className={`flex flex-col items-center justify-between p-1 rounded border text-[11px] font-bold transition-all cursor-pointer h-14 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400 scale-95 shadow-md'
                      : 'bg-slate-900 text-slate-200 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  <span className={card.color === 'red' && !isSelected ? 'text-red-400' : ''}>
                    {card.rank}
                  </span>
                  <span className={`text-xs ${card.color === 'red' && !isSelected ? 'text-red-400' : ''}`}>
                    {SUIT_SYMBOLS[card.suit]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Real-time Rule Inspector */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              牌型分析诊断报告
            </span>

            {selectedCards.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                请在左侧选择至少 1 张牌进行规则检测
              </div>
            ) : currentAnalysis ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">合法牌型！</div>
                    <div className="text-xs text-emerald-300">
                      判定结果: {getHandDescription(currentAnalysis)}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5 font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">类型常量:</span>
                    <span className="text-indigo-400">{currentAnalysis.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">主权值 (MainValue):</span>
                    <span className="text-amber-400">{currentAnalysis.mainValue} 点</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">牌张总数:</span>
                    <span>{currentAnalysis.cards.length} 张</span>
                  </div>
                  {currentAnalysis.length && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">序列长度:</span>
                      <span>{currentAnalysis.length} 阶</span>
                    </div>
                  )}
                </div>

                {/* AI response preview */}
                <div className="p-3 rounded-lg bg-slate-950 border border-indigo-500/30 text-xs">
                  <div className="text-indigo-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    电脑 AI 应对预测:
                  </div>
                  <div className="text-slate-400">
                    {aiPlay.length > 0 ? (
                      <span className="text-slate-200">
                        AI 手牌将打出: {aiPlay.map(c => `${SUIT_SYMBOLS[c.suit]}${c.rank}`).join(' ')} 压制
                      </span>
                    ) : (
                      <span className="text-slate-500">AI 评估认为无法压制，将选择 [不要]</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs leading-relaxed">
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm mb-1">非法组合 (无法出牌)</div>
                  当前挑选的 {selectedCards.length} 张牌不满足单张、对子、三带、顺子、连对、飞机、四带二或炸弹规则。请检查是否有不连续的牌，或带牌数量不符合要求。
                </div>
              </div>
            )}
          </div>

          {/* Quick Rules Reference */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-200 block mb-1">斗地主关键规则判定：</span>
            <p>• 顺子至少 5 张连续，且不能包含 2 和 大小王。</p>
            <p>• 连对至少 3 对连续 (如 334455)，同样不能含 2 和 大小王。</p>
            <p>• 王炸 (大王+小王) 最大，可压制任何炸弹与牌型。</p>
            <p>• 炸弹 (4张同点数) 可压制除王炸外的任意非炸弹牌型。</p>
          </div>
        </div>
      </div>
    </div>
  );
};
