const SUIT_SYMBOL: Record<string, string> = { h: "♥", d: "♦", c: "♣", s: "♠" };
const RED_SUITS = new Set(["h", "d"]);

export function parseCard(card: string): { rank: string; suit: string; symbol: string; isRed: boolean } {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  return { rank, suit, symbol: SUIT_SYMBOL[suit] ?? suit, isRed: RED_SUITS.has(suit) };
}
