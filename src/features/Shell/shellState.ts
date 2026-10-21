import { BotSummary } from "../../core/api/models";

export type Layer = "center" | "peek" | "away";

export type ShellController = {
  layer: Layer;
  activeBot: BotSummary | null;
  focusMessageId: string | null;
  focusDocumentId: string | null;
  searchActive: boolean;
  screenWidth: number;
  screenHeight: number;
  safeTop: number;
  safeBottom: number;
  peekOffset: number;
  awayOffset: number;
  cardOffset: number;
  revealList: () => void;
  setLayer: (layer: Layer) => void;
  closeSearch: () => void;
  setFocusMessage: (id: string | null) => void;
  setFocusDocument: (id: string | null) => void;
};
