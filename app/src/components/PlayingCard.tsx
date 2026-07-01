import { StyleSheet, Text, View } from "react-native";
import { parseCard } from "../cardUtils";

export function PlayingCard({ card, faceDown, size = "md" }: { card?: string; faceDown?: boolean; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? styles.lg : size === "sm" ? styles.sm : styles.md;

  if (faceDown || !card) {
    return <View style={[styles.card, dims, styles.back]} />;
  }

  const { rank, symbol, isRed } = parseCard(card);
  return (
    <View style={[styles.card, dims]}>
      <Text style={[styles.rank, isRed ? styles.red : styles.black, size === "sm" && styles.rankSm]}>{rank}</Text>
      <Text style={[styles.suit, isRed ? styles.red : styles.black, size === "sm" && styles.suitSm]}>{symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  back: { backgroundColor: "#2b5fa5" },
  sm: { width: 26, height: 36 },
  md: { width: 36, height: 50 },
  lg: { width: 46, height: 64 },
  rank: { fontWeight: "700", fontSize: 16, lineHeight: 18 },
  rankSm: { fontSize: 12, lineHeight: 14 },
  suit: { fontSize: 16, lineHeight: 18 },
  suitSm: { fontSize: 12, lineHeight: 14 },
  red: { color: "#c0392b" },
  black: { color: "#1a1a1a" },
});
