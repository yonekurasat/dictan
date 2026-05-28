import { describe, expect, it } from "vitest";
import { extractYouTubeVideoId, formatTime, isValidLoopRange } from "./youtubeUrl";

describe("extractYouTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=12", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("extracts %s", (input, expected) => {
    expect(extractYouTubeVideoId(input)).toBe(expected);
  });

  it("rejects malformed and non-YouTube values", () => {
    expect(extractYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeVideoId("not-a-video!")).toBeNull();
  });
});

describe("formatTime", () => {
  it("formats second counts for controls", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(75.9)).toBe("1:15");
    expect(formatTime(3671)).toBe("1:01:11");
    expect(formatTime(null)).toBe("--:--");
  });
});

describe("isValidLoopRange", () => {
  it("requires B to be after A", () => {
    expect(isValidLoopRange(10, 12)).toBe(true);
    expect(isValidLoopRange(10, 10.1)).toBe(false);
    expect(isValidLoopRange(null, 12)).toBe(false);
  });
});
