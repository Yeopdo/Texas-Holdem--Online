import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

async function resizeAndEncode(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize({ width: 200, height: 200 }).renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.5, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}

export function JoinScreen({
  initialServerUrl,
  initialNickname,
  initialPhotoDataUri,
  onJoin,
}: {
  initialServerUrl: string;
  initialNickname: string;
  initialPhotoDataUri?: string;
  onJoin: (serverUrl: string, nickname: string, photoDataUri?: string) => void;
}) {
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [nickname, setNickname] = useState(initialNickname);
  const [photoDataUri, setPhotoDataUri] = useState<string | undefined>(initialPhotoDataUri);
  const [busy, setBusy] = useState(false);

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진을 선택하려면 갤러리 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    try {
      setPhotoDataUri(await resizeAndEncode(result.assets[0].uri));
    } finally {
      setBusy(false);
    }
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진을 찍으려면 카메라 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    try {
      setPhotoDataUri(await resizeAndEncode(result.assets[0].uri));
    } finally {
      setBusy(false);
    }
  }

  function choosePhoto() {
    Alert.alert("프로필 사진", "사진을 어디서 가져올까요?", [
      { text: "카메라", onPress: pickFromCamera },
      { text: "갤러리", onPress: pickFromLibrary },
      { text: "취소", style: "cancel" },
    ]);
  }

  const canJoin = serverUrl.trim().length > 0 && nickname.trim().length > 0 && !busy;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>도엽이 포커</Text>

      <Pressable style={styles.avatarButton} onPress={choosePhoto} disabled={busy}>
        {photoDataUri ? (
          <Image source={{ uri: photoDataUri }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.avatarPlaceholderText}>사진 추가</Text>}
          </View>
        )}
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="닉네임"
        placeholderTextColor="#888"
        value={nickname}
        onChangeText={setNickname}
        maxLength={12}
      />
      <TextInput
        style={styles.input}
        placeholder="서버 주소 (예: https://your-app.onrender.com)"
        placeholderTextColor="#888"
        value={serverUrl}
        onChangeText={setServerUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable
        style={[styles.joinButton, !canJoin && styles.joinButtonDisabled]}
        disabled={!canJoin}
        onPress={() => onJoin(serverUrl.trim(), nickname.trim(), photoDataUri)}
      >
        <Text style={styles.joinButtonText}>입장하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b3d24", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 24 },
  avatarButton: { marginBottom: 20 },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: "#fff" },
  avatarPlaceholder: { backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarPlaceholderText: { color: "#fff", fontSize: 12 },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  joinButton: {
    width: "100%",
    backgroundColor: "#ffd54f",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  joinButtonDisabled: { opacity: 0.5 },
  joinButtonText: { color: "#1a1a1a", fontWeight: "800", fontSize: 16 },
});
