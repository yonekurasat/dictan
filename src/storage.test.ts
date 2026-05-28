import { beforeEach, describe, expect, it } from "vitest";
import { createDraft, loadDraft, saveDraft, storageKey } from "./storage";

describe("draft storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates and saves a video-specific draft", () => {
    const draft = createDraft("dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ");

    saveDraft({
      ...draft,
      dictation: "Never gonna give you up",
      answer: "Never gonna give you up",
      playbackRate: 0.75,
      loopRange: { a: 3, b: 9, enabled: true },
    });

    const saved = loadDraft("dQw4w9WgXcQ");

    expect(saved).toMatchObject({
      videoId: "dQw4w9WgXcQ",
      dictation: "Never gonna give you up",
      answer: "Never gonna give you up",
      playbackRate: 0.75,
      loopRange: { a: 3, b: 9, enabled: true },
    });
    expect(localStorage.getItem(storageKey("dQw4w9WgXcQ"))).toContain("Never gonna give you up");
  });

  it("ignores malformed storage entries", () => {
    localStorage.setItem(storageKey("dQw4w9WgXcQ"), "{bad json");

    expect(loadDraft("dQw4w9WgXcQ")).toBeNull();
  });

});
