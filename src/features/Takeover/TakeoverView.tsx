import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../core/api/client";
import { CircleChipButton } from "../../core/design/components";
import { Theme } from "../../core/design/theme";

const KEYS: [string, string][] = [
  ["Esc", "Escape"],
  ["Tab", "Tab"],
  ["⌫", "BackSpace"],
  ["←", "Left"],
  ["→", "Right"],
  ["↑", "Up"],
  ["↓", "Down"],
  ["Enter", "Return"],
];

export function TakeoverView({
  visible,
  token,
  onClose,
}: {
  visible: boolean;
  token: string;
  onClose: () => void;
}) {
  const [shot, setShot] = useState<{ uri: string; headers: Record<string, string> } | null>(null);
  const [errorText, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const layout = useRef({ w: 1, h: 1 });
  const pendingTap = useRef<{ x: number; y: number; at: number } | null>(null);
  const began = useRef<number | null>(null);
  const start = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        setShot(api.screenshotUri(token));
        try {
          await api.takeoverHeartbeat(token);
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
    };
    void loop();
    return () => {
      cancelled = true;
    };
  }, [visible, token]);

  function mapPoint(x: number, y: number) {
    const w = layout.current.w;
    const h = layout.current.h;
    return { x: Math.round((x / w) * 1280), y: Math.round((y / h) * 720) };
  }

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      began.current = Date.now();
      start.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
    },
    onPanResponderRelease: (e) => {
      const held = Date.now() - (began.current ?? Date.now());
      const loc = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
      const moved = Math.hypot(loc.x - start.current.x, loc.y - start.current.y);
      const point = mapPoint(loc.x, loc.y);
      if (moved < 14 && held >= 450) {
        pendingTap.current = null;
        void api.computerAction(token, "right_click", point).catch((err) => setError(String(err)));
      } else if (moved < 14) {
        const now = Date.now();
        const pending = pendingTap.current;
        if (pending && now - pending.at < 320 && Math.hypot(pending.x - loc.x, pending.y - loc.y) < 28) {
          pendingTap.current = null;
          void api.computerAction(token, "double_click", point).catch((err) => setError(String(err)));
        } else {
          pendingTap.current = { x: loc.x, y: loc.y, at: now };
          setTimeout(() => {
            if (pendingTap.current?.at !== now) return;
            pendingTap.current = null;
            void api.computerAction(token, "click", point).catch((err) => setError(String(err)));
          }, 280);
        }
      } else if (held >= 350) {
        const from = mapPoint(start.current.x, start.current.y);
        void api
          .computerAction(token, "drag", { x: from.x, y: from.y, x2: point.x, y2: point.y })
          .catch((err) => setError(String(err)));
      } else if (Math.abs(loc.y - start.current.y) >= Math.abs(loc.x - start.current.x)) {
        const dy = Math.round((loc.y - start.current.y) / 28);
        if (dy !== 0) {
          void api.computerAction(token, "scroll", { ...point, dy }).catch((err) => setError(String(err)));
        }
      }
    },
  });

  if (!visible) return null;

  return (
    <View style={styles.root}>
      <View
        style={styles.stage}
        onLayout={(e) => {
          layout.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        }}
        {...pan.panHandlers}
      >
        {shot ? (
          <Image source={shot} style={StyleSheet.absoluteFill} resizeMode="contain" />
        ) : (
          <Text style={{ color: Theme.secondaryText }}>Loading computer</Text>
        )}
      </View>
      <View style={styles.top} pointerEvents="box-none">
        <CircleChipButton icon="chevron-back" label="Back" onPress={onClose} />
        <Text style={styles.hint}>Tap, double-tap, hold, drag</Text>
        <Pressable
          onPress={async () => {
            try {
              await api.handoverComputer(token);
              onClose();
            } catch {
              setError("Could not hand the computer back");
            }
          }}
          style={styles.hand}
        >
          <Text style={{ color: Theme.primaryText, fontWeight: "600" }}>Hand over</Text>
        </Pressable>
      </View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      <View style={styles.bar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {KEYS.map(([label, name]) => (
            <Pressable key={name} onPress={() => void api.computerAction(token, "key", { key: name })} style={styles.key}>
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder="Type on the computer"
            placeholderTextColor={Theme.secondaryText}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void sendTyped(true)}
            style={styles.input}
          />
          <Pressable onPress={() => void sendTyped(false)} style={styles.send}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>↑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  async function sendTyped(pressReturn: boolean) {
    const text = typed.trim();
    if (!text) return;
    setTyped("");
    try {
      await api.computerAction(token, "type", { text });
      if (pressReturn) await api.computerAction(token, "key", { key: "Return" });
      setError(null);
    } catch (e: any) {
      setTyped(text);
      setError(e.message ?? String(e));
    }
  }
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: "#000", zIndex: 40 },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  top: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hint: { color: Theme.primaryText, fontSize: 12, backgroundColor: "rgba(255,255,255,0.1)", padding: 8, borderRadius: 999 },
  hand: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  error: { color: Theme.failure, textAlign: "center", marginBottom: 8 },
  bar: { padding: 12, paddingBottom: 24 },
  key: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    paddingHorizontal: 12,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: Theme.accent, alignItems: "center", justifyContent: "center" },
});
