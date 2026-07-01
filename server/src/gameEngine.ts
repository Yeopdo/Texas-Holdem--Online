import { Hand } from "pokersolver";
import { makeDeck, shuffle } from "./deck";
import { buildRecommendation } from "./handEvaluator";
import {
  ActionAnnouncePayload,
  ActionPayload,
  BettingRound,
  ChatMessagePayload,
  HandResultPayload,
  PrivateHandPayload,
  PublicSeatView,
  PublicState,
  Seat,
  SidePot,
  TableStatus,
} from "./types";

const MAX_SEATS = 9;
const DEFAULT_BUY_IN = 1000;
const MIN_BUY_IN = 100;
const MAX_BUY_IN = 1000000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const TURN_SECONDS = 30;
const NEXT_HAND_DELAY_MS = 4000;
const MAX_CHAT_HISTORY = 50;
const MAX_CHAT_LENGTH = 300;

function computeSidePots(seats: Seat[]): SidePot[] {
  const contributors = seats.filter((s) => s.totalHandBet > 0);
  const levels = Array.from(new Set(contributors.map((s) => s.totalHandBet))).sort((a, b) => a - b);
  const pots: SidePot[] = [];
  let prevLevel = 0;
  for (const level of levels) {
    const layerAmount = level - prevLevel;
    const payers = contributors.filter((s) => s.totalHandBet >= level);
    const potAmount = layerAmount * payers.length;
    const eligibleSeats = payers.filter((s) => !s.folded).map((s) => s.seatIndex);
    if (potAmount > 0 && eligibleSeats.length > 0) {
      pots.push({ amount: potAmount, eligibleSeats });
    }
    prevLevel = level;
  }
  return pots;
}

export class GameRoom {
  private seats: (Seat | null)[] = new Array(MAX_SEATS).fill(null);
  private status: TableStatus = "WAITING";
  private communityCards: string[] = [];
  private bettingRound: BettingRound | null = null;
  private dealerSeat: number | null = null;
  private currentTurnSeat: number | null = null;
  private currentBetLevel = 0;
  private minRaiseIncrement = BIG_BLIND;
  private lastActionLog: string[] = [];
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private turnDeadline: number | null = null;
  private nextHandTimer: ReturnType<typeof setTimeout> | null = null;
  private deck: string[] = [];
  private buyIn = DEFAULT_BUY_IN;
  private chatHistory: ChatMessagePayload[] = [];

  onStateChange: () => void = () => {};
  onHandResult: (result: HandResultPayload) => void = () => {};
  onChatMessage: (message: ChatMessagePayload) => void = () => {};
  onActionAnnounce: (announcement: ActionAnnouncePayload) => void = () => {};

  // ---------- membership ----------

  join(deviceId: string, nickname: string, photoDataUri: string | undefined, socketId: string): number {
    const existing = this.seats.find((s) => s && s.deviceId === deviceId) as Seat | undefined;
    if (existing) {
      existing.connected = true;
      existing.socketId = socketId;
      existing.nickname = nickname;
      if (photoDataUri) existing.photoDataUri = photoDataUri;
      this.onStateChange();
      return existing.seatIndex;
    }

    const emptyIndex = this.seats.findIndex((s) => s === null);
    if (emptyIndex === -1) {
      throw new Error("테이블이 가득 찼습니다.");
    }

    const seat: Seat = {
      seatIndex: emptyIndex,
      deviceId,
      nickname,
      photoDataUri,
      chips: this.buyIn,
      connected: true,
      socketId,
      folded: false,
      allIn: false,
      sittingOut: this.status === "PLAYING",
      currentBet: 0,
      totalHandBet: 0,
      holeCards: [],
      hasActed: false,
    };
    this.seats[emptyIndex] = seat;
    this.onStateChange();
    return emptyIndex;
  }

  handleDisconnect(socketId: string) {
    const seat = this.seats.find((s) => s && s.socketId === socketId) as Seat | undefined;
    if (!seat) return;
    seat.connected = false;
    seat.socketId = null;
    this.onStateChange();
  }

