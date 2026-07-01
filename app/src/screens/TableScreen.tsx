import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ActionBar } from "../components/ActionBar";
import { ChatPanel } from "../components/ChatPanel";
import { CommunityCards } from "../components/CommunityCards";
import { PlayingCard } from "../components/PlayingCard";
import { RecommendationPanel } from "../components/RecommendationPanel";
import { Seat } from "../components/Seat";
import { ActionPayload, ChatMessagePayload, HandResultPayload, PrivateHandPayload, PublicState } from "../types";

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
  chatMessages,
  onAction,
  onStartGame,
  onLeave,
  onSendChat,
}: {
  state: PublicState;
  hand: PrivateHandPayload | null;
  lastResult: HandResultPayload | null;
  chatMessages: ChatMessagePayload[];
  onAction: (action: ActionPayload) => void;
  onStartGame: (buyIn?: number) => void;
  onLeave: () => void;
  onSendChat: (text: string) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [buyInInput, setBuyInInput] = useState(String(state.buyIn));
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = state.turnDeadline ? Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)) : null;
  const myChips = state.seats.find((s) => s.seatIndex === state.mySeatIndex)?.chips ?? 0;
  const canStart = state.status === "WAITING" && state.seats.length >= 2;
  const isFreshSession = state.dealerSeat === null;

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
        <View style={styles.headerRight}>
          <Pressable onPress={() => setChatOpen(true)} hitSlop={8}>
            <Text style={styles.chatButtonText}>채팅{chatMessages.length > 0 ? ` (${chatMessages.length})` : ""}</Text>
          </Pressable>
          <Pressable onPress={onLeave} hitSlop={8}>
            <Text style={styles.leaveText}>나가기</Text>
          </Pressable>
        </View>
      </View>

      {lastResult && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultBannerText}>승리: {winnerNames}</Text>
        </View>
      )}

      <View style={styles.tableArea}>
        <View style={styles.rail}>
          <View style={styles.felt}>
            <View style={styles.feltShine} />
          </View>
        </View>
        {state.seats.map((seat) => (
          <Seat key={seat.seatIndex} seat={seat} style={seatPosition(seat.seatIndex)} />
        ))}
        <View style={styles.centerArea}>
          <CommunityCards cards={state.communityCards} pot={state.pot} />
        </View>
      </View>

      {canStart && (
        <View style={styles.startRow}>
          {isFreshSession && (
            <View style={styles.buyInRow}>
              <Text style={styles.buyInLabel}>시작 칩</Text>
              <TextInput
                style={styles.buyInInput}
                value={buyInInput}
                onChangeText={setBuyInInput}
                keyboardType="number-pad"
                maxLength={7}
              />
            </View>
          )}
          <Pressable
            style={styles.startButton}
            onPress={() => onStartGame(isFreshSession ? Number(buyInInput) || state.buyIn : undefined)}
          >
            <Text style={styles.startButtonText}>{isFreshSession ? "게임 시작" : "게임 계속하기"}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.myHandRow}>
          <View style={styles.myCards}>
            <PlayingCard card={hand?.holeCards[0]} faceDown={!hand} size="lg" delay={0} />
            <PlayingCard card={hand?.holeCards[1]} faceDown={!hand} size="lg" delay={120} />
          </View>
          <RecommendationPanel recommendation={hand?.recommendation ?? null} />
        </View>
        <ActionBar state={state} myChips={myChips} onAction={onAction} />
      </View>

      <ChatPanel
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSend={onSendChat}
        mySeatIndex={state.mySeatIndex}
      />
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  chatButtonText: { color: "#ffd54f", fontSize: 13, fontWeight: "700" },
  leaveText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
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
  rail: {
    position: "absolute",
    left: (TABLE_W - 260) / 2,
    top: (TABLE_H - 350) / 2,
    width: 260,
    height: 350,
    borderRadius: 165,
    backgroundColor: "#3e2414",
    borderWidth: 3,
    borderColor: "#5c3a20",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  felt: {
    width: 232,
    height: 322,
    borderRadius: 150,
    backgroundColor: "#0f5c34",
    borderWidth: 2,
    borderColor: "#0a3d22",
    overflow: "hidden",
    alignItems: "center",
  },
  feltShine: {
    position: "absolute",
    top: -60,
    width: 320,
    height: 260,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  centerArea: {
    position: "absolute",
    left: 0,
    right: 0,
    top: TABLE_H / 2 - 50,
    alignItems: "center",
  },
  startRow: { alignItems: "center", marginTop: 8, gap: 8 },
  buyInRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  buyInLabel: { color: "#fff", fontSize: 13 },
  buyInInput: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 90,
    textAlign: "center",
  },
  startButton: {
    alignSelf: "center",
    backgroundColor: "#ffd54f",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
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
