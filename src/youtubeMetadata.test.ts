import { afterEach, describe, expect, it, vi } from "vitest";
import { fallbackVideoTitle, fetchYouTubeVideoTitle } from "./youtubeMetadata";

describe("fetchYouTubeVideoTitle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a title through YouTube oEmbed", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ title: "Official title" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchYouTubeVideoTitle("dQw4w9WgXcQ")).resolves.toBe("Official title");
    expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ hostname: "www.youtube.com" }));
  });

  it("returns a fallback title when oEmbed fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));

    await expect(fetchYouTubeVideoTitle("dQw4w9WgXcQ")).resolves.toBe(fallbackVideoTitle("dQw4w9WgXcQ"));
  });
});
