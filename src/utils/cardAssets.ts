import { Card } from '../types/game';

/**
 * Returns the public path to the SVG playing card asset.
 * Files are located in /cards/ (e.g. /cards/ace_of_spades.svg, /cards/red_joker.svg)
 */
export function getCardImagePath(card: Card): string {
  let rankStr = card.rank.toLowerCase();
  if (rankStr === 'j') rankStr = 'jack';
  else if (rankStr === 'q') rankStr = 'queen';
  else if (rankStr === 'k') rankStr = 'king';
  else if (rankStr === 'a') rankStr = 'ace';

  const suitPluralMap: Record<string, string> = {
    spade: 'spades',
    heart: 'hearts',
    club: 'clubs',
    diamond: 'diamonds',
  };

  const suitStr = suitPluralMap[card.suit] || 'spades';
  return `/cards/${rankStr}_of_${suitStr}.svg`;
}

export const CARD_BACK_IMAGE = '/cards/back.svg';
