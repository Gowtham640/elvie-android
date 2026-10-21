import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { api } from "../../core/api/client";
import { BotSummary, SearchResponse } from "../../core/api/models";
import { useSession } from "../../core/auth/SessionStore";
import { AvatarView, CircleChipButton, ProfilePhoto } from "../../core/design/components";
import { HighlightedSnippet } from "../../core/design/MarkdownText";
import { Theme } from "../../core/design/theme";
import { L10n } from "../../core/l10n";
import { CreateBotSheet } from "../Bots/CreateBotSheet";
import { ChatView } from "../Chat/ChatView";
import { SettingsView } from "../Settings/SettingsView";
import { WelcomeCardView } from "./WelcomeCardView";
import { Layer, ShellController } from "./shellState";

const spring = { damping: 18, stiffness: 180 };

export function SlideStackShell() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [layer, setLayer] = useState<Layer>("center");
  const [activeBot, setActiveBot] = useState<BotSummary | null>(null);
  const [focusMessageId, setFocusMessage] = useState<string | null>(null);
  const [focusDocumentId, setFocusDocument] = useState<string | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const peekOffset = width * 0.82;
  const awayOffset = width + 60;
  const cardOffset = searchActive ? awayOffset : layer === "center" ? 0 : layer === "peek" ? peekOffset : awayOffset;
  const visual = useSharedValue(0);

  useEffect(() => {
    visual.value = withSpring(cardOffset, spring);
  }, [cardOffset, visual]);

  const token = session.cachedToken ?? "";

  const reload = useCallback(async () => {
    if (!session.isSignedIn) return;
    const access = (await session.accessToken()) ?? token;
    if (!access) return;
    try {
      setBots(await api.bots(access));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e.message ?? String(e));
    }
  }, [session, token]);

  useEffect(() => {
    void reload();
  }, [reload, session.cachedToken]);

  const shell: ShellController = useMemo(
    () => ({
      layer,
      activeBot,
      focusMessageId,
      focusDocumentId,
      searchActive,
      screenWidth: width,
      screenHeight: height,
      safeTop: insets.top,
      safeBottom: insets.bottom,
      peekOffset,
      awayOffset,
      cardOffset,
      revealList: () => {
        setSearchActive(false);
        setLayer((l) => (l === "peek" ? "center" : "peek"));
      },
      setLayer: (l) => {
        setLayer(l);
        if (l === "center") setSearchActive(false);
      },
      closeSearch: () => setSearchActive(false),
      setFocusMessage,
      setFocusDocument,
    }),
    [layer, activeBot, focusMessageId, focusDocumentId, searchActive, width, height, insets, peekOffset, awayOffset, cardOffset],
  );

  function openBot(bot: BotSummary) {
    setFocusMessage(null);
    setFocusDocument(null);
    setActiveBot(bot);
    setSearchActive(false);
    setLayer("center");
  }

  const recent = [...bots]
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""))
    .slice(0, 3);

  const slideProgress = Math.min(1, Math.max(0, cardOffset / Math.max(peekOffset, 1)));
  const cardScaleY = 1 - (60 / Math.max(height, 1)) * slideProgress;
  const animatedCard = useAnimatedStyle(() => ({
    transform: [{ translateX: visual.value }, { scaleY: cardScaleY }],
  }));

  return (
    <View style={styles.root}>
      <ListLayer
        bots={bots}
        loadError={loadError}
        activeBot={activeBot}
        searchActive={searchActive}
        onSelect={openBot}
        onSearchDismiss={() => setSearchActive(false)}
        onNewBot={() => setShowCreate(true)}
        onProfile={() => setShowSettings(true)}
        onSearchOpen={() => setSearchActive(true)}
        onOpenBotId={(id) => {
          const b = bots.find((x) => x.id === id);
          if (b) openBot(b);
        }}
        onOpenMessage={(botId, messageId) => {
          const b = bots.find((x) => x.id === botId);
          if (!b) return;
          setFocusDocument(null);
          setFocusMessage(messageId);
          setActiveBot(b);
          setSearchActive(false);
          setLayer("center");
        }}
        onOpenDocument={(botId, documentId) => {
          const b = bots.find((x) => x.id === botId);
          if (!b) return;
          setFocusMessage(null);
          setFocusDocument(documentId);
          setActiveBot(b);
          setSearchActive(false);
          setLayer("center");
        }}
        sessionEmail={session.email ?? "Signed in with Google"}
        sessionName={session.fullName}
        sessionPicture={session.pictureURL}
        token={token}
        reload={reload}
        safeTop={insets.top}
        safeBottom={insets.bottom}
        trailingInset={searchActive ? Theme.spaceL : width - peekOffset + 10}
      />
      <Animated.View
        style={[
          styles.card,
          { width, borderRadius: 40 * slideProgress },
          animatedCard,
          {
            shadowOpacity: 0.55 * slideProgress,
            borderWidth: slideProgress > 0.05 ? 1 : 0,
            borderColor: `rgba(255,255,255,${0.1 * slideProgress})`,
          },
        ]}
      >
        {activeBot ? (
          <ChatView
            key={activeBot.id}
            bot={activeBot}
            token={token}
            shell={shell}
            onTurnFinished={() => void reload()}
            onBotUpdated={(updated) => {
              setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
              setActiveBot((cur) => (cur?.id === updated.id ? updated : cur));
            }}
          />
        ) : (
          <WelcomeCardView
            recent={recent}
            token={token}
            onSelect={openBot}
            onMenu={() => shell.revealList()}
            onCreate={() => setShowCreate(true)}
            safeTop={insets.top}
            safeBottom={insets.bottom}
          />
        )}
        {slideProgress > 0.5 ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => (searchActive ? setSearchActive(false) : setLayer("center"))}
          />
        ) : null}
      </Animated.View>
      <CreateBotSheet
        visible={showCreate}
        token={token}
        onClose={() => setShowCreate(false)}
        onCreated={(bot) => {
          setBots((prev) => [bot, ...prev]);
          openBot(bot);
        }}
      />
      <SettingsView visible={showSettings} onClose={() => setShowSettings(false)} />
    </View>
  );
}

