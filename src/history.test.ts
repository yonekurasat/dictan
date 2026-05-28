import { beforeEach, describe, expect, it } from "vitest";
import {
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_ITEMS,
  deleteVideoHistoryItem,
  loadVideoHistory,
  upsertVideoHistoryItem,
} from "./history";

describe("video history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("upserts items, removes duplicates, and keeps recent items first", () => {
    upsertVideoHistoryItem(
      {
        videoId: "dQw4w9WgXcQ",
        sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
        title: "First title",
      },
      "2026-01-01T00:00:00.000Z",
    );
    upsertVideoHistoryItem(
      {
        videoId: "M7lc1UVf-VE",
        sourceUrl: "https://youtu.be/M7lc1UVf-VE",
        title: "Second title",
      },
      "2026-01-02T00:00:00.000Z",
    );
    const saved = upsertVideoHistoryItem(
      {
        videoId: "dQw4w9WgXcQ",
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "Updated first title",
      },
      "2026-01-03T00:00:00.000Z",
    );

    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({
      videoId: "dQw4w9WgXcQ",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Updated first title",
    });
    expect(saved[1].videoId).toBe("M7lc1UVf-VE");
  });

  it("limits history to the newest 50 entries", () => {
    for (let index = 0; index < MAX_HISTORY_ITEMS + 5; index += 1) {
      upsertVideoHistoryItem(
        {
          videoId: `videoid${String(index).padStart(4, "0")}`.slice(0, 11),
          sourceUrl: `https://youtu.be/video-${index}`,
          title: `Video ${index}`,
        },
        `2026-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
      );
    }

    const saved = loadVideoHistory();

    expect(saved).toHaveLength(MAX_HISTORY_ITEMS);
    expect(saved[0].title).toBe("Video 54");
    expect(saved.at(-1)?.title).toBe("Video 5");
  });

  it("deletes a history item by video ID", () => {
    upsertVideoHistoryItem(
      {
        videoId: "dQw4w9WgXcQ",
        sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
        title: "First title",
      },
      "2026-01-01T00:00:00.000Z",
    );
    upsertVideoHistoryItem(
      {
        videoId: "M7lc1UVf-VE",
        sourceUrl: "https://youtu.be/M7lc1UVf-VE",
        title: "Second title",
      },
      "2026-01-02T00:00:00.000Z",
    );

    const saved = deleteVideoHistoryItem("dQw4w9WgXcQ");

    expect(saved).toHaveLength(1);
    expect(saved[0].videoId).toBe("M7lc1UVf-VE");
    expect(loadVideoHistory()).toEqual(saved);
  });

  it("ignores malformed history storage", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, "{bad json");

    expect(loadVideoHistory()).toEqual([]);
  });
});
