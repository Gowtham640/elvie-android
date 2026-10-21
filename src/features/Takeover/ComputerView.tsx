import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../core/api/client";
import { ComputerStatus } from "../../core/api/models";
import { StatusPill } from "../../core/design/components";
import { Theme } from "../../core/design/theme";
import { L10n } from "../../core/l10n";
import { TakeoverView } from "./TakeoverView";

export function ComputerView({
  visible,
  token,
  onClose,
}: {
  visible: boolean;
  token: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ComputerStatus | null>(null);
  const [shot, setShot] = useState<{ uri: string; headers: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setError] = useState<string | null>(null);
  const [showTakeover, setShowTakeover] = useState(false);
  const [vncNote, setVncNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.computerStatus(token);
      setStatus(next);
      if (!next.configured) {
        setError(next.detail ?? "No active user sandbox");
        setShot(null);
        setLoading(false);
        return;
      }
      setShot(api.screenshotUri(token));
      const session = await api.computerSession(token);
      setVncNote(
        session
          ? `Legacy VNC ${session.host}:${session.port} (expires ${session.expiresAt})`
          : "Per-user sandbox: screenshot + action takeover (VNC is not published).",
      );
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!visible) return;
    void load();
    let cancelled = false;
    const beat = async () => {
      while (!cancelled) {
        try {
          await api.takeoverHeartbeat(token);
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
    };
    void beat();
    return () => {
      cancelled = true;
    };
  }, [visible, token, load]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Pressable onPress={onClose}>
            <Text style={styles.link}>Close</Text>
          </Pressable>
          <Text style={styles.title}>Computer</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#fff" />
          }
          contentContainerStyle={{ padding: 16, gap: 16 }}
        >
          <View style={styles.screen}>
            {shot && !loading ? (
              <Image source={shot} style={StyleSheet.absoluteFill} resizeMode="contain" />
            ) : (
              <View style={styles.center}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: Theme.secondaryText }}>
                  {loading ? "Loading computer" : "Computer not ready"}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.statusRow}>
            <StatusPill
              text={status?.boxHealthy ? "Box healthy" : "Box down"}
              kind={status?.boxHealthy ? "success" : "failure"}
            />
            <Text style={{ color: Theme.secondaryText, flex: 1 }}>
              {status?.holder ? `Used by ${status.holder.botName ?? L10n.bot}` : "Idle"}
            </Text>
            <Pressable onPress={() => void load()}>
              <Text style={{ color: Theme.secondaryText }}>Refresh</Text>
            </Pressable>
          </View>
          {status?.waiters && status.waiters.length > 0 ? (
            <Text style={{ color: Theme.secondaryText }}>
              Queue: {status.waiters.map((w) => w.botName ?? w.botId).join(", ")}
            </Text>
          ) : null}
          {vncNote ? <Text style={{ color: Theme.secondaryText, fontSize: 12 }}>{vncNote}</Text> : null}
          {errorText ? <Text style={{ color: Theme.failure }}>{errorText}</Text> : null}
          <Pressable onPress={() => setShowTakeover(true)} style={styles.primary}>
            <Text style={styles.primaryText}>Take control</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              try {
                await api.handoverComputer(token);
                onClose();
              } catch {
                setError("Could not hand the computer back");
              }
            }}
            style={styles.secondary}
          >
            <Text style={{ color: Theme.primaryText, fontWeight: "600", textAlign: "center" }}>Hand over</Text>
          </Pressable>
        </ScrollView>
        <TakeoverView visible={showTakeover} token={token} onClose={() => setShowTakeover(false)} />
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
  screen: {
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, minHeight: 160 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  primary: { backgroundColor: Theme.accent, borderRadius: 999, paddingVertical: 14 },
  primaryText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  secondary: { backgroundColor: Theme.card, borderRadius: 999, paddingVertical: 14 },
});
