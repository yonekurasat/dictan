import type { VideoHistoryItem } from "./types";

export const HISTORY_STORAGE_KEY = "dictan:history:v1";
export const MAX_HISTORY_ITEMS = 50;

export type VideoHistoryInput = Omit<VideoHistoryItem, "lastUsedAt">;

export function loadVideoHistory(): VideoHistoryItem[] {
  const raw = localStorage.getItem(HISTORY_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return normalizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveVideoHistory(items: VideoHistoryItem[]): void {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalizeHistory(items)));
}

export function deleteVideoHistoryItem(videoId: string): VideoHistoryItem[] {
  const nextItems = loadVideoHistory().filter((item) => item.videoId !== videoId);

  saveVideoHistory(nextItems);
  return nextItems;
}

export function upsertVideoHistoryItem(input: VideoHistoryInput, usedAt = new Date().toISOString()): VideoHistoryItem[] {
  const nextItem: VideoHistoryItem = {
    videoId: input.videoId,
    sourceUrl: input.sourceUrl,
    title: input.title.trim() || fallbackHistoryTitle(input.videoId),
    lastUsedAt: usedAt,
  };
  const nextItems = [
    nextItem,
    ...loadVideoHistory().filter((item) => item.videoId !== nextItem.videoId),
  ].slice(0, MAX_HISTORY_ITEMS);

  saveVideoHistory(nextItems);
  return nextItems;
}

function normalizeHistory(value: unknown): VideoHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeHistoryItem)
    .filter((item): item is VideoHistoryItem => item != null)
    .sort((left, right) => Date.parse(right.lastUsedAt) - Date.parse(left.lastUsedAt))
    .slice(0, MAX_HISTORY_ITEMS);
}

function normalizeHistoryItem(value: unknown): VideoHistoryItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<VideoHistoryItem>;

  if (
    typeof item.videoId !== "string" ||
    typeof item.sourceUrl !== "string" ||
    typeof item.lastUsedAt !== "string" ||
    Number.isNaN(Date.parse(item.lastUsedAt))
  ) {
    return null;
  }

  return {
    videoId: item.videoId,
    sourceUrl: item.sourceUrl,
    title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : fallbackHistoryTitle(item.videoId),
    lastUsedAt: item.lastUsedAt,
  };
}

function fallbackHistoryTitle(videoId: string): string {
  return `YouTube動画 (${videoId})`;
}
