export function fallbackVideoTitle(videoId: string): string {
  return `YouTube動画 (${videoId})`;
}

export async function fetchYouTubeVideoTitle(videoId: string): Promise<string> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      return fallbackVideoTitle(videoId);
    }

    const data = (await response.json()) as { title?: unknown };
    const title = typeof data.title === "string" ? data.title.trim() : "";

    return title || fallbackVideoTitle(videoId);
  } catch {
    return fallbackVideoTitle(videoId);
  }
}
