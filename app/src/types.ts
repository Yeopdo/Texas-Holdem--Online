export type ActionType = "fold" | "check" | "call" | "raise" | "allin";

export type BettingRound = "PREFLOP" | "FLOP" | "TURN" | "RIVER" | "SHOWDOWN";

export type TableStatus = "WAITING" | "PLAYING";

export interface SidePot {
  amount: number;
  eligibleSeats: number[];
}

export interface PublicSeatView {
  seatIndex: number;
  nickname: string;
  photoDataUri?: string;
  chips: number;
  connected: boolean;
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
  currentBet: number;
  totalHandBet: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isTurn: boolean;
  hasCards: boolean;
}

export interface PublicState {
  status: TableStatus;
  seats: PublicSeatView[];
  communityCards: string[];
  pot: number;
  sidePots: SidePot[];
  bettingRound: BettingRound | null;
  currentTurnSeat: number | null;
  callAmount: number;
  minRaiseTo: number;
  dealerSeat: number | null;
  smallBlind: number;
  bigBlind: number;
  turnDeadline: number | null;
  lastActionLog: string[];
  mySeatIndex: number | null;
  buyIn: number;
}

export interface Recommendation {
  winProbability: number;
  tieProbability: number;
  suggestedAction: ActionType | "bet";
  suggestedAmount?: number;
  reasoning: string;
}

export interface PrivateHandPayload {
  holeCards: string[];
  recommendation: Recommendation | null;
}

export interface HandResultPayload {
  winners: { seatIndex: number; nickname: string; amount: number; handName?: string }[];
  revealed: { seatIndex: number; holeCards: string[]; handName?: string }[];
  chipsAfter: { seatIndex: number; chips: number }[];
}

export interface JoinPayload {
  deviceId: string;
  nickname: string;
  photoDataUri?: string;
}

export interface ActionPayload {
  type: ActionType;
  amount?: number;
}

export interface StartGamePayload {
  buyIn?: number;
}

export interface ChatMessagePayload {
  seatIndex: number;
  nickname: string;
  text: string;
  ts: number;
}

export interface ActionAnnouncePayload {
  seatIndex: number;
  nickname: string;
  type: ActionType;
  amount?: number;
}
