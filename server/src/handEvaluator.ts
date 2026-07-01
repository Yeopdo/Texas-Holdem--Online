import { Hand } from "pokersolver";
import { remainingDeck, shuffle } from "./deck";
import { Recommendation } from "./types";

export function solveBestHand(holeCards: string[], communityCards: string[]): Hand {
  return Hand.solve([...holeCards, ...communityCards]);
}

/**
 * Monte Carlo equity estimate for the hero against `numOpponents` unknown hands,
 * given the community cards revealed so far. Opponents' actual hole cards are
 * intentionally NOT used (even though the server knows them) so the recommendation
 * reflects real "equity vs. an unknown range", same as a human would reason about it.
 */
export function estimateEquity(
  heroHole: string[],
  communityCards: string[],
  numOpponents: number,
  iterations = 400
): { winProbability: number; tieProbability: number } {
  if (numOpponents <= 0) {
    return { winProbability: 1, tieProbability: 0 };
  }

  const known = [...heroHole, ...communityCards];
  const baseDeck = remainingDeck(known);
  const cardsNeededForCommunity = 5 - communityCards.length;

  let wins = 0;
  let ties = 0;

  for (let i = 0; i < iterations; i++) {
    const deck = shuffle(baseDeck);
    let cursor = 0;

    const opponentHoles: string[][] = [];
    for (let o = 0; o < numOpponents; o++) {
      opponentHoles.push([deck[cursor], deck[cursor + 1]]);
      cursor += 2;
    }

    const fullCommunity = [...communityCards, ...deck.slice(cursor, cursor + cardsNeededForCommunity)];
    cursor += cardsNeededForCommunity;

    const heroHand = Hand.solve([...heroHole, ...fullCommunity]);
    const opponentHands = opponentHoles.map((hole) => Hand.solve([...hole, ...fullCommunity]));

    const allHands = [heroHand, ...opponentHands];
    const winners = Hand.winners(allHands);

    if (winners.includes(heroHand)) {
      if (winners.length === 1) {
        wins++;
      } else {
        ties++;
      }
    }
  }

  return {
    winProbability: wins / iterations,
    tieProbability: ties / iterations,
  };
}

/**
 * Simple pot-odds based heuristic. Not a GTO solver -- just enough to give a
 * friend group a sanity-checked suggestion next to their hole cards.
 */
export function recommendAction(params: {
  equity: number; // winProbability + tieProbability(fraction credited)
  pot: number;
  callAmount: number;
  bigBlind: number;
  canCheck: boolean;
}): Recommendation {
  const { equity, pot, callAmount, bigBlind, canCheck } = params;

  if (callAmount <= 0) {
    // Nothing to call: choice is check or bet for value.
    if (equity >= 0.6) {
      const suggestedAmount = Math.max(bigBlind, Math.round(pot * 0.6));
      return {
        winProbability: equity,
        tieProbability: 0,
        suggestedAction: "bet",
        suggestedAmount,
        reasoning: `승률 ${(equity * 100).toFixed(0)}%로 우세하니 팟의 약 60%(${suggestedAmount}) 베팅을 추천합니다.`,
      };
    }
    return {
      winProbability: equity,
      tieProbability: 0,
      suggestedAction: "check",
      reasoning: `승률 ${(equity * 100).toFixed(0)}%로 애매하니 체크로 다음 카드를 보는 걸 추천합니다.`,
    };
  }

  const potOdds = callAmount / (pot + callAmount);

  if (equity < potOdds * 0.8) {
    return {
      winProbability: equity,
      tieProbability: 0,
      suggestedAction: canCheck ? "check" : "fold",
      reasoning: `승률(${(equity * 100).toFixed(0)}%)이 콜에 필요한 팟 오즈(${(potOdds * 100).toFixed(
        0
      )}%)보다 낮아 폴드를 추천합니다.`,
    };
  }

  if (equity < potOdds * 1.3) {
    return {
      winProbability: equity,
      tieProbability: 0,
      suggestedAction: "call",
      reasoning: `승률(${(equity * 100).toFixed(0)}%)이 팟 오즈(${(potOdds * 100).toFixed(0)}%)와 비슷해 콜을 추천합니다.`,
    };
  }

  const suggestedAmount = Math.max(callAmount * 2, Math.round((pot + callAmount) * 0.65));
  return {
    winProbability: equity,
    tieProbability: 0,
    suggestedAction: "raise",
    suggestedAmount,
    reasoning: `승률(${(equity * 100).toFixed(0)}%)이 팟 오즈보다 확연히 높아 레이즈(${suggestedAmount})를 추천합니다.`,
  };
}

export function buildRecommendation(params: {
  heroHole: string[];
  communityCards: string[];
  numOpponents: number;
  pot: number;
  callAmount: number;
  bigBlind: number;
  canCheck: boolean;
}): Recommendation {
  const { winProbability, tieProbability } = estimateEquity(
    params.heroHole,
    params.communityCards,
    params.numOpponents
  );
  const equity = winProbability + tieProbability * 0.5;
  const rec = recommendAction({
    equity,
    pot: params.pot,
    callAmount: params.callAmount,
    bigBlind: params.bigBlind,
    canCheck: params.canCheck,
  });
  return { ...rec, winProbability, tieProbability };
}
