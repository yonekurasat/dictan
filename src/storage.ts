import type { LoopRange, PracticeDraft } from "./types";

const STORAGE_PREFIX = "dictan:v1:";

export const defaultLoopRange: LoopRange = {
  a: null,
  b: null,
  enabled: false,
};

export function createDraft(videoId: string, sourceUrl: string): PracticeDraft {
  return {
    videoId,
    sourceUrl,
    dictation: "",
    answer: "",
    loopRange: { ...defaultLoopRange },
    playbackRate: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function loadDraft(videoId: string): PracticeDraft | null {
  const raw = localStorage.getItem(storageKey(videoId));

  if (!raw) {
    return null;
  }

  try {
    return normalizeDraft(JSON.parse(raw), videoId);
  } catch {
    return null;
  }
}

export function saveDraft(draft: PracticeDraft): void {
  localStorage.setItem(
    storageKey(draft.videoId),
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function storageKey(videoId: string): string {
  return `${STORAGE_PREFIX}${videoId}`;
}

function normalizeDraft(value: unknown, videoId: string): PracticeDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const draft = value as Partial<PracticeDraft>;

  if (draft.videoId !== videoId) {
    return null;
  }

  return {
    videoId,
    sourceUrl: typeof draft.sourceUrl === "string" ? draft.sourceUrl : "",
    dictation: typeof draft.dictation === "string" ? draft.dictation : "",
    answer: typeof draft.answer === "string" ? draft.answer : "",
    loopRange: normalizeLoopRange(draft.loopRange),
    playbackRate: normalizePlaybackRate(draft.playbackRate),
    updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : new Date().toISOString(),
  };
}

function normalizeLoopRange(value: unknown): LoopRange {
  if (!value || typeof value !== "object") {
    return { ...defaultLoopRange };
  }

  const loopRange = value as Partial<LoopRange>;
  const a = typeof loopRange.a === "number" && Number.isFinite(loopRange.a) ? loopRange.a : null;
  const b = typeof loopRange.b === "number" && Number.isFinite(loopRange.b) ? loopRange.b : null;

  return {
    a,
    b,
    enabled: Boolean(loopRange.enabled),
  };
}

function normalizePlaybackRate(value: unknown): number {
  return typeof value === "number" && [0.5, 0.75, 1, 1.25, 1.5].includes(value) ? value : 1;
}
