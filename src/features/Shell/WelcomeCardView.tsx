import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BotSummary } from "../../core/api/models";
import { AvatarView, CircleChipButton } from "../../core/design/components";
import { BlobAvatar } from "../../core/design/BlobAvatar";
import { Theme } from "../../core/design/theme";

export function WelcomeCardView({
  recent,
  onSelect,
  onMenu,
  onCreate,
  safeTop,
  safeBottom,
}: {
  recent: BotSummary[];
  token: string;
  onSelect: (bot: BotSummary) => void;
  onMenu: () => void;
  onCreate: () => void;
  safeTop: number;
  safeBottom: number;
}) {
  const [blobSeed, setBlobSeed] = useState(() => String(Date.now()));
  useEffect(() => {
    const id = setInterval(() => setBlobSeed(String(Date.now()) + Math.random()), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: safeTop + Theme.chromeGap }]}>
        <CircleChipButton icon="menu" label="All chats" onPress={onMenu} />
      </View>
      <View style={{ flex: 1 }} />
      <View style={styles.greeting}>
        <BlobAvatar name="Elvie" seed={blobSeed} size={132} />
        <Text style={styles.hero}>{"Tell an elf.\nThey'll take it from here."}</Text>
      </View>
      <View style={{ flex: 1 }} />
      {recent.length > 0 ? (
        <View style={[styles.recent, { paddingBottom: Theme.spaceBlock + safeBottom }]}>
          {recent.map((bot) => (
            <Pressable key={bot.id} onPress={() => onSelect(bot)} style={styles.recentItem}>
              <AvatarView name={bot.name} seed={bot.avatarSeed} size={84} />
              <Text style={styles.recentName} numberOfLines={1}>
                {bot.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable onPress={onCreate} style={[styles.create, { marginBottom: Theme.spaceBlock + safeBottom }]}>
          <Text style={styles.createText}>Create your first elf</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.background },
  header: { paddingHorizontal: Theme.spaceL },
  greeting: { alignItems: "center", paddingHorizontal: Theme.spaceXL, gap: Theme.spaceL },
  hero: {
    fontSize: 22,
    fontWeight: "600",
    color: Theme.primaryText,
    textAlign: "center",
  },
  recent: { flexDirection: "row", paddingHorizontal: Theme.spaceL, gap: Theme.spaceM },
  recentItem: { flex: 1, alignItems: "center", gap: Theme.spaceS },
  recentName: { color: Theme.primaryText, fontSize: 14, fontWeight: "500" },
  create: {
    alignSelf: "center",
    paddingHorizontal: Theme.spaceXL,
    paddingVertical: Theme.spaceM,
    borderRadius: 999,
    backgroundColor: Theme.cardElevated,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  createText: { color: Theme.primaryText, fontWeight: "500" },
});