  leave(deviceId: string) {
    const seat = this.seats.find((s) => s && s.deviceId === deviceId) as Seat | undefined;
    if (!seat) return;

    if (this.status === "PLAYING" && !seat.folded && this.bettingRound !== "SHOWDOWN" && this.bettingRound !== null) {
      if (this.currentTurnSeat === seat.seatIndex) {
        this.applyAction(seat.seatIndex, { type: "fold" });
      } else {
        seat.folded = true;
        const contenders = this.activeThisHandSeats().filter((s) => !s.folded);
        if (contenders.length === 1) {
          this.awardPotToSingleWinner(contenders[0]);
        }
      }
      seat.pendingLeave = true;
    } else {
      this.seats[seat.seatIndex] = null;
    }
    this.resetRoomIfEmpty();
    this.onStateChange();
  }

  private freePendingLeaveSeats() {
    for (let i = 0; i < this.seats.length; i++) {
      const seat = this.seats[i];
      if (seat && seat.pendingLeave) this.seats[i] = null;
    }
  }

  private resetRoomIfEmpty() {
    if (!this.seats.every((s) => s === null)) return;
    this.clearTurnTimer();
    if (this.nextHandTimer) {
      clearTimeout(this.nextHandTimer);
      this.nextHandTimer = null;
    }
    this.status = "WAITING";
    this.communityCards = [];
    this.bettingRound = null;
    this.dealerSeat = null;
    this.currentTurnSeat = null;
    this.currentBetLevel = 0;
    this.minRaiseIncrement = BIG_BLIND;
    this.lastActionLog = [];
    this.chatHistory = [];
    this.buyIn = DEFAULT_BUY_IN;
  }

  private activeThisHandSeats(): Seat[] {
    return this.seats.filter((s): s is Seat => !!s && !s.sittingOut);
  }

  private connectedPlayableCount(): number {
    return this.seats.filter((s): s is Seat => !!s && !s.sittingOut && s.chips > 0 && s.connected).length;
  }

  // ---------- hand lifecycle ----------

  startGame(buyIn?: number): void {
    if (this.status === "PLAYING") return;
    if (this.connectedPlayableCount() < 2) {
      throw new Error("현재 접속 중인 인원이 2명 이상이어야 시작할 수 있습니다.");
    }

    // Only honor a buy-in choice for a brand new session (nobody has been dealt a
    // hand yet). Once the table has played, "게임 시작" just resumes with existing stacks.
    if (this.dealerSeat === null && buyIn !== undefined) {
      const clamped = Math.round(Math.min(MAX_BUY_IN, Math.max(MIN_BUY_IN, buyIn)));
      this.buyIn = clamped;
      for (const seat of this.seats) {
        if (seat) seat.chips = clamped;
      }
    }

    this.startHand();
  }

  private startHand() {
    if (this.nextHandTimer) {
      clearTimeout(this.nextHandTimer);
      this.nextHandTimer = null;
    }

    // resolve anyone who joined mid-game or was waiting for a rebuy
    for (const seat of this.seats) {
      if (seat && seat.chips > 0) seat.sittingOut = false;
    }
    this.freePendingLeaveSeats();

    const playable = this.activeThisHandSeats().filter((s) => s.chips > 0);
    if (playable.length < 2) {
      this.status = "WAITING";
      this.resetRoomIfEmpty();
      this.onStateChange();
      return;
    }

    for (const seat of this.seats) {
      if (!seat) continue;
      seat.folded = seat.sittingOut;
      seat.allIn = false;
      seat.currentBet = 0;
      seat.totalHandBet = 0;
      seat.holeCards = [];
      seat.hasActed = false;
    }

    this.status = "PLAYING";
    this.communityCards = [];
    this.lastActionLog = [];

    const order = playable.map((s) => s.seatIndex).sort((a, b) => a - b);
    if (this.dealerSeat === null || !order.includes(this.dealerSeat)) {
      this.dealerSeat = order[0];
    } else {
      this.dealerSeat = this.nextInOrder(this.dealerSeat, order);
    }

    const deck = shuffle(makeDeck());
    for (const seat of playable) {
      seat.holeCards = [deck.pop() as string, deck.pop() as string];
    }
    this.deck = deck;

    if (playable.length === 2) {
      // heads-up: dealer posts small blind and acts first preflop
      const sbSeat = this.dealerSeat;
      const bbSeat = this.nextInOrder(sbSeat, order);
      this.postBlind(sbSeat, SMALL_BLIND);
      this.postBlind(bbSeat, BIG_BLIND);
      this.currentTurnSeat = sbSeat;
    } else {
      const sbSeat = this.nextInOrder(this.dealerSeat, order);
      const bbSeat = this.nextInOrder(sbSeat, order);
      this.postBlind(sbSeat, SMALL_BLIND);
      this.postBlind(bbSeat, BIG_BLIND);
      this.currentTurnSeat = this.nextInOrder(bbSeat, order);
    }

    this.currentBetLevel = Math.max(...playable.map((s) => s.currentBet));
    this.minRaiseIncrement = BIG_BLIND;
    this.bettingRound = "PREFLOP";
    this.scheduleTurnTimer();
    this.onStateChange();
  }

