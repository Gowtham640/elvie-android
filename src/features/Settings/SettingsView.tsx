import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "../../core/auth/SessionStore";
import { ProfilePhoto } from "../../core/design/components";
import { ChatTextSize, Theme } from "../../core/design/theme";
import { loadChatTextSize, saveChatTextSize } from "../../core/storage/prefs";
import { UsageView } from "./UsageView";

export function SettingsView({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const session = useSession();
  const [size, setSize] = useState<ChatTextSize>("medium");
  const [showUsage, setShowUsage] = useState(false);
  const email = session.email ?? "Signed in with Google";
  const displayName =
    session.fullName && session.fullName.length > 0
      ? session.fullName
      : email.split("@")[0] || "Account";
  const version = `${Constants.expoConfig?.version ?? "1.0"} (${Constants.nativeBuildVersion ?? "1"})`;

  useEffect(() => {
    void loadChatTextSize().then(setSize);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Text style={styles.title}>Settings</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.link}>Done</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.section}>Profile</Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <ProfilePhoto uri={session.pictureURL} name={displayName} size={44} />
            <View>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.sub}>{email}</Text>
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.section}>App</Text>
          <View style={styles.row}>
            <Text style={styles.name}>Appearance</Text>
            <Text style={styles.sub}>Dark</Text>
          </View>
          {session.cachedToken ? (
            <Pressable onPress={() => setShowUsage(true)} style={styles.row}>
              <Text style={styles.name}>Usage</Text>
              <Text style={styles.sub}>›</Text>
            </Pressable>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.name}>Font size</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["small", "medium", "large"] as ChatTextSize[]).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    setSize(s);
                    void saveChatTextSize(s);
                  }}
                  style={[styles.sizeChip, size === s && styles.sizeOn]}
                >
                  <Text style={{ color: Theme.primaryText, textTransform: "capitalize" }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.section}>About</Text>
          <View style={styles.row}>
            <Text style={styles.name}>Version</Text>
            <Text style={styles.sub}>{version}</Text>
          </View>
        </View>
        <Pressable
          onPress={async () => {
            await session.signOut();
            onClose();
          }}
          style={styles.card}
        >
          <Text style={{ color: Theme.failure, fontWeight: "600" }}>Log out</Text>
        </Pressable>
      </View>
      <Modal visible={showUsage} animationType="slide" onRequestClose={() => setShowUsage(false)}>
        <View style={styles.root}>
          <View style={styles.bar}>
            <Text style={styles.title}>Usage</Text>
            <Pressable onPress={() => setShowUsage(false)}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          </View>
          {session.cachedToken ? <UsageView token={session.cachedToken} /> : null}
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.background, padding: Theme.spaceL, gap: 14 },
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 48 },
  title: { color: Theme.primaryText, fontSize: 20, fontWeight: "600" },
  link: { color: Theme.accent, fontWeight: "600" },
  card: { backgroundColor: Theme.card, borderRadius: 16, padding: Theme.spaceM, gap: 10 },
  section: { color: Theme.secondaryText, fontSize: 13 },
  name: { color: Theme.primaryText, fontWeight: "600" },
  sub: { color: Theme.secondaryText },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sizeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Theme.cardElevated },
  sizeOn: { backgroundColor: Theme.accent },
});
