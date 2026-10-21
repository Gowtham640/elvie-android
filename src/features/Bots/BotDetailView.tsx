import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../core/api/client";
import {
  BotSummary,
  DocumentFull,
  DocumentSummary,
  FileItem,
  LinkItem,
  Routine,
  RoutineRun,
} from "../../core/api/models";
import { AvatarView } from "../../core/design/components";
import { MarkdownText } from "../../core/design/MarkdownText";
import { Theme } from "../../core/design/theme";

function phraseSchedule(raw?: string | null): string {
  if (!raw?.trim()) return "No schedule";
  return raw.replace(/\b([01]\d|2[0-3]):([0-5]\d)\b/g, (_, h, m) => {
    const hour = Number(h);
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:${m} ${hour < 12 ? "AM" : "PM"}`;
  });
}

export function BotDetailView({
  visible,
  bot,
  token,
  onClose,
  onBotUpdated,
}: {
  visible: boolean;
  bot: BotSummary | null;
  token: string;
  onClose: () => void;
  onBotUpdated: (bot: BotSummary) => void;
}) {
  const [name, setName] = useState(bot?.name ?? "");
  const [elfTitle, setTitle] = useState(bot?.title ?? "");
  const [avatarSeed, setSeed] = useState(bot?.avatarSeed);
  const [botVersion, setVersion] = useState(bot?.version ?? 1);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [instructionsVersion, setInstructionsVersion] = useState(1);
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [media, setMedia] = useState<FileItem[]>([]);
  const [openDocument, setOpenDocument] = useState<DocumentFull | null>(null);
  const [openRoutine, setOpenRoutine] = useState<Routine | null>(null);
  const [errorText, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !bot) return;
    setName(bot.name);
    setTitle(bot.title);
    setSeed(bot.avatarSeed);
    setVersion(bot.version);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, bot?.id]);

  async function load() {
    if (!bot) return;
    setLoading(true);
    try {
      const doc = await api.instructions(token, bot.id);
      setInstructions(doc.text);
      setInstructionsVersion(doc.version);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
    try {
      setRoutines(await api.routines(token, bot.id));
    } catch (e: any) {
      setError((prev) => prev ?? e.message);
    }
    setDocuments((await api.documents(token, bot.id).catch(() => [])) as DocumentSummary[]);
    setLinks((await api.links(token, bot.id).catch(() => [])) as LinkItem[]);
    setFiles((await api.files(token, bot.id).catch(() => [])) as FileItem[]);
    setMedia((await api.media(token, bot.id).catch(() => [])) as FileItem[]);
    setLoading(false);
  }

  function apply(updated: BotSummary) {
    setName(updated.name);
    setTitle(updated.title);
    setSeed(updated.avatarSeed);
    setVersion(updated.version);
    onBotUpdated(updated);
    setError(null);
  }

  async function openFile(id: string) {
    const file = files.find((f) => f.id === id) ?? media.find((f) => f.id === id);
    if (!file) return;
    try {
      const path = await api.downloadFile(token, id, file.name);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    } catch {
      setError("Could not open that file");
    }
  }

  if (!bot) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Pressable onPress={onClose}>
            <Text style={styles.link}>Close</Text>
          </Pressable>
          <Text style={styles.title}>{name}</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <AvatarView name={name} seed={avatarSeed} size={72} />
            <View style={{ flex: 1 }}>
              {editingIdentity ? (
                <>
                  <TextInput value={draftName} onChangeText={setDraftName} style={styles.input} />
                  <TextInput value={draftTitle} onChangeText={setDraftTitle} style={styles.input} />
                </>
              ) : (
                <>
                  <Text style={{ color: Theme.primaryText, fontSize: 22, fontWeight: "700" }}>{name}</Text>
                  {elfTitle ? <Text style={{ color: Theme.secondaryText }}>{elfTitle}</Text> : null}
                </>
              )}
            </View>
            <Pressable
              onPress={async () => {
                const seed = String(Date.now());
                setSeed(seed);
                try {
                  apply(await api.patchBot(token, bot.id, { avatarSeed: seed, version: botVersion }));
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              <Text style={styles.link}>Shuffle</Text>
            </Pressable>
            {editingIdentity ? (
              <Pressable
                onPress={async () => {
                  try {
                    apply(
                      await api.patchBot(token, bot.id, {
                        name: draftName.trim(),
                        title: draftTitle.trim(),
                        version: botVersion,
                      }),
                    );
                    setEditingIdentity(false);
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
              >
                <Text style={styles.link}>Save</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setDraftName(name);
                  setDraftTitle(elfTitle);
                  setEditingIdentity(true);
                }}
              >
                <Text style={styles.link}>Edit</Text>
              </Pressable>
            )}
          </View>
          {loading ? <ActivityIndicator color="#fff" /> : null}
          {errorText ? <Text style={{ color: Theme.failure }}>{errorText}</Text> : null}

          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>Instructions</Text>
              <Pressable
                onPress={() => {
                  if (editingInstructions) {
                    void (async () => {
                      try {
                        const doc = await api.putInstructions(token, bot.id, instructionsDraft, instructionsVersion);
                        setInstructions(doc.text);
                        setInstructionsVersion(doc.version);
                        setEditingInstructions(false);
                      } catch (e: any) {
                        setError(e.message);
                      }
                    })();
                  } else {
                    setInstructionsDraft(instructions);
                    setEditingInstructions(true);
                  }
                }}
              >
                <Text style={styles.link}>{editingInstructions ? "Save" : "Edit"}</Text>
              </Pressable>
            </View>
            {editingInstructions ? (
              <TextInput
                value={instructionsDraft}
                onChangeText={setInstructionsDraft}
                multiline
                style={[styles.input, { minHeight: 180, textAlignVertical: "top" }]}
              />
            ) : (
              <Text style={{ color: Theme.secondaryText }} numberOfLines={6}>
                {instructions || "None yet"}
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Routines</Text>
            {routines.length === 0 ? (
              <Text style={{ color: Theme.secondaryText }}>None yet. Ask this elf in chat to set one up.</Text>
            ) : (
              routines.map((r) => (
                <Pressable key={r.id} onPress={() => setOpenRoutine(r)} style={styles.listRow}>
                  <Text style={{ color: Theme.primaryText, fontWeight: "600", flex: 1 }}>{r.name}</Text>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: r.active ? Theme.success : "rgba(142,142,147,0.4)",
                    }}
                  />
                </Pressable>
              ))
            )}
          </View>

          <Library
            title="Documents"
            rows={documents.map((d) => [d.id, d.title] as const)}
            onTap={async (id) => setOpenDocument(await api.document(token, id).catch(() => null))}
          />
          <Library
            title="Links"
            rows={links.map((l) => [l.id, l.title || l.domain] as const)}
            onTap={(id) => {
              const item = links.find((l) => l.id === id);
              if (item) void Linking.openURL(item.url);
            }}
          />
          <Library title="Files" rows={files.map((f) => [f.id, f.name] as const)} onTap={(id) => void openFile(id)} />
          <Library title="Media" rows={media.map((f) => [f.id, f.name] as const)} onTap={(id) => void openFile(id)} />
        </ScrollView>
      </View>
      <DocumentModal doc={openDocument} onClose={() => setOpenDocument(null)} />
      <RoutineModal token={token} routine={openRoutine} onClose={() => setOpenRoutine(null)} />
    </Modal>
  );
}

function Library({
  title,
  rows,
  onTap,
}: {
  title: string;
  rows: ReadonlyArray<readonly [string, string]>;
  onTap: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={{ color: Theme.secondaryText }}>None yet</Text>
      ) : (
        rows.map(([id, label]) => (
          <Pressable key={id} onPress={() => onTap(id)} style={styles.listRow}>
            <Text style={{ color: Theme.primaryText, fontWeight: "600" }}>{label}</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

function DocumentModal({ doc, onClose }: { doc: DocumentFull | null; onClose: () => void }) {
  return (
    <Modal visible={!!doc} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Pressable onPress={onClose}>
            <Text style={styles.link}>Close</Text>
          </Pressable>
          <Text style={styles.title}>{doc?.title}</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <MarkdownText markdown={doc?.bodyMd ?? ""} fontSize={15} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function RoutineModal({
  token,
  routine,
  onClose,
}: {
  token: string;
  routine: Routine | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<Routine | null>(routine);
  const [runs, setRuns] = useState<RoutineRun[]>([]);
  useEffect(() => {
    setCurrent(routine);
    if (!routine) return;
    void (async () => {
      try {
        setCurrent(await api.routine(token, routine.id));
        setRuns(await api.routineRuns(token, routine.id));
      } catch {
        /* ignore */
      }
    })();
  }, [routine, token]);
  if (!current) return null;
  return (
    <Modal visible={!!routine} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Pressable onPress={onClose}>
            <Text style={styles.link}>Close</Text>
          </Pressable>
          <Text style={styles.title}>{current.name}</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: Theme.primaryText }}>Active</Text>
              <Switch
                value={current.active}
                onValueChange={async (v) => {
                  try {
                    setCurrent(await api.toggleRoutine(token, current.id, v));
                  } catch {
                    /* ignore */
                  }
                }}
                trackColor={{ true: Theme.success }}
              />
            </View>
          </View>
          <View style={styles.card}>
            <Text style={{ color: Theme.secondaryText, marginBottom: 8 }}>What it does</Text>
            <Text style={{ color: Theme.primaryText }}>{current.instruction}</Text>
          </View>
          <View style={styles.card}>
            <Text style={{ color: Theme.secondaryText, marginBottom: 8 }}>When</Text>
            <Text style={{ color: Theme.primaryText }}>{phraseSchedule(current.scheduleSummary)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={{ color: Theme.secondaryText, marginBottom: 8 }}>Run history</Text>
            {runs.length === 0 ? (
              <Text style={{ color: Theme.secondaryText }}>No runs yet.</Text>
            ) : (
              runs.map((run) => (
                <View key={run.id} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: Theme.primaryText }}>{run.status}</Text>
                  {run.summary ? <Text style={{ color: Theme.secondaryText }}>{run.summary}</Text> : null}
                </View>
              ))
            )}
          </View>
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
  card: { backgroundColor: Theme.card, borderRadius: 16, padding: 12, gap: 4 },
  cardTitle: { color: Theme.primaryText, fontWeight: "600", fontSize: 18, marginBottom: 8 },
  input: { backgroundColor: Theme.cardElevated, color: Theme.primaryText, borderRadius: 10, padding: 10, marginTop: 6 },
  listRow: { paddingVertical: 12, flexDirection: "row", alignItems: "center" },
});
