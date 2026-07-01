import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ChatMessagePayload } from "../types";

export function ChatPanel({
  visible,
  onClose,
  messages,
  onSend,
  mySeatIndex,
}: {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessagePayload[];
  onSend: (text: string) => void;
  mySeatIndex: number | null;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatMessagePayload>>(null);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheet}
      >
        <View style={styles.header}>
          <Text style={styles.title}>채팅</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.seatIndex === mySeatIndex && styles.bubbleRowMine]}>
              <View style={[styles.bubble, item.seatIndex === mySeatIndex && styles.bubbleMine]}>
                <Text style={styles.bubbleName}>{item.nickname}</Text>
                <Text style={styles.bubbleText}>{item.text}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>아직 메시지가 없어요</Text>}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="메시지 입력"
            placeholderTextColor="#888"
            onSubmitEditing={handleSend}
            returnKeyType="send"
            maxLength={300}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>전송</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
    backgroundColor: "#123526",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { color: "#ffd54f", fontWeight: "800", fontSize: 15 },
  closeText: { color: "rgba(255,255,255,0.7)" },
  list: { flex: 1 },
  listContent: { paddingVertical: 6, gap: 6 },
  empty: { color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 20 },
  bubbleRow: { alignItems: "flex-start" },
  bubbleRowMine: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "80%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 2,
  },
  bubbleMine: { backgroundColor: "rgba(255,213,79,0.25)" },
  bubbleName: { color: "#ffd54f", fontSize: 10, fontWeight: "700", marginBottom: 2 },
  bubbleText: { color: "#fff", fontSize: 13 },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendBtn: {
    backgroundColor: "#ffd54f",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendBtnText: { color: "#1a1a1a", fontWeight: "800" },
});
