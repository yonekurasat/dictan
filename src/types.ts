export type LoopRange = {
  a: number | null;
  b: number | null;
  enabled: boolean;
};

export type PracticeDraft = {
  videoId: string;
  sourceUrl: string;
  dictation: string;
  answer: string;
  loopRange: LoopRange;
  playbackRate: number;
  updatedAt: string;
};

export type VideoHistoryItem = {
  videoId: string;
  sourceUrl: string;
  title: string;
  lastUsedAt: string;
};

export type PlayerStatus = "idle" | "loading" | "ready" | "error";
