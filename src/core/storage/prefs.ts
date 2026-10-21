import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatTextSize } from "../design/theme";

const KEY = "elvie.chatTextSize";

export async function loadChatTextSize(): Promise<ChatTextSize> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === "small" || raw === "medium" || raw === "large") return raw;
  return "medium";
}

export async function saveChatTextSize(size: ChatTextSize): Promise<void> {
  await AsyncStorage.setItem(KEY, size);
}
