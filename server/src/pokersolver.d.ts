declare module "pokersolver" {
  export class Hand {
    static solve(cards: string[], game?: string, canDisqualify?: boolean): Hand;
    static winners(hands: Hand[]): Hand[];
    cards: unknown[];
    cardPool: unknown[];
    name: string;
    descr: string;
    rank: number;
  }
}
