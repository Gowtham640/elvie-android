import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Theme } from "../../core/design/theme";

export type PendingAttachment = {
  id: string;
  name: string;
  mime: string;
  uri: string;
};

export function ChatComposerBar({
  draft,
  setDraft,
  botName,
  chooserVisible,
  setChooserVisible,
  onSend,
  isWorking,
  onStop,
  fontSize,
}: {
  draft: string;
  setDraft: (v: string) => void;
  botName: string;
  chooserVisible: boolean;
  setChooserVisible: (v: boolean) => void;
  onSend: (text: string, attachments: PendingAttachment[]) => void;
  isWorking: boolean;
  onStop: () => void;
  fontSize: number;
}) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const canSend = draft.trim().length > 0 || attachments.length > 0;

  async function pickAlbum() {
    setChooserVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.85,
      mediaTypes: ["images"],
    });
    if (result.canceled) return;
    setAttachments((prev) => [
      ...prev,
      ...result.assets.slice(0, 10 - prev.length).map((a) => ({
        id: a.assetId ?? `${Date.now()}-${a.uri}`,
        name: a.fileName ?? `photo-${Date.now()}.jpg`,
        mime: a.mimeType ?? "image/jpeg",
        uri: a.uri,
      })),
    ]);
  }

  async function pickFile() {
    setChooserVisible(false);
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    setAttachments((prev) => [
      ...prev,
      ...result.assets.slice(0, 10 - prev.length).map((a) => ({
        id: a.uri,
        name: a.name,
        mime: a.mimeType ?? "application/octet-stream",
        uri: a.uri,
      })),
    ]);
  }

  return (
    <View style={styles.wrap}>
      {chooserVisible ? (
        <View style={styles.menu}>
          <Pressable onPress={() => void pickAlbum()} style={styles.menuRow}>
            <Text style={styles.menuText}>Album</Text>
          </Pressable>
          <Pressable onPress={() => void pickFile()} style={styles.menuRow}>
            <Text style={styles.menuText}>File</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.field}>
        {attachments.length > 0 ? (
          <ScrollView horizontal style={{ height: 84 }} contentContainerStyle={{ gap: 8, padding: 10 }}>
            {attachments.map((att) => (
              <View key={att.id} style={styles.chip}>
                {att.mime.startsWith("image/") ? (
                  <Image source={{ uri: att.uri }} style={styles.thumb} />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 10 }} numberOfLines={1}>
                    {att.name}
                  </Text>
                )}
                <Pressable
                  onPress={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  style={styles.remove}
                >
                  <Text style={{ color: "#fff", fontSize: 10 }}>✕</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.row}>
          <Pressable
            onPress={() => setChooserVisible(!chooserVisible)}
            accessibilityLabel="Add attachment"
            style={styles.plus}
          >
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "600" }}>+</Text>
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${botName}`}
            placeholderTextColor={Theme.secondaryText}
            multiline
            style={[styles.input, { fontSize }]}
          />
          {isWorking && !canSend ? (
            <Pressable onPress={onStop} style={styles.send} accessibilityLabel="Stop">
              <View style={styles.stop} />
            </Pressable>
          ) : canSend ? (
            <Pressable
              onPress={() => {
                const outgoing = attachments;
                const text = draft;
                setAttachments([]);
                setChooserVisible(false);
                setDraft("");
                onSend(text, outgoing);
              }}
              style={styles.send}
              accessibilityLabel="Send"
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>↑</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 6 },
  field: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 22, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "flex-end", minHeight: Theme.chip },
  plus: { width: 32, height: 32, alignItems: "center", justifyContent: "center", margin: 6 },
  input: { flex: 1, color: Theme.primaryText, paddingVertical: 12, maxHeight: 140 },
  send: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Theme.accent,
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
  },
  stop: { width: 10, height: 10, backgroundColor: "#fff" },
  menu: {
    position: "absolute",
    left: 26,
    bottom: 60,
    width: 188,
    backgroundColor: Theme.cardElevated,
    borderRadius: 16,
    zIndex: 4,
  },
  menuRow: { height: 44, justifyContent: "center", paddingHorizontal: 12 },
  menuText: { color: Theme.primaryText, fontSize: 16 },
  chip: { width: 64, height: 64 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  remove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
});
