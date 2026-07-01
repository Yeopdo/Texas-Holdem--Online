import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PlayingCard } from "./PlayingCard";

export function CommunityCards({ cards, pot }: { cards: string[]; pot: number }) {
  const slots = [0, 1, 2, 3, 4];
  const prevLenRef = useRef(0);
  const prevLen = prevLenRef.current;

  useEffect(() => {
    prevLenRef.current = cards.length;
  }, [cards.length]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {slots.map((i) =>
          cards[i] ? (
            <PlayingCard
              key={i}
              card={cards[i]}
              size="lg"
              delay={i >= prevLen ? (i - prevLen) * 150 : 0}
            />
          ) : (
            <View key={i} style={styles.placeholder} />
          )
        )}
      </View>
      <View style={styles.potPill}>
        <Text style={styles.pot}>팟 {pot}</Text>
      </View>
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
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
  },
  potPill: {
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,213,79,0.5)",
  },
  pot: { color: "#ffd54f", fontWeight: "800", fontSize: 15 },
});
