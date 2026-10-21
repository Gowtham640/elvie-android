import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlobAvatar } from "./BlobAvatar";
import { Theme } from "./theme";

export function CircleChipButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.chip}
    >
      <Ionicons name={icon} size={18} color={Theme.primaryText} />
    </Pressable>
  );
}

export function AvatarView({
  name,
  seed,
  size = Theme.avatarList,
}: {
  name: string;
  seed?: string | null;
  size?: number;
}) {
  return <BlobAvatar name={name} seed={seed} size={size} />;
}

export function StatusPill({
  text,
  kind = "neutral",
}: {
  text: string;
  kind?: "neutral" | "success" | "failure";
}) {
  const fill =
    kind === "success" ? "rgba(48,209,88,0.35)" : kind === "failure" ? "rgba(255,107,107,0.35)" : Theme.cardElevated;
  return (
    <View style={[styles.pill, { backgroundColor: fill }]}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

export function GlassField({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

export function ProfilePhoto({
  uri,
  name,
  size = 36,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.mono, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.monoText}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function Busy() {
  return <ActivityIndicator color={Theme.primaryText} />;
}

const styles = StyleSheet.create({
  chip: {
    width: Theme.chip,
    height: Theme.chip,
    borderRadius: Theme.chip / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    paddingHorizontal: Theme.spaceM,
    paddingVertical: Theme.spaceXS,
    borderRadius: 999,
  },
  pillText: { color: Theme.primaryText, fontSize: 12 },
  glass: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
  },
  mono: {
    backgroundColor: Theme.cardElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  monoText: { color: Theme.primaryText, fontWeight: "600" },
});
