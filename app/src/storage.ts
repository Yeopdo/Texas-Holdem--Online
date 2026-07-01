import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "poker.deviceId";
const NICKNAME_KEY = "poker.nickname";
const PHOTO_KEY = "poker.photoDataUri";
const SERVER_URL_KEY = "poker.serverUrl";

function randomId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = randomId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function getSavedProfile(): Promise<{ nickname: string; photoDataUri?: string }> {
  const [nickname, photoDataUri] = await Promise.all([
    AsyncStorage.getItem(NICKNAME_KEY),
    AsyncStorage.getItem(PHOTO_KEY),
  ]);
  return { nickname: nickname ?? "", photoDataUri: photoDataUri ?? undefined };
}

export async function saveProfile(nickname: string, photoDataUri?: string): Promise<void> {
  await AsyncStorage.setItem(NICKNAME_KEY, nickname);
  if (photoDataUri) await AsyncStorage.setItem(PHOTO_KEY, photoDataUri);
}

export async function getSavedServerUrl(): Promise<string> {
  return (await AsyncStorage.getItem(SERVER_URL_KEY)) ?? "";
}

export async function saveServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url);
}
