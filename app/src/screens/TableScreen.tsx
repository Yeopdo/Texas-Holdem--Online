import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionBar } from "../components/ActionBar";
import { CommunityCards } from "../components/CommunityCards";
import { PlayingCard } from "../components/PlayingCard";
import { RecommendationPanel } from "../components/RecommendationPanel";
import { Seat } from "../components/Seat";
import { ActionPayload, HandResultPayload, PrivateHandPayload, PublicState } from "../types";

const MAX_SEATS = 9;
const TABLE_W = 320;
const TABLE_H = 460;
const RX = 145;
const RY = 205;

const ROUND_LABEL: Record<string, string> = {
  PREFLOP: "프리플랍",
  FLOP: "플랍",
  TURN: "턴",
  RIVER: "리버",
  SHOWDOWN: "쇼다운",
};

function seatPosition(seatIndex: number) {
  const angle = (seatIndex / MAX_SEATS) * Math.PI * 2 - Math.PI / 2;
  const x = TABLE_W / 2 + RX * Math.cos(angle) - 42;
  const y = TABLE_H / 2 + RY * Math.sin(angle) - 40;
  return { left: x, top: y };
}

export function TableScreen({
  state,
  hand,
  lastResult,
  onAction,
  onStartGame,
}: {
  state: PublicState;
  hand: PrivateHandPayload | null;
  lastResult: HandResultPayload | null;
  onAction: (action: ActionPayload) => void;
  onStartGame: () => void;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = state.turnDeadline ? Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)) : null;
  const myChips = state.seats.find((s) => s.seatIndex === state.mySeatIndex)?.chips ?? 0;
  const canStart = state.status === "WAITING" && state.seats.length >= 2;

  const winnerNames = useMemo(
    () => lastResult?.winners.map((w) => `${w.nickname} +${w.amount}`).join(", ") ?? "",
    [lastResult]
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.roundLabel}>
          {state.bettingRound ? ROUND_LABEL[state.bettingRound] ?? state.bettingRound : "대기 중"}
        </Text>
        {secondsLeft !== null && <Text style={styles.timer}>남은 시간 {secondsLeft}s</Text>}
      </View>

      {lastResult && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultBannerText}>승리: {winnerNames}</Text>
        </View>
      )}

      <View style={styles.tableArea}>
        <View style={styles.tableOval} />
        {state.seats.map((seat) => (
          <Seat key={seat.seatIndex} seat={seat} style={seatPosition(seat.seatIndex)} />
        ))}
        <View style={styles.centerArea}>
          <CommunityCards cards={state.communityCards} pot={state.pot} />
        </View>
      </View>

      {canStart && (
        <Pressable style={styles.startButton} onPress={onStartGame}>
          <Text style={styles.startButtonText}>게임 시작</Text>
        </Pressable>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.myHandRow}>
          <View style={styles.myCards}>
            <PlayingCard card={hand?.holeCards[0]} faceDown={!hand} size="lg" />
            <PlayingCard card={hand?.holeCards[1]} faceDown={!hand} size="lg" />
          </View>
          <RecommendationPanel recommendation={hand?.recommendation ?? null} />
        </View>
        <ActionBar state={state} myChips={myChips} onAction={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b3d24" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  roundLabel: { color: "#ffd54f", fontWeight: "800", fontSize: 16 },
  timer: { color: "#fff", fontSize: 13 },
  resultBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "rgba(255,213,79,0.9)",
    borderRadius: 8,
    padding: 8,
  },
  resultBannerText: { color: "#1a1a1a", fontWeight: "700", textAlign: "center" },
  tableArea: {
    width: TABLE_W,
    height: TABLE_H,
    alignSelf: "center",
    marginTop: 12,
  },
  tableOval: {
    position: "absolute",
    left: (TABLE_W - 250) / 2,
    top: (TABLE_H - 340) / 2,
    width: 250,
    height: 340,
    borderRadius: 160,
    backgroundColor: "#0f5c34",
    borderWidth: 6,
    borderColor: "#0a3d22",
  },
  centerArea: {
    position: "absolute",
    left: 0,
    right: 0,
    top: TABLE_H / 2 - 50,
    alignItems: "center",
  },
  startButton: {
    alignSelf: "center",
    backgroundColor: "#ffd54f",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  startButtonText: { color: "#1a1a1a", fontWeight: "800" },
  bottomBar: { marginTop: "auto" },
  myHandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
  },
  myCards: { flexDirection: "row" },
});
