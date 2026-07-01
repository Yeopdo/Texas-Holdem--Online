import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { parseCard } from "../cardUtils";

const DIMS = {
  sm: { width: 26, height: 36 },
  md: { width: 36, height: 50 },
  lg: { width: 46, height: 64 },
};

export function PlayingCard({
  card,
  faceDown,
  size = "md",
  delay = 0,
}: {
  card?: string;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  delay?: number;
}) {
  const dims = DIMS[size];
  const revealed = !!card && !faceDown;
  const flip = useRef(new Animated.Value(revealed ? 1 : 0)).current;
  const wasRevealed = useRef(revealed);

  useEffect(() => {
    if (revealed && !wasRevealed.current) {
      flip.setValue(0);
      Animated.timing(flip, {
        toValue: 1,
        duration: 360,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (!revealed && wasRevealed.current) {
      flip.setValue(0);
    }
    wasRevealed.current = revealed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, card]);

  if (!card && !faceDown) {
    return <View style={[styles.card, dims, styles.placeholder]} />;
  }

  const backRotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const frontRotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const parsed = card ? parseCard(card) : null;

  return (
    <View style={[dims, styles.wrap]}>
      <Animated.View
        style={[
          styles.card,
          dims,
          styles.face,
          styles.back,
          { transform: [{ perspective: 800 }, { rotateY: backRotateY }] },
        ]}
      />
      {parsed && (
        <Animated.View
          style={[
            styles.card,
            dims,
            styles.face,
            { transform: [{ perspective: 800 }, { rotateY: frontRotateY }] },
          ]}
        >
          <View style={[styles.corner, styles.cornerTop]}>
            <Text style={[styles.rank, parsed.isRed ? styles.red : styles.black, size === "sm" && styles.rankSm]}>
              {parsed.rank}
            </Text>
            <Text style={[styles.cornerSuit, parsed.isRed ? styles.red : styles.black, size === "sm" && styles.suitSm]}>
              {parsed.symbol}
            </Text>
          </View>
          <Text style={[styles.centerSuit, parsed.isRed ? styles.red : styles.black, size === "sm" && styles.centerSuitSm]}>
            {parsed.symbol}
          </Text>
          <View style={[styles.corner, styles.cornerBottom]}>
            <Text style={[styles.rank, parsed.isRed ? styles.red : styles.black, size === "sm" && styles.rankSm]}>
              {parsed.rank}
            </Text>
            <Text style={[styles.cornerSuit, parsed.isRed ? styles.red : styles.black, size === "sm" && styles.suitSm]}>
              {parsed.symbol}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 2 },
  card: {
    backgroundColor: "#fdfdfd",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  placeholder: {
    marginHorizontal: 2,
    backgroundColor: "transparent",
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.25)",
  },
  face: {
    position: "absolute",
    top: 0,
    left: 0,
    backfaceVisibility: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  back: {
    backgroundColor: "#1c4f8f",
    borderColor: "#0d3466",
  },
  corner: { position: "absolute", alignItems: "center", left: 3 },
  cornerTop: { top: 2 },
  cornerBottom: { bottom: 2, transform: [{ rotate: "180deg" }] },
  rank: { fontWeight: "800", fontSize: 12, lineHeight: 13 },
  rankSm: { fontSize: 9, lineHeight: 10 },
  cornerSuit: { fontSize: 10, lineHeight: 11 },
  centerSuit: { fontSize: 20 },
  centerSuitSm: { fontSize: 13 },
  suitSm: { fontSize: 8, lineHeight: 9 },
  red: { color: "#c0392b" },
  black: { color: "#1a1a1a" },
});
