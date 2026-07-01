import { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import type { Socket } from "socket.io-client";
import { JoinScreen } from "./src/screens/JoinScreen";
import { TableScreen } from "./src/screens/TableScreen";
import { createSocket } from "./src/socket";
import { getOrCreateDeviceId, getSavedProfile, getSavedServerUrl, saveProfile, saveServerUrl } from "./src/storage";
import { ActionPayload, HandResultPayload, PrivateHandPayload, PublicState } from "./src/types";

export default function App() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [initialServerUrl, setInitialServerUrl] = useState("");
  const [initialNickname, setInitialNickname] = useState("");
  const [initialPhoto, setInitialPhoto] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const [joined, setJoined] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [state, setState] = useState<PublicState | null>(null);
  const [hand, setHand] = useState<PrivateHandPayload | null>(null);
  const [lastResult, setLastResult] = useState<HandResultPayload | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const [id, profile, url] = await Promise.all([getOrCreateDeviceId(), getSavedProfile(), getSavedServerUrl()]);
      setDeviceId(id);
      setInitialNickname(profile.nickname);
      setInitialPhoto(profile.photoDataUri);
      setInitialServerUrl(url);
      setReady(true);
    })();
  }, []);

  const handleJoin = useCallback(
    async (serverUrl: string, nickname: string, photoDataUri?: string) => {
      if (!deviceId) return;
      setConnectionError(null);
      await Promise.all([saveServerUrl(serverUrl), saveProfile(nickname, photoDataUri)]);

      const socket = createSocket(serverUrl);
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join", { deviceId, nickname, photoDataUri });
      });
      socket.on("connect_error", (err) => {
        setConnectionError(`서버에 연결할 수 없습니다: ${err.message}`);
      });
      socket.on("state", (s: PublicState) => {
        setState(s);
        setJoined(true);
      });
      socket.on("privateHand", (h: PrivateHandPayload | null) => setHand(h));
      socket.on("handResult", (r: HandResultPayload) => {
        setLastResult(r);
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        resultTimerRef.current = setTimeout(() => setLastResult(null), 5000);
      });
      socket.on("error", (message: string) => setConnectionError(message));
    },
    [deviceId]
  );

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleAction = useCallback((action: ActionPayload) => {
    socketRef.current?.emit("action", action);
  }, []);

  const handleStartGame = useCallback(() => {
    socketRef.current?.emit("startGame");
  }, []);

  if (!ready) {
    return <View style={styles.blank} />;
  }

  if (!joined || !state) {
    return (
      <SafeAreaView style={styles.flex}>
        <StatusBar barStyle="light-content" />
        <JoinScreen
          initialServerUrl={initialServerUrl}
          initialNickname={initialNickname}
          initialPhotoDataUri={initialPhoto}
          onJoin={handleJoin}
        />
        {connectionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{connectionError}</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <StatusBar barStyle="light-content" />
      <TableScreen
        state={state}
        hand={hand}
        lastResult={lastResult}
        onAction={handleAction}
        onStartGame={handleStartGame}
      />
      {connectionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{connectionError}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0b3d24" },
  blank: { flex: 1, backgroundColor: "#0b3d24" },
  errorBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#b71c1c",
    padding: 10,
  },
  errorText: { color: "#fff", textAlign: "center" },
});
