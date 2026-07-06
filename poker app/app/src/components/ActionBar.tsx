import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionPayload, PublicState } from "../types";

export function ActionBar({
  state,
  myChips,
  onAction,
}: {
  state: PublicState;
  myChips: number;
  onAction: (action: ActionPayload) => void;
}) {
  const isMyTurn = state.mySeatIndex !== null && state.currentTurnSeat === state.mySeatIndex;
  const callAmount = state.callAmount;
  const maxRaiseTo = myChips + (state.seats.find((s) => s.seatIndex === state.mySeatIndex)?.currentBet ?? 0);
  const [raiseTo, setRaiseTo] = useState(state.minRaiseTo);

  useEffect(() => {
    setRaiseTo(Math.min(state.minRaiseTo, maxRaiseTo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.minRaiseTo, state.currentTurnSeat]);

  if (!isMyTurn) {
    return (
      <View style={styles.waitingContainer}>
        <Text style={styles.waitingText}>
          {state.status === "PLAYING" ? "다른 플레이어의 차례입니다" : "게임 대기 중"}
        </Text>
      </View>
    );
  }

  const step = state.bigBlind;

  return (
    <View style={styles.container}>
      <View style={styles.buttonsRow}>
        <Pressable style={[styles.btn, styles.foldBtn]} onPress={() => onAction({ type: "fold" })}>
          <Text style={styles.btnText}>폴드</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.callBtn]}
          onPress={() => onAction({ type: callAmount > 0 ? "call" : "check" })}
        >
          <Text style={styles.btnText}>{callAmount > 0 ? `콜 ${callAmount}` : "체크"}</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.allinBtn]}
          onPress={() => onAction({ type: "allin" })}
        >
          <Text style={styles.btnText}>올인</Text>
        </Pressable>
      </View>
      <View style={styles.raiseRow}>
        <Pressable style={styles.stepBtn} onPress={() => setRaiseTo((v) => Math.max(state.minRaiseTo, v - step))}>
          <Text style={styles.stepBtnText}>-</Text>
        </Pressable>
        <Text style={styles.raiseAmount}>{raiseTo}</Text>
        <Pressable style={styles.stepBtn} onPress={() => setRaiseTo((v) => Math.min(maxRaiseTo, v + step))}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.raiseBtn]}
          onPress={() => onAction({ type: "raise", amount: raiseTo })}
        >
          <Text style={styles.btnText}>레이즈</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingBottom: 12 },
  waitingContainer: { padding: 16, alignItems: "center" },
  waitingText: { color: "rgba(255,255,255,0.7)" },
  buttonsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  raiseRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  foldBtn: { backgroundColor: "#b71c1c" },
  callBtn: { backgroundColor: "#1565c0" },
  allinBtn: { backgroundColor: "#6a1b9a" },
  raiseBtn: { backgroundColor: "#2e7d32", flex: 1 },
  btnText: { color: "#fff", fontWeight: "700" },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  raiseAmount: { color: "#fff", fontWeight: "700", minWidth: 48, textAlign: "center" },
});
