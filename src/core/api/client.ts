import { AppConfig } from "../config/AppConfig";
import {
  AttachmentRef,
  BotSummary,
  ChatMessage,
  ComputerSession,
  ComputerStatus,
  DocumentFull,
  DocumentSummary,
  ElfThread,
  FileItem,
  InstructionsDoc,
  LinkItem,
  normalizeBot,
  normalizeMessage,
  Routine,
  RoutineRun,
  RunStub,
  SearchResponse,
  SendMessageResponse,
  StagedAttachment,
  UsageQueue,
  UsageSummary,
} from "./models";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function urlFor(path: string, query: Record<string, string> = {}): string {
  const u = new URL(path.replace(/^\//, ""), AppConfig.apiBaseURL + "/");
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

async function throwIfNeeded(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.text();
  throw new ApiError(`API ${res.status}: ${body}`);
}

async function getJson<T>(path: string, token: string, query: Record<string, string> = {}): Promise<T> {
  const res = await fetch(urlFor(path, query), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  await throwIfNeeded(res);
  return (await res.json()) as T;
}

async function sendJson<T>(path: string, token: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(urlFor(path), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": uuid(),
    },
    body: JSON.stringify(body),
  });
  await throwIfNeeded(res);
  return (await res.json()) as T;
}

export const api = {
  async bots(token: string): Promise<BotSummary[]> {
    const page = await getJson<{ items: any[] }>("/v1/bots", token);
    return (page.items ?? []).map(normalizeBot);
  },

  async patchBot(
    token: string,
    botId: string,
    body: { name?: string; title?: string; avatarSeed?: string; version: number },
  ): Promise<BotSummary> {
    return normalizeBot(await sendJson(`/v1/bots/${botId}`, token, "PATCH", body));
  },

  async createBot(token: string, name: string, title: string, avatarSeed?: string): Promise<BotSummary> {
    const body: Record<string, string> = { name, title };
    if (avatarSeed) body.avatarSeed = avatarSeed;
    return normalizeBot(await sendJson("/v1/bots", token, "POST", body));
  },

  async messages(token: string, botId: string, around?: string): Promise<ChatMessage[]> {
    const query: Record<string, string> = { limit: "80" };
    if (around) query.around = around;
    const page = await getJson<{ items: any[] }>(`/v1/bots/${botId}/messages`, token, query);
    return (page.items ?? []).map(normalizeMessage);
  },

  async sendMessage(
    token: string,
    botId: string,
    text: string,
    attachments?: AttachmentRef[],
  ): Promise<SendMessageResponse> {
    const raw = await sendJson<any>(`/v1/bots/${botId}/messages`, token, "POST", {
      text,
      attachments,
    });
    return {
      message: normalizeMessage(raw.message),
      run: raw.run ?? null,
    };
  },

  async cancelRun(token: string, runId: string): Promise<void> {
    await sendJson(`/v1/runs/${runId}/cancel`, token, "POST", {});
  },

  async runStatus(token: string, runId: string): Promise<RunStub> {
    return getJson("/v1/runs/" + runId, token);
  },

  async handoverComputer(token: string): Promise<void> {
    await sendJson("/v1/computer/handover", token, "POST", {});
  },

  async links(token: string, botId: string): Promise<LinkItem[]> {
    const page = await getJson<{ items: LinkItem[] }>(`/v1/bots/${botId}/links`, token);
    return page.items ?? [];
  },

  async files(token: string, botId: string): Promise<FileItem[]> {
    const page = await getJson<{ items: FileItem[] }>(`/v1/bots/${botId}/files`, token);
    return page.items ?? [];
  },

  async document(token: string, id: string): Promise<DocumentFull> {
    return getJson(`/v1/documents/${id}`, token);
  },

  async downloadFile(token: string, fileId: string, name: string): Promise<string> {
    const res = await fetch(urlFor(`/v1/files/${fileId}/content`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    await throwIfNeeded(res);
    const FileSystem = await import("expo-file-system/legacy");
    const safe = (name || fileId).replace(/[/:]/g, "-");
    const dest = `${FileSystem.cacheDirectory}elvie-files/${safe}`;
    await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}elvie-files`, { intermediates: true });
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    await FileSystem.writeAsStringAsync(dest, btoa(binary), { encoding: FileSystem.EncodingType.Base64 });
    return dest;
  },

  async stageAttachment(
    token: string,
    botId: string,
    clientId: string,
    name: string,
    mime: string,
    uri: string,
  ): Promise<StagedAttachment> {
    const form = new FormData();
    form.append("clientId", clientId);
    form.append("file", { uri, name, type: mime } as unknown as Blob);
    const res = await fetch(urlFor(`/v1/bots/${botId}/attachments/staging`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: form,
    });
    await throwIfNeeded(res);
    return (await res.json()) as StagedAttachment;
  },

  async decideApproval(token: string, id: string, decision: string): Promise<void> {
    await sendJson(`/v1/approvals/${id}/decision`, token, "POST", { decision });
  },

  async thread(token: string, chainId: string): Promise<ElfThread> {
    return getJson(`/v1/threads/${chainId}`, token);
  },

  async search(token: string, q: string): Promise<SearchResponse> {
    return getJson("/v1/search", token, { q, scope: "all" });
  },

  async computerStatus(token: string): Promise<ComputerStatus> {
    const raw = await getJson<ComputerStatus>("/v1/computer/status", token);
    return {
      ...raw,
      waiters: raw.waiters ?? [],
      humanActive: Boolean(raw.humanActive),
    };
  },

  async computerSession(token: string): Promise<ComputerSession | null> {
    try {
      return await sendJson("/v1/computer/session", token, "POST", {});
    } catch {
      // Per-user sandboxes on the gowtham branch do not publish VNC.
      return null;
    }
  },

  avatarUri(token: string, botId: string, size = 128): { uri: string; headers: Record<string, string> } {
    return {
      uri: urlFor(`/v1/avatars/${botId}.png`, { size: String(size) }),
      headers: { Authorization: `Bearer ${token}` },
    };
  },

  screenshotUri(token: string): { uri: string; headers: Record<string, string> } {
    return {
      uri: urlFor("/v1/computer/screenshot", { t: String(Date.now()) }),
      headers: { Authorization: `Bearer ${token}`, Accept: "image/jpeg" },
    };
  },

  async instructions(token: string, botId: string): Promise<InstructionsDoc> {
    return getJson(`/v1/bots/${botId}/instructions`, token);
  },

  async routines(token: string, botId: string): Promise<Routine[]> {
    const page = await getJson<{ items: Routine[] }>(`/v1/bots/${botId}/routines`, token);
    return page.items ?? [];
  },

  async routine(token: string, id: string): Promise<Routine> {
    return getJson(`/v1/routines/${id}`, token);
  },

  async toggleRoutine(token: string, id: string, active: boolean): Promise<Routine> {
    return sendJson(`/v1/routines/${id}`, token, "PATCH", { active });
  },

  async routineRuns(token: string, routineId: string, limit = 40): Promise<RoutineRun[]> {
    const page = await getJson<{ items: RoutineRun[] }>(`/v1/routines/${routineId}/runs`, token, {
      limit: String(limit),
    });
    return page.items ?? [];
  },

  async putInstructions(token: string, botId: string, text: string, version: number): Promise<InstructionsDoc> {
    return sendJson(`/v1/bots/${botId}/instructions`, token, "PUT", { text, version });
  },

  async documents(token: string, botId: string): Promise<DocumentSummary[]> {
    const page = await getJson<{ items: DocumentSummary[] }>(`/v1/bots/${botId}/documents`, token);
    return page.items ?? [];
  },

  async computerAction(
    token: string,
    action: string,
    extra: {
      x?: number;
      y?: number;
      x2?: number;
      y2?: number;
      text?: string;
      key?: string;
      dy?: number;
    } = {},
  ): Promise<void> {
    await sendJson("/v1/computer/action", token, "POST", { action, ...extra });
  },

  async computerClick(token: string, x: number, y: number): Promise<void> {
    await this.computerAction(token, "click", { x, y });
  },

  async media(token: string, botId: string): Promise<FileItem[]> {
    const page = await getJson<{ items: FileItem[] }>(`/v1/bots/${botId}/media`, token);
    return page.items ?? [];
  },

  async usageSummary(token: string, range = "7d"): Promise<UsageSummary> {
    return getJson("/v1/usage/summary", token, { range });
  },

  async usageQueue(token: string): Promise<UsageQueue> {
    return getJson("/v1/usage/queue", token);
  },

  async takeoverHeartbeat(token: string): Promise<void> {
    await sendJson("/v1/computer/takeover-heartbeat", token, "POST", {});
  },

  async registerTimezone(token: string): Promise<void> {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson("/v1/me", token, "PUT", { timezone });
    } catch {
      /* timezone is best-effort, matching iOS */
    }
  },
};
