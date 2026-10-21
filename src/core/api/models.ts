export type MeProfile = {
  id: string;
  email: string;
  displayName?: string | null;
  timezone: string;
};

export type MessagePreview = {
  kind?: string | null;
  text?: string | null;
};

export type BotSummary = {
  id: string;
  name: string;
  title: string;
  avatarSeed?: string | null;
  avatarPalette?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: MessagePreview | null;
  hasActiveRun: boolean;
  version: number;
};

export type MessageAttachment = {
  clientId: string;
  name: string;
  mime: string;
  size?: number | null;
};

export type MessageParts = {
  attachments: MessageAttachment[];
  userText?: string | null;
  approvalId?: string | null;
  approvalKind?: string | null;
  summary?: string | null;
  approvalStatus?: string | null;
  to?: string | null;
  subject?: string | null;
  snippet?: string | null;
};

export type MessageSource = {
  chainId?: string | null;
  peerBotId?: string | null;
  peerBotName?: string | null;
  peerAvatarSeed?: string | null;
};

export type ChatMessage = {
  id: string;
  botId: string;
  seq: number;
  runId?: string | null;
  role: string;
  kind: string;
  contentText: string;
  status: string;
  createdAt: string;
  parts?: MessageParts | null;
  source?: MessageSource | null;
};

export type SendMessageResponse = {
  message: ChatMessage;
  run?: RunStub | null;
};

export type RunStub = {
  id: string;
  status: string;
};

export type SearchBotHit = { id: string; name: string; title: string };
export type SearchMessageHit = {
  id: string;
  botId: string;
  botName: string;
  snippet: string;
};
export type SearchDocumentHit = {
  id: string;
  botId: string;
  botName: string;
  title: string;
  snippet: string;
};
export type SearchResponse = {
  bots: SearchBotHit[];
  messages: SearchMessageHit[];
  documents: SearchDocumentHit[];
};

export type ComputerHolder = {
  botId: string;
  botName?: string | null;
  leaseId?: string | null;
  runId?: string | null;
};

export type ComputerWaiter = {
  botId: string;
  botName?: string | null;
  runId: string;
  priority: number;
  enqueuedAt: number;
};

export type ComputerStatus = {
  configured: boolean;
  desktopReady?: boolean | null;
  boxHealthy: boolean;
  humanActive: boolean;
  detail?: string | null;
  holder?: ComputerHolder | null;
  waiters?: ComputerWaiter[];
};

export type ComputerSession = {
  host: string;
  port: number;
  password: string;
  tls: boolean;
  expiresAt: string;
};

export type InstructionsDoc = {
  botId: string;
  text: string;
  version: number;
};

export type Routine = {
  id: string;
  botId: string;
  name: string;
  instruction: string;
  scheduleSummary?: string | null;
  timezone: string;
  active: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
};

export type RoutineRun = {
  id: string;
  runId?: string | null;
  status: string;
  silent: boolean;
  summary?: string | null;
  startedAt: string;
  finishedAt?: string | null;
};

export type DocumentSummary = { id: string; title: string };
export type DocumentFull = { id: string; title: string; bodyMd: string };
export type LinkItem = { id: string; url: string; domain: string; title: string };
export type FileItem = { id: string; name: string; mime: string; size: number };

export type UsageTotals = {
  promptTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  completionTokens: number;
  estimatedCostUsd?: number | null;
  heldSeconds: number;
  runs: number;
};

export type UsageDay = {
  day: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd?: number | null;
  heldSeconds: number;
  runs: number;
};

export type UsageSummary = {
  range: string;
  totals: UsageTotals;
  series: UsageDay[];
};

export type UsageQueue = {
  runs: { waiting: number; active: number; failed24h: number };
  lease: { holder?: { botName?: string | null; runId: string } | null; waiters: number };
};

export type ElfThreadPeer = {
  id: string;
  name: string;
  title: string;
  avatarSeed?: string | null;
};

export type ElfThreadExchange = {
  id: string;
  fromBotId: string;
  toBotId: string;
  fromBotName: string;
  toBotName: string;
  text: string;
};

export type ElfThread = {
  chainId: string;
  peers: ElfThreadPeer[];
  exchanges: ElfThreadExchange[];
};

export type StagedAttachment = {
  stagingId: string;
  clientId: string;
  name: string;
};

export type AttachmentRef = {
  clientId: string;
  stagingId: string;
};

export function normalizeBot(raw: any): BotSummary {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    title: String(raw.title ?? ""),
    avatarSeed: raw.avatarSeed ?? null,
    avatarPalette: raw.avatarPalette ?? null,
    lastMessageAt: raw.lastMessageAt ?? null,
    lastMessagePreview: raw.lastMessagePreview ?? null,
    hasActiveRun: Boolean(raw.hasActiveRun),
    version: Number(raw.version ?? 1),
  };
}

export function normalizeMessage(raw: any): ChatMessage {
  const payload = raw.parts?.payload ?? {};
  const parts = raw.parts
    ? {
        attachments: Array.isArray(raw.parts.attachments) ? raw.parts.attachments : [],
        userText: raw.parts.userText ?? null,
        approvalId: raw.parts.approvalId ?? null,
        approvalKind: raw.parts.kind ?? null,
        summary: raw.parts.summary ?? null,
        approvalStatus: raw.parts.status ?? null,
        to: payload.to ?? null,
        subject: payload.subject ?? null,
        snippet: payload.snippet ?? null,
      }
    : null;
  return {
    id: String(raw.id),
    botId: String(raw.botId),
    seq: Number(raw.seq ?? 0),
    runId: raw.runId ?? null,
    role: String(raw.role ?? ""),
    kind: String(raw.kind ?? ""),
    contentText: String(raw.contentText ?? ""),
    status: String(raw.status ?? "complete"),
    createdAt: String(raw.createdAt ?? ""),
    parts,
    source: raw.source ?? null,
  };
}

export function messagesEqual(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].status !== b[i].status || a[i].contentText !== b[i].contentText) {
      return false;
    }
  }
  return true;
}
