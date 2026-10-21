import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../core/api/client";
import { BotSummary, ChatMessage, DocumentFull, messagesEqual } from "../../core/api/models";
import { AvatarView, CircleChipButton } from "../../core/design/components";
import { MarkdownText } from "../../core/design/MarkdownText";
import { ChatTextSizes, ChatTextSize, Theme } from "../../core/design/theme";
import { loadChatTextSize } from "../../core/storage/prefs";
import { BotDetailView } from "../Bots/BotDetailView";
import { ComputerView } from "../Takeover/ComputerView";
import { ChatComposerBar, PendingAttachment } from "./ChatComposerBar";
import { ElfThreadView } from "./ElfThreadView";
import { ShellController } from "../Shell/shellState";

const ACTIVE = new Set(["queued", "running", "waiting_computer", "waiting_owner", "awaiting_approval"]);
const COMPUTER = new Set(["waiting_computer", "waiting_owner"]);

export function ChatView({
  bot,
  token,
  shell,
  onTurnFinished,
  onBotUpdated,
}: {
  bot: BotSummary;
  token: string;
  shell: ShellController;
  onTurnFinished: () => void;
  onBotUpdated: (bot: BotSummary) => void;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorText, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showComputer, setShowComputer] = useState(false);
  const [statusWord, setStatusWord] = useState("thinking...");
  const [chooserVisible, setChooserVisible] = useState(false);
  const [openChainId, setOpenChainId] = useState<string | null>(null);
  const [avatarSeeds, setAvatarSeeds] = useState<Record<string, string>>({});
  const [decidingApprovalId, setDeciding] = useState<string | null>(null);
  const [searchDocument, setSearchDocument] = useState<DocumentFull | null>(null);
  const [fontSize, setFontSize] = useState<number>(Theme.chatFont);
  const [refreshing, setRefreshing] = useState(false);
  const activeRunId = useRef<string | undefined>(undefined);
  const watching = useRef(false);
  const holdingHistory = useRef(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    void loadChatTextSize().then((s: ChatTextSize) => setFontSize(ChatTextSizes[s]));
  }, []);

  const load = useCallback(async () => {
    try {
      if (shell.focusMessageId) {
        const id = shell.focusMessageId;
        shell.setFocusMessage(null);
        const latest = await api.messages(token, bot.id);
        if (latest.some((m) => m.id === id)) {
          holdingHistory.current = false;
          setMessages(latest);
        } else {
          const window = await api.messages(token, bot.id, id);
          holdingHistory.current = true;
          setMessages(window.length ? window : latest);
        }
      } else if (!holdingHistory.current) {
        setMessages(await api.messages(token, bot.id));
      }
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
    if (shell.focusDocumentId) {
      const id = shell.focusDocumentId;
      shell.setFocusDocument(null);
      setSearchDocument(await api.document(token, id).catch(() => null));
    }
    const roster = await api.bots(token).catch(() => []);
    const next: Record<string, string> = {};
    for (const elf of roster) next[elf.id] = elf.avatarSeed ?? elf.id;
    setAvatarSeeds(next);
  }, [bot.id, token, shell]);

  const watchUntilSettled = useCallback(async () => {
    let misses = 0;
    while (sendingRef.current) {
      await new Promise((r) => setTimeout(r, 2000));
      if (!sendingRef.current) break;
      if (activeRunId.current) {
        const run = await api.runStatus(token, activeRunId.current).catch(() => null);
        setStatusWord(run && COMPUTER.has(run.status) ? "Using Computer" : "Thinking...");
        if (run && !ACTIVE.has(run.status)) break;
        if (!run) {
          misses += 1;
          if (misses > 15) break;
        } else misses = 0;
      }
      const fresh = await api.messages(token, bot.id).catch(() => null);
      if (fresh) setMessages((prev) => (messagesEqual(prev, fresh) ? prev : fresh));
    }
    onTurnFinished();
  }, [bot.id, token, onTurnFinished]);

  const catchUp = useCallback(async () => {
    if (watching.current || holdingHistory.current) return;
    const fresh = await api.messages(token, bot.id).catch(() => null);
    if (!fresh) return;
    setMessages((prev) => (messagesEqual(prev, fresh) ? prev : fresh));
    if (sendingRef.current) return;
    const last = fresh[fresh.length - 1];
    let runId: string | undefined;
    if (!last) return;
    if (last.role === "assistant" && (last.status === "complete" || last.status === "error")) return;
    if (last.status === "streaming" || last.role === "user") runId = last.runId ?? undefined;
    else if (last.kind === "approval" || last.kind === "takeover_request") {
      runId = last.runId ?? [...fresh].reverse().find((m) => m.runId)?.runId ?? undefined;
    }
    if (!runId) return;
    const run = await api.runStatus(token, runId).catch(() => null);
    if (!run || !ACTIVE.has(run.status) || sendingRef.current || watching.current) return;
    activeRunId.current = runId;
    setStatusWord(COMPUTER.has(run.status) ? "Using Computer" : "Thinking...");
    sendingRef.current = true;
    setSending(true);
    watching.current = true;
    await watchUntilSettled();
    watching.current = false;
    sendingRef.current = false;
    setSending(false);
  }, [bot.id, token, watchUntilSettled]);

  useEffect(() => {
    void load();
    void catchUp();
    const id = setInterval(() => void catchUp(), 4000);
    return () => clearInterval(id);
  }, [load, catchUp]);

  async function send(textRaw: string, attachments: PendingAttachment[]) {
    const text = textRaw.trim();
    if (!text && attachments.length === 0) return;
    holdingHistory.current = false;
    const already = sendingRef.current;
    sendingRef.current = true;
    setSending(true);
    if (!already) setStatusWord("Thinking...");
    try {
      const refs = [];
      for (const att of attachments.slice(0, 10)) {
        const ref = await api.stageAttachment(token, bot.id, att.id, att.name, att.mime, att.uri);
        refs.push({ clientId: ref.clientId, stagingId: ref.stagingId });
      }
      const sent = await api.sendMessage(token, bot.id, text, refs.length ? refs : undefined);
      setMessages((prev) => (prev.some((m) => m.id === sent.message.id) ? prev : [...prev, sent.message]));
      activeRunId.current = sent.run?.id ?? sent.message.runId ?? activeRunId.current;
      setError(null);
      if (already) return;
      watching.current = true;
      await watchUntilSettled();
    } catch (e: any) {
      setError(e.message ?? String(e));
      if (!draft) setDraft(textRaw);
    }
    if (!already) {
      watching.current = false;
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function decide(message: ChatMessage, decision: string) {
    const approvalId = message.parts?.approvalId;
    if (!approvalId) return;
    setDeciding(approvalId);
    try {
      await api.decideApproval(token, approvalId, decision);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const next = await api.messages(token, bot.id);
        setMessages(next);
        if (next.some((m) => m.role === "assistant" && m.seq > message.seq && (m.status === "complete" || m.status === "error"))) {
          break;
        }
      }
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setDeciding(null);
    }
  }

  function bubbleRadius(mine: boolean) {
    return {
      borderTopLeftRadius: mine ? 16 : 0,
      borderTopRightRadius: mine ? 0 : 16,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    };
  }

  function renderMessage(message: ChatMessage) {
    switch (message.kind) {
      case "memory_event":
        return null;
      case "routine_event":
        return (
          <Text key={message.id} style={styles.centerChip}>
            {message.contentText}
          </Text>
        );
      case "bot_outbound":
      case "bot_inbound": {
        const name = message.source?.peerBotName ?? "elf";
        const seed = message.source?.peerAvatarSeed ?? avatarSeeds[message.source?.peerBotId ?? ""] ?? message.source?.peerBotId;
        const title =
          message.kind === "bot_outbound" ? `Messaged ${name}` : `Message from ${name}`;
        return (
          <Pressable
            key={message.id}
            onPress={() => message.source?.chainId && setOpenChainId(message.source.chainId)}
            style={styles.handoff}
          >
            <AvatarView name={name} seed={seed} size={22} />
            <Text style={{ color: Theme.secondaryText }}>{title}</Text>
          </Pressable>
        );
      }
      case "approval": {
        const status = message.parts?.approvalStatus ?? "pending";
        const pending = status === "pending";
        const title = message.parts?.summary || message.contentText;
        return (
          <View key={message.id} style={[styles.card, bubbleRadius(false), { maxWidth: Theme.bubbleMaxWidth }]}>
            <Text style={{ color: Theme.primaryText, fontWeight: "600", fontSize }}>{title}</Text>
            {pending && message.parts?.snippet ? (
              <Text style={{ color: Theme.secondaryText, fontSize }}>{message.parts.snippet}</Text>
            ) : null}
            {pending ? (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <Pressable
                  disabled={decidingApprovalId === message.parts?.approvalId}
                  onPress={() => void decide(message, "reject")}
                  style={styles.reject}
                >
                  <Text style={{ color: Theme.primaryText, textAlign: "center" }}>Reject</Text>
                </Pressable>
                <Pressable
                  disabled={decidingApprovalId === message.parts?.approvalId}
                  onPress={() => void decide(message, "approve")}
                  style={styles.approve}
                >
                  <Text style={{ color: "#fff", textAlign: "center" }}>Approve</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      }
      case "takeover_request": {
        const waiting = message.contentText === "Please take control";
        return (
          <Pressable
            key={message.id}
            onPress={() => waiting && setShowComputer(true)}
            style={[styles.card, bubbleRadius(false)]}
          >
            <Text style={{ color: waiting ? Theme.accent : Theme.primaryText, fontWeight: "600", fontSize }}>
              {message.contentText}
            </Text>
          </Pressable>
        );
      }
      default:
        if (message.role === "system") return null;
        if (message.role === "assistant" && message.status === "streaming") return null;
        const mine = message.role === "user";
        return (
          <View key={message.id} style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
            <View
              style={[
                styles.card,
                bubbleRadius(mine),
                { backgroundColor: mine ? Theme.accent : Theme.card, maxWidth: Theme.bubbleMaxWidth },
              ]}
            >
              {(message.parts?.attachments ?? []).map((item) => (
                <Text key={item.clientId} style={{ color: "#fff", fontSize: fontSize - 1 }}>
                  {item.name}
                </Text>
              ))}
              {mine ? (
                message.contentText ? (
                  <Text style={{ color: "#fff", fontSize }}>{message.contentText}</Text>
                ) : null
              ) : (
                <MarkdownText markdown={message.contentText || " "} fontSize={fontSize} />
              )}
            </View>
          </View>
        );
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: shell.safeTop + 110,
          paddingBottom: 88 + shell.safeBottom,
          gap: 12,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#fff"
            onRefresh={async () => {
              setRefreshing(true);
              holdingHistory.current = false;
              await load();
              setRefreshing(false);
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => {
          setChooserVisible(false);
          Keyboard.dismiss();
        }}
      >
        {errorText ? <Text style={{ color: Theme.failure, fontSize: 12 }}>{errorText}</Text> : null}
        {messages.map(renderMessage)}
        {sending ? (
          <View style={[styles.card, bubbleRadius(false)]}>
            <Text style={{ color: Theme.primaryText, fontSize }}>{statusWord}</Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.top, { paddingTop: shell.safeTop + Theme.chromeGap }]} pointerEvents="box-none">
        <View style={styles.header}>
          <CircleChipButton
            icon="menu"
            label="All chats"
            onPress={() => {
              setChooserVisible(false);
              Keyboard.dismiss();
              shell.revealList();
            }}
          />
          <Pressable onPress={() => setShowDetail(true)} style={styles.pill}>
            <AvatarView name={bot.name} seed={bot.avatarSeed} size={34} />
            <Text style={styles.botName} numberOfLines={1}>
              {bot.name}
            </Text>
          </Pressable>
          <CircleChipButton icon="desktop-outline" label="Shared computer" onPress={() => setShowComputer(true)} />
        </View>
      </View>
      <View style={{ paddingBottom: shell.safeBottom }}>
        <ChatComposerBar
          draft={draft}
          setDraft={setDraft}
          botName={bot.name}
          chooserVisible={chooserVisible}
          setChooserVisible={setChooserVisible}
          onSend={(text, atts) => void send(text, atts)}
          isWorking={sending}
          onStop={() => {
            if (activeRunId.current) void api.cancelRun(token, activeRunId.current);
            sendingRef.current = false;
            setSending(false);
          }}
          fontSize={fontSize}
        />
      </View>
      <BotDetailView
        visible={showDetail}
        bot={bot}
        token={token}
        onClose={() => setShowDetail(false)}
        onBotUpdated={onBotUpdated}
      />
      <ComputerView visible={showComputer} token={token} onClose={() => setShowComputer(false)} />
      <ElfThreadView
        visible={!!openChainId}
        token={token}
        chainId={openChainId}
        onClose={() => setOpenChainId(null)}
      />
      {searchDocument ? (
        <Pressable style={styles.docOverlay} onPress={() => setSearchDocument(null)}>
          <View style={styles.docCard}>
            <Text style={{ color: Theme.primaryText, fontWeight: "600", marginBottom: 8 }}>{searchDocument.title}</Text>
            <MarkdownText markdown={searchDocument.bodyMd} fontSize={fontSize} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.background },
  top: { position: "absolute", left: 0, right: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: Theme.chip,
    gap: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    height: Theme.chip,
    paddingLeft: 5,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    gap: 8,
    flexShrink: 1,
  },
  botName: { color: Theme.primaryText, fontSize: 17, fontWeight: "600", maxWidth: 160 },
  card: { backgroundColor: Theme.card, paddingHorizontal: 12, paddingVertical: 10 },
  centerChip: { color: Theme.secondaryText, textAlign: "center", paddingVertical: 4 },
  handoff: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 4 },
  reject: { flex: 1, borderWidth: 1, borderColor: Theme.secondaryText, borderRadius: 8, padding: 8 },
  approve: { flex: 1, backgroundColor: Theme.accent, borderRadius: 8, padding: 8 },
  docOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16,
  },
  docCard: { backgroundColor: Theme.background, borderRadius: 16, padding: 16, maxHeight: "80%" },
});
