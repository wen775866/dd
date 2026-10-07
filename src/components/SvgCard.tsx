import React, { useState } from 'react';
import { Card } from '../types/game';
import { getCardImagePath, CARD_BACK_IMAGE } from '../utils/cardAssets';
import { SUIT_SYMBOLS } from '../utils/chudadiRules';

interface SvgCardProps {
  card?: Card;
  showBack?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'mini' | 'sm' | 'md' | 'lg';
  className?: string;
  badgeIndex?: number;
}

export const SvgCard: React.FC<SvgCardProps> = ({
  card,
  showBack = false,
  isSelected = false,
  onClick,
  size = 'md',
  className = '',
  badgeIndex,
}) => {
  const [imgError, setImgError] = useState(false);

  // Dimension presets (Aspect ratio is ~ 1 : 1.45 standard playing card)
  // Enlarge cards significantly for clearer visibility:
  // mini: 28x40 -> 36x50
  // sm: 40x56 -> 48x68
  // md: 48x68 -> 60x84
  // lg: (human hand) enlarged to w-18 h-26 sm:w-24 sm:h-34 md:w-28 md:h-40
  const sizeClasses = {
    mini: 'w-8 h-12 sm:w-10 sm:h-14',
    sm: 'w-11 h-16 sm:w-14 sm:h-20',
    md: 'w-14 h-20 sm:w-18 sm:h-26',
    lg: 'w-18 h-26 sm:w-22 sm:h-32 md:w-26 md:h-38',
  }[size];

  if (showBack || !card) {
    return (
      <div
        onClick={onClick}
        className={`relative rounded-[3px] overflow-hidden shadow-md border border-slate-400/40 select-none bg-slate-900 ${sizeClasses} ${className}`}
      >
        <img
          src={CARD_BACK_IMAGE}
          alt="Card Back"
          className="w-full h-full object-cover rounded-[3px]"
          loading="eager"
        />
      </div>
    );
  }

  const imageSrc = getCardImagePath(card);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-[3px] overflow-hidden select-none transition-all duration-150 cursor-pointer ${sizeClasses} ${
        isSelected
          ? '-translate-y-4 ring-2 ring-amber-400 shadow-xl shadow-amber-500/40 brightness-105 scale-105 z-20'
          : 'hover:-translate-y-1.5 shadow-md hover:shadow-lg'
      } ${className}`}
    >
      {/* Index badge (e.g. for Termux keyboard selection #1..#17) */}
      {typeof badgeIndex === 'number' && (
        <span
          className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shadow-sm z-30 ${
            isSelected
              ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-500'
              : 'bg-slate-900/90 text-slate-300 border border-slate-700'
          }`}
        >
          #{badgeIndex}
        </span>
      )}

      {/* Primary SVG Card Image */}
      {!imgError ? (
        <img
          src={imageSrc}
          alt={`${card.suit} ${card.rank}`}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain rounded-[3px] drop-shadow-sm pointer-events-none"
          loading="eager"
        />
      ) : (
        /* Graceful Fallback if image fails to render */
        <div className="w-full h-full rounded-[3px] bg-white border border-slate-300 p-1 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs sm:text-sm font-black ${
                card.color === 'red' ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {card.rank}
            </span>
            <span
              className={`text-[11px] ${
                card.color === 'red' ? 'text-red-600' : 'text-slate-800'
              }`}
            >
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>

          <div
            className={`text-center font-bold text-lg sm:text-2xl ${
              card.color === 'red' ? 'text-red-600' : 'text-slate-800'
            }`}
          >
            {SUIT_SYMBOLS[card.suit]}
          </div>

          <div className="flex justify-end text-[10px] font-bold text-slate-400">
            {card.displayRank}
          </div>
        </div>
      )}
    </div>
  );
};
