import { Image, StyleSheet, Text, View } from "react-native";
import { PublicSeatView } from "../types";

export function Seat({ seat, style }: { seat: PublicSeatView; style?: object }) {
  const initial = seat.nickname.trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={[styles.container, style, seat.isTurn && styles.turnHighlight]}>
      <View style={styles.avatarWrap}>
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
  turnHighlight: {
    shadowColor: "#ffd54f",
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  avatarWrap: { width: 56, height: 56 },
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
