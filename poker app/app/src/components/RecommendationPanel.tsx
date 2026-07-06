import { StyleSheet, Text, View } from "react-native";
import { Recommendation } from "../types";

const ACTION_LABEL: Record<string, string> = {
  fold: "폴드",
  check: "체크",
  call: "콜",
  raise: "레이즈",
  bet: "베팅",
  allin: "올인",
};

export function RecommendationPanel({ recommendation }: { recommendation: Recommendation | null }) {
  if (!recommendation) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>AI 추천</Text>
      </View>
    );
  }

  const winPct = Math.round(recommendation.winProbability * 100);
  const tiePct = Math.round(recommendation.tieProbability * 100);
  const label = ACTION_LABEL[recommendation.suggestedAction] ?? recommendation.suggestedAction;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI 추천</Text>
      <Text style={styles.winPct}>승률 {winPct}%{tiePct > 0 ? ` (무 ${tiePct}%)` : ""}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {label}
          {recommendation.suggestedAmount ? ` ${recommendation.suggestedAmount}` : ""}
        </Text>
      </View>
      <Text style={styles.reasoning} numberOfLines={3}>
        {recommendation.reasoning}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    padding: 10,
    width: 150,
  },
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  title: { color: "#ffd54f", fontWeight: "700", fontSize: 12, marginBottom: 4 },
  winPct: { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 6 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#2e7d32",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  reasoning: { color: "rgba(255,255,255,0.85)", fontSize: 10, lineHeight: 13 },
});