function ListLayer(props: {
  bots: BotSummary[];
  loadError: string | null;
  activeBot: BotSummary | null;
  searchActive: boolean;
  onSelect: (bot: BotSummary) => void;
  onSearchDismiss: () => void;
  onNewBot: () => void;
  onProfile: () => void;
  onSearchOpen: () => void;
  onOpenBotId: (id: string) => void;
  onOpenMessage: (botId: string, messageId: string) => void;
  onOpenDocument: (botId: string, documentId: string) => void;
  sessionEmail: string;
  sessionName?: string | null;
  sessionPicture?: string | null;
  token: string;
  reload: () => Promise<void>;
  safeTop: number;
  safeBottom: number;
  trailingInset: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const displayName =
    props.sessionName && props.sessionName.length > 0
      ? props.sessionName
      : props.sessionEmail.split("@")[0] || "Account";

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      setResults(await api.search(props.token, trimmed));
    } catch {
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!props.searchActive) {
      setQuery("");
      setResults(null);
    }
  }, [props.searchActive]);

  return (
    <View style={styles.list}>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          paddingLeft: 16,
          paddingRight: props.trailingInset,
          paddingTop: props.safeTop + Theme.chromeGap,
          paddingBottom: 8,
          alignItems: "center",
        }}
      >
        {props.searchActive ? (
          <CircleChipButton icon="chevron-back" label="Back" onPress={props.onSearchDismiss} />
        ) : null}
        {props.searchActive ? (
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              void runSearch(t);
            }}
            placeholder="Search chat content..."
            placeholderTextColor={Theme.secondaryText}
            autoFocus
            style={styles.searchField}
            onSubmitEditing={() => void runSearch(query)}
          />
        ) : (
          <Pressable onPress={props.onSearchOpen} style={styles.searchBar}>
            <Text style={{ color: Theme.secondaryText }}>Search</Text>
          </Pressable>
        )}
        {!props.searchActive ? <CircleChipButton icon="add" label="New bot" onPress={props.onNewBot} /> : null}
      </View>
      {props.searchActive ? (
        searching ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
        ) : results ? (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: props.safeBottom + 24 }}>
            {results.bots.length + results.messages.length + results.documents.length === 0 ? (
              <Text style={{ color: Theme.secondaryText }}>No matches</Text>
            ) : null}
            {results.bots.map((b) => (
              <Pressable key={b.id} onPress={() => props.onOpenBotId(b.id)} style={styles.hit}>
                <Text style={{ color: Theme.primaryText }}>{b.name}</Text>
              </Pressable>
            ))}
            {results.messages.map((hit) => (
              <Pressable key={hit.id} onPress={() => props.onOpenMessage(hit.botId, hit.id)} style={styles.hit}>
                <Text style={{ color: Theme.secondaryText, fontSize: 12 }}>{hit.botName}</Text>
                <HighlightedSnippet raw={hit.snippet} />
              </Pressable>
            ))}
            {results.documents.map((hit) => (
              <Pressable key={hit.id} onPress={() => props.onOpenDocument(hit.botId, hit.id)} style={styles.hit}>
                <Text style={{ color: Theme.secondaryText, fontSize: 12 }}>{hit.botName}</Text>
                <Text style={{ color: Theme.primaryText, fontWeight: "600" }}>{hit.title}</Text>
                <HighlightedSnippet raw={hit.snippet} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={{ color: Theme.secondaryText, padding: 16 }}>Search your bots, messages and documents.</Text>
        )
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#fff"
              onRefresh={async () => {
                setRefreshing(true);
                await props.reload();
                setRefreshing(false);
              }}
            />
          }
          contentContainerStyle={{ paddingBottom: props.safeBottom + 90 }}
        >
          {props.loadError ? <Text style={{ color: Theme.failure, padding: 16 }}>{props.loadError}</Text> : null}
          {props.bots.length === 0 && !props.loadError ? (
            <Text style={{ color: Theme.secondaryText, padding: 16 }}>
              No {L10n.bots} yet. Tap + to create one.
            </Text>
          ) : null}
          {props.bots.map((bot) => {
            const active = bot.id === props.activeBot?.id;
            return (
              <Pressable key={bot.id} onPress={() => props.onSelect(bot)} style={[styles.botRow, active && styles.botActive]}>
                <AvatarView name={bot.name} seed={bot.avatarSeed} size={60} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Theme.primaryText, fontWeight: "600" }} numberOfLines={1}>
                    {bot.name}
                  </Text>
                  {bot.lastMessagePreview?.text ? (
                    <Text style={{ color: Theme.secondaryText }} numberOfLines={1}>
                      {bot.lastMessagePreview.text}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {!props.searchActive ? (
        <Pressable onPress={props.onProfile} style={[styles.profile, { bottom: props.safeBottom + 8 }]}>
          <ProfilePhoto uri={props.sessionPicture} name={displayName} size={36} />
          <View>
            <Text style={{ color: Theme.primaryText, fontWeight: "600" }}>{displayName}</Text>
            <Text style={{ color: Theme.secondaryText, fontSize: 11 }}>{props.sessionEmail}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.background },
  list: { ...StyleSheet.absoluteFill, backgroundColor: Theme.background },
  card: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Theme.background,
    overflow: "hidden",
    shadowColor: "#000",
    shadowRadius: 24,
    shadowOffset: { width: -8, height: 0 },
    elevation: 12,
  },
  searchBar: {
    flex: 1,
    height: Theme.chip,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  searchField: {
    flex: 1,
    height: Theme.chip,
    borderRadius: 999,
    backgroundColor: Theme.cardElevated,
    color: Theme.primaryText,
    paddingHorizontal: 16,
  },
  botRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 18,
  },
  botActive: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  profile: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: 999,
  },
  hit: { paddingVertical: 12 },
});
