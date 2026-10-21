import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../core/api/client";
import { ElfThread } from "../../core/api/models";
import { AvatarView } from "../../core/design/components";
import { Theme } from "../../core/design/theme";

export function ElfThreadView({
  visible,
  token,
  chainId,
  onClose,
}: {
  visible: boolean;
  token: string;
  chainId: string | null;
  onClose: () => void;
}) {
  const [thread, setThread] = useState<ElfThread | null>(null);
  const [errorText, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !chainId) return;
    void (async () => {
      try {
        setThread(await api.thread(token, chainId));
        setError(null);
      } catch (e: any) {
        setError(e.message ?? String(e));
      }
    })();
  }, [visible, token, chainId]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Pressable onPress={onClose}>
            <Text style={styles.link}>Close</Text>
          </Pressable>
          <Text style={styles.title}>Handoff</Text>
          <Text style={{ color: Theme.secondaryText }}>Read-only</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }}>
          {errorText ? <Text style={{ color: Theme.failure }}>{errorText}</Text> : null}
          <View style={{ flexDirection: "row", gap: 20 }}>
            {(thread?.peers ?? []).map((peer) => (
              <View key={peer.id} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <AvatarView name={peer.name} seed={peer.avatarSeed ?? peer.id} size={44} />
                <Text style={{ color: Theme.primaryText, fontWeight: "600" }} numberOfLines={1}>
                  {peer.name}
                </Text>
              </View>
            ))}
          </View>
          {(thread?.exchanges ?? []).map((ex) => {
            const peer = thread?.peers.find((p) => p.id === ex.fromBotId);
            return (
              <View key={ex.id} style={{ flexDirection: "row", gap: 8 }}>
                <AvatarView name={ex.fromBotName} seed={peer?.avatarSeed ?? ex.fromBotId} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Theme.secondaryText, fontWeight: "600", marginBottom: 4 }}>
                    {ex.fromBotName}
                  </Text>
                  <View style={styles.bubble}>
                    <Text style={{ color: Theme.primaryText }}>{ex.text}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.background },
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  title: { color: Theme.primaryText, fontWeight: "600" },
  link: { color: Theme.accent, fontWeight: "600" },
  bubble: {
    backgroundColor: Theme.card,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