  private postBlind(seatIndex: number, amount: number) {
    const seat = this.seats[seatIndex] as Seat;
    const actual = Math.min(amount, seat.chips);
    seat.chips -= actual;
    seat.currentBet += actual;
    seat.totalHandBet += actual;
    if (seat.chips === 0) seat.allIn = true;
  }

  private order(): number[] {
    return this.activeThisHandSeats()
      .map((s) => s.seatIndex)
      .sort((a, b) => a - b);
  }

  private nextInOrder(fromSeatIndex: number, order: number[]): number {
    const idx = order.indexOf(fromSeatIndex);
    return order[(idx + 1) % order.length];
  }

  // ---------- actions ----------

  handleAction(deviceId: string, action: ActionPayload) {
    const seat = this.seats.find((s) => s && s.deviceId === deviceId) as Seat | undefined;
    if (!seat) throw new Error("좌석을 찾을 수 없습니다.");
    if (this.status !== "PLAYING" || this.currentTurnSeat !== seat.seatIndex) {
      throw new Error("지금은 당신의 차례가 아닙니다.");
    }
    this.applyAction(seat.seatIndex, action);
    this.onStateChange();
  }

  private clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    this.turnDeadline = null;
  }

  private scheduleTurnTimer() {
    this.clearTurnTimer();
    if (this.currentTurnSeat === null) return;
    this.turnDeadline = Date.now() + TURN_SECONDS * 1000;
    this.turnTimer = setTimeout(() => {
      const seatIndex = this.currentTurnSeat;
      if (seatIndex === null) return;
      const seat = this.seats[seatIndex] as Seat;
      const canCheck = seat.currentBet === this.currentBetLevel;
      this.applyAction(seatIndex, { type: canCheck ? "check" : "fold" });
      this.onStateChange();
    }, TURN_SECONDS * 1000);
  }

  private applyAction(seatIndex: number, action: ActionPayload) {
    const seat = this.seats[seatIndex] as Seat;
    const callAmount = this.currentBetLevel - seat.currentBet;

    switch (action.type) {
      case "fold": {
        seat.folded = true;
        seat.hasActed = true;
        this.lastActionLog.push(`${seat.nickname} 폴드`);
        this.onActionAnnounce({ seatIndex: seat.seatIndex, nickname: seat.nickname, type: "fold" });
        break;
      }
      case "check": {
        if (callAmount > 0) throw new Error("콜할 금액이 남아있어 체크할 수 없습니다.");
        seat.hasActed = true;
        this.lastActionLog.push(`${seat.nickname} 체크`);
        this.onActionAnnounce({ seatIndex: seat.seatIndex, nickname: seat.nickname, type: "check" });
        break;
      }
      case "call": {
        const actual = Math.min(callAmount, seat.chips);
        seat.chips -= actual;
        seat.currentBet += actual;
        seat.totalHandBet += actual;
        if (seat.chips === 0) seat.allIn = true;
        seat.hasActed = true;
        this.lastActionLog.push(`${seat.nickname} 콜 (${actual})`);
        this.onActionAnnounce({ seatIndex: seat.seatIndex, nickname: seat.nickname, type: "call", amount: actual });
        break;
      }
      case "raise": {
        const raiseTo = action.amount ?? 0;
        const maxTo = seat.currentBet + seat.chips;
        if (raiseTo > maxTo) throw new Error("보유 칩보다 큰 금액입니다.");
        const minTo = this.currentBetLevel + this.minRaiseIncrement;
        if (raiseTo < minTo && raiseTo < maxTo) {
          throw new Error(`최소 레이즈 금액은 ${minTo}입니다.`);
        }
        const delta = raiseTo - seat.currentBet;
        seat.chips -= delta;
        seat.currentBet = raiseTo;
        seat.totalHandBet += delta;
        if (seat.chips === 0) seat.allIn = true;
        this.applyRaiseLevel(seat, raiseTo);
        this.onActionAnnounce({ seatIndex: seat.seatIndex, nickname: seat.nickname, type: "raise", amount: raiseTo });
        break;
      }
      case "allin": {
        const delta = seat.chips;
        const newBet = seat.currentBet + delta;
        seat.chips = 0;
        seat.currentBet = newBet;
        seat.totalHandBet += delta;
        seat.allIn = true;
        this.applyRaiseLevel(seat, newBet);
        this.lastActionLog.push(`${seat.nickname} 올인 (${newBet})`);
        this.onActionAnnounce({ seatIndex: seat.seatIndex, nickname: seat.nickname, type: "allin", amount: newBet });
        break;
      }
    }

    this.advanceAfterAction();
  }

  private applyRaiseLevel(seat: Seat, newBet: number) {
    if (newBet > this.currentBetLevel) {
      const increment = newBet - this.currentBetLevel;
      if (increment >= this.minRaiseIncrement) {
        this.minRaiseIncrement = increment;
      }
      this.currentBetLevel = newBet;
      for (const s of this.activeThisHandSeats()) {
        if (s.seatIndex !== seat.seatIndex && !s.folded && !s.allIn) {
          s.hasActed = false;
        }
      }
      this.lastActionLog.push(`${seat.nickname} 레이즈 (${newBet})`);
    }
    seat.hasActed = true;
  }

  private advanceAfterAction() {
    this.clearTurnTimer();

    const contenders = this.activeThisHandSeats().filter((s) => !s.folded);
    if (contenders.length === 1) {
      this.awardPotToSingleWinner(contenders[0]);
      return;
    }

    if (this.isBettingRoundComplete()) {
      this.advanceRound();
    } else {
      this.moveToNextActor();
    }
  }

  private isBettingRoundComplete(): boolean {
    const contenders = this.activeThisHandSeats().filter((s) => !s.folded);
    const canAct = contenders.filter((s) => !s.allIn);
    if (canAct.length === 0) return true;
    return canAct.every((s) => s.hasActed && s.currentBet === this.currentBetLevel);
  }

  private moveToNextActor() {
    const order = this.order();
    let idx = this.currentTurnSeat as number;
    for (let i = 0; i < order.length; i++) {
      idx = this.nextInOrder(idx, order);
      const seat = this.seats[idx] as Seat;
      if (!seat.folded && !seat.allIn) {
        this.currentTurnSeat = idx;
        this.scheduleTurnTimer();
        return;
      }
    }
    // nobody left who can act; force round advance
    this.advanceRound();
  }

  private resetForNewRound() {
    for (const seat of this.activeThisHandSeats()) {
      seat.currentBet = 0;
      seat.hasActed = false;
    }
    this.currentBetLevel = 0;
    this.minRaiseIncrement = BIG_BLIND;

    const order = this.order();
    const contenders = this.activeThisHandSeats().filter((s) => !s.folded && !s.allIn);
    if (contenders.length === 0) {
      this.currentTurnSeat = null;
      return;
    }
    let idx = this.dealerSeat as number;
    for (let i = 0; i < order.length; i++) {
      idx = this.nextInOrder(idx, order);
      const seat = this.seats[idx] as Seat;
      if (!seat.folded && !seat.allIn) {
        this.currentTurnSeat = idx;
        this.scheduleTurnTimer();
        return;
      }
    }
    this.currentTurnSeat = null;
  }

  private advanceRound() {
    this.clearTurnTimer();
    if (this.bettingRound === "PREFLOP") {
      this.communityCards.push(this.deck.pop() as string, this.deck.pop() as string, this.deck.pop() as string);
      this.bettingRound = "FLOP";
    } else if (this.bettingRound === "FLOP") {
      this.communityCards.push(this.deck.pop() as string);
      this.bettingRound = "TURN";
    } else if (this.bettingRound === "TURN") {
      this.communityCards.push(this.deck.pop() as string);
      this.bettingRound = "RIVER";
    } else {
      this.doShowdown();
      return;
    }

    this.resetForNewRound();

    const contenders = this.activeThisHandSeats().filter((s) => !s.folded);
    const canAct = contenders.filter((s) => !s.allIn);
    if (canAct.length <= 1 && this.bettingRound !== "RIVER") {
      // everyone (or all but one) is all-in: run the board out with no further betting
      this.advanceRound();
      return;
    }
    if (canAct.length <= 1 && this.bettingRound === "RIVER") {
      this.doShowdown();
      return;
    }
    this.onStateChange();
  }

  private doShowdown() {
    this.clearTurnTimer();
    this.bettingRound = "SHOWDOWN";
    this.currentTurnSeat = null;

    const contenders = this.activeThisHandSeats().filter((s) => !s.folded);
    const pots = computeSidePots(this.seats.filter((s): s is Seat => !!s));

    const winnerTotals = new Map<number, number>();
    const handNameBySeat = new Map<number, string>();

    for (const pot of pots) {
      const eligible = contenders.filter((s) => pot.eligibleSeats.includes(s.seatIndex));
      const solved = eligible.map((s) => ({
        seat: s,
        hand: Hand.solve([...s.holeCards, ...this.communityCards]),
      }));
      const winningHands = Hand.winners(solved.map((x) => x.hand));
      const winners = solved.filter((x) => winningHands.includes(x.hand));
      const share = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount - share * winners.length;
      for (const w of winners) {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder--;
        winnerTotals.set(w.seat.seatIndex, (winnerTotals.get(w.seat.seatIndex) ?? 0) + share + extra);
        handNameBySeat.set(w.seat.seatIndex, w.hand.name);
      }
      for (const s of solved) {
        if (!handNameBySeat.has(s.seat.seatIndex)) handNameBySeat.set(s.seat.seatIndex, s.hand.name);
      }
    }

    for (const [seatIndex, amount] of winnerTotals) {
      (this.seats[seatIndex] as Seat).chips += amount;
    }

    const result: HandResultPayload = {
      winners: Array.from(winnerTotals.entries()).map(([seatIndex, amount]) => ({
        seatIndex,
        nickname: (this.seats[seatIndex] as Seat).nickname,
        amount,
        handName: handNameBySeat.get(seatIndex),
      })),
      revealed: contenders.map((s) => ({
        seatIndex: s.seatIndex,
        holeCards: s.holeCards,
        handName: handNameBySeat.get(s.seatIndex),
      })),
      chipsAfter: this.seats
        .filter((s): s is Seat => !!s)
        .map((s) => ({ seatIndex: s.seatIndex, chips: s.chips })),
    };

    this.onHandResult(result);
    this.freePendingLeaveSeats();
    this.resetRoomIfEmpty();
    if (this.status !== "WAITING") this.scheduleNextHand();
    this.onStateChange();
  }

  private awardPotToSingleWinner(winnerSeat: Seat) {
    this.bettingRound = "SHOWDOWN";
    this.currentTurnSeat = null;
    const total = this.seats
      .filter((s): s is Seat => !!s)
      .reduce((sum, s) => sum + s.totalHandBet, 0);
    winnerSeat.chips += total;

    const result: HandResultPayload = {
      winners: [{ seatIndex: winnerSeat.seatIndex, nickname: winnerSeat.nickname, amount: total }],
      revealed: [],
      chipsAfter: this.seats
        .filter((s): s is Seat => !!s)
        .map((s) => ({ seatIndex: s.seatIndex, chips: s.chips })),
    };

    this.onHandResult(result);
    this.freePendingLeaveSeats();
    this.resetRoomIfEmpty();
    if (this.status !== "WAITING") this.scheduleNextHand();
    this.onStateChange();
  }

  private scheduleNextHand() {
    if (this.nextHandTimer) clearTimeout(this.nextHandTimer);
    this.nextHandTimer = setTimeout(() => {
      if (this.connectedPlayableCount() >= 2) {
        this.startHand();
      } else {
        this.status = "WAITING";
        this.onStateChange();
      }
    }, NEXT_HAND_DELAY_MS);
  }

  // ---------- views ----------

  getPublicState(viewerDeviceId: string | null): PublicState {
    const order = this.order();
    const sbSeat = this.status === "PLAYING" && order.length > 0
      ? (order.length === 2 ? this.dealerSeat : this.nextInOrder(this.dealerSeat as number, order))
      : null;
    const bbSeat = this.status === "PLAYING" && sbSeat !== null ? this.nextInOrder(sbSeat, order) : null;

    const seats: PublicSeatView[] = this.seats
      .filter((s): s is Seat => !!s)
      .map((s) => ({
        seatIndex: s.seatIndex,
        nickname: s.nickname,
        photoDataUri: s.photoDataUri,
        chips: s.chips,
        connected: s.connected,
        folded: s.folded,
        allIn: s.allIn,
        sittingOut: s.sittingOut,
        currentBet: s.currentBet,
        totalHandBet: s.totalHandBet,
        isDealer: this.dealerSeat === s.seatIndex,
        isSmallBlind: sbSeat === s.seatIndex,
        isBigBlind: bbSeat === s.seatIndex,
        isTurn: this.currentTurnSeat === s.seatIndex,
        hasCards: s.holeCards.length > 0 && !s.folded,
      }));

    const pot = this.seats.filter((s): s is Seat => !!s).reduce((sum, s) => sum + s.totalHandBet, 0);
    const viewerSeat = viewerDeviceId
      ? (this.seats.find((s) => s && s.deviceId === viewerDeviceId) as Seat | undefined)
      : undefined;
    const callAmount = viewerSeat ? Math.max(0, this.currentBetLevel - viewerSeat.currentBet) : 0;

    return {
      status: this.status,
      seats,
      communityCards: this.communityCards,
      pot,
      sidePots: this.bettingRound === "SHOWDOWN" ? computeSidePots(this.seats.filter((s): s is Seat => !!s)) : [],
      bettingRound: this.bettingRound,
      currentTurnSeat: this.currentTurnSeat,
      callAmount,
      minRaiseTo: this.currentBetLevel + this.minRaiseIncrement,
      dealerSeat: this.dealerSeat,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      turnDeadline: this.turnDeadline,
      lastActionLog: this.lastActionLog.slice(-10),
      mySeatIndex: viewerSeat ? viewerSeat.seatIndex : null,
      buyIn: this.buyIn,
    };
  }

  getPrivateHandFor(deviceId: string): PrivateHandPayload | null {
    const seat = this.seats.find((s) => s && s.deviceId === deviceId) as Seat | undefined;
    if (!seat || seat.holeCards.length === 0 || seat.folded) return null;

    const numOpponents = this.activeThisHandSeats().filter(
      (s) => s.seatIndex !== seat.seatIndex && !s.folded
    ).length;
    const callAmount = Math.max(0, this.currentBetLevel - seat.currentBet);
    const pot = this.seats.filter((s): s is Seat => !!s).reduce((sum, s) => sum + s.totalHandBet, 0);

    const recommendation =
      this.bettingRound && this.bettingRound !== "SHOWDOWN"
        ? buildRecommendation({
            heroHole: seat.holeCards,
            communityCards: this.communityCards,
            numOpponents,
            pot,
            callAmount,
            bigBlind: BIG_BLIND,
            canCheck: callAmount === 0,
          })
        : null;

    return { holeCards: seat.holeCards, recommendation };
  }

  allDeviceIds(): { deviceId: string; socketId: string | null }[] {
    return this.seats
      .filter((s): s is Seat => !!s)
      .map((s) => ({ deviceId: s.deviceId, socketId: s.socketId }));
  }

  // ---------- chat ----------

  getChatHistory(): ChatMessagePayload[] {
    return this.chatHistory;
  }

  addChatMessage(deviceId: string, text: string): void {
    const seat = this.seats.find((s) => s && s.deviceId === deviceId) as Seat | undefined;
    if (!seat) throw new Error("좌석을 찾을 수 없습니다.");
    const trimmed = text.trim().slice(0, MAX_CHAT_LENGTH);
    if (!trimmed) return;

    const message: ChatMessagePayload = {
      seatIndex: seat.seatIndex,
      nickname: seat.nickname,
      text: trimmed,
      ts: Date.now(),
    };
    this.chatHistory.push(message);
    if (this.chatHistory.length > MAX_CHAT_HISTORY) {
      this.chatHistory.splice(0, this.chatHistory.length - MAX_CHAT_HISTORY);
    }
    this.onChatMessage(message);
  }
}
