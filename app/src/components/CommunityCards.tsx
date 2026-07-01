import { StyleSheet, Text, View } from "react-native";
import { PlayingCard } from "./PlayingCard";

export function CommunityCards({ cards, pot }: { cards: string[]; pot: number }) {
  const slots = [0, 1, 2, 3, 4];
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {slots.map((i) =>
          cards[i] ? (
            <PlayingCard key={i} card={cards[i]} size="lg" />
          ) : (
            <View key={i} style={styles.placeholder} />
          )
        )}
      </View>
      <Text style={styles.pot}>팟 {pot}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row" },
  placeholder: {
    width: 46,
    height: 64,
    marginHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pot: { color: "#fff", marginTop: 6, fontWeight: "700", fontSize: 16 },
});
