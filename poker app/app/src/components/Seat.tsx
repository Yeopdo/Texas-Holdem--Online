import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { PublicSeatView } from "../types";

export function Seat({ seat, style }: { seat: PublicSeatView; style?: object }) {
  const initial = seat.nickname.trim().charAt(0).toUpperCase() || "?";
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!seat.isTurn) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [seat.isTurn, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.25] });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.avatarWrap}>
        {seat.isTurn && (
          <Animated.View
            pointerEvents="none"
            style={[styles.turnRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
          />
        )}
        {seat.photoDataUri ? (
          <Image source={{ uri: seat.photoDataUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        {seat.isDealer && (
          <View style={styles.dealerBadge}>
            <Text style={styles.dealerBadgeText}>D</Text>
          </View>
        )}
        {(seat.isSmallBlind || seat.isBigBlind) && (
          <View style={styles.blindBadge}>
            <Text style={styles.blindBadgeText}>{seat.isBigBlind ? "BB" : "SB"}</Text>
          </View>
        )}
        {!seat.connected && (
          <View style={styles.disconnectedOverlay}>
            <Text style={styles.disconnectedText}>연결끊김</Text>
          </View>
        )}
      </View>
      <Text style={styles.nickname} numberOfLines={1}>
        {seat.nickname}
      </Text>
      <Text style={styles.chips}>{seat.chips}</Text>
      {seat.folded && !seat.sittingOut && <Text style={styles.status}>폴드</Text>}
      {seat.allIn && <Text style={styles.status}>올인</Text>}
      {seat.currentBet > 0 && (
        <View style={styles.betChip}>
          <Text style={styles.betChipText}>{seat.currentBet}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 84,
    alignItems: "center",
  },
  avatarWrap: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  turnRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#ffd54f",
  },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: "#fff" },
  avatarFallback: { backgroundColor: "#546e7a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 22, fontWeight: "700" },
  dealerBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    backgroundColor: "#fff",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  dealerBadgeText: { fontSize: 11, fontWeight: "700" },
  blindBadge: {
    position: "absolute",
    left: -6,
    top: -4,
    backgroundColor: "#1b1b1b",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#ffd54f",
  },
  blindBadgeText: { fontSize: 8, fontWeight: "700", color: "#ffd54f" },
  disconnectedOverlay: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  disconnectedText: { color: "#fff", fontSize: 9 },
  nickname: { color: "#fff", fontSize: 12, fontWeight: "600", marginTop: 4 },
  chips: { color: "#ffd54f", fontSize: 12, fontWeight: "700" },
  status: { color: "#ef5350", fontSize: 11, fontWeight: "700" },
  betChip: {
    marginTop: 2,
    backgroundColor: "#1b1b1b",
    borderColor: "#ffd54f",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  betChipText: { color: "#ffd54f", fontSize: 10, fontWeight: "700" },
});
