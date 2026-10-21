import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../core/api/client";
import { BotSummary } from "../../core/api/models";
import { AvatarView } from "../../core/design/components";
import { Theme } from "../../core/design/theme";
import { L10n } from "../../core/l10n";

export function CreateBotSheet({
  visible,
  token,
  onClose,
  onCreated,
}: {
  visible: boolean;
  token: string;
  onClose: () => void;
  onCreated: (bot: BotSummary) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarSeed, setAvatarSeed] = useState(() => String(Date.now()));
  const [errorText, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewName = name.trim() || "Elvie";

  async function create() {
    setBusy(true);
    try {
      const bot = await api.createBot(token, name.trim(), title, avatarSeed);
      onCreated(bot);
      setName("");
      setTitle("");
      onClose();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Pressable onPress={onClose}>
            <Text style={styles.link}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>New {L10n.bot}</Text>
          <Pressable onPress={() => void create()} disabled={!name.trim() || busy}>
            <Text style={[styles.link, { opacity: !name.trim() || busy ? 0.4 : 1 }]}>Create</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <AvatarView name={previewName} seed={avatarSeed} size={72} />
          <View style={{ flex: 1, gap: 6 }}>
            <Pressable onPress={() => setAvatarSeed(String(Date.now()))}>
              <Text style={{ color: Theme.accent }}>Shuffle</Text>
            </Pressable>
            <Text style={{ color: Theme.secondaryText, fontSize: 12 }}>
              This mark is how you recognise the bot everywhere.
            </Text>
          </View>
        </View>
        <TextInput
          placeholder="Name"
          placeholderTextColor={Theme.secondaryText}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="Title (optional)"
          placeholderTextColor={Theme.secondaryText}
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        {errorText ? <Text style={{ color: Theme.failure }}>{errorText}</Text> : null}
        {busy ? <ActivityIndicator color={Theme.primaryText} /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.background, padding: Theme.spaceL, gap: 12 },
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 48 },
  title: { color: Theme.primaryText, fontWeight: "600" },
  link: { color: Theme.accent, fontWeight: "600" },
  card: { flexDirection: "row", gap: Theme.spaceM, alignItems: "center" },
  input: {
    backgroundColor: Theme.card,
    color: Theme.primaryText,
    borderRadius: 12,
    padding: 14,
  },
});
