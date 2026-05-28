const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();

  if (!value) {
    return null;
  }

  if (VIDEO_ID_PATTERN.test(value)) {
    return value;
  }

  const url = parseLooseUrl(value);

  if (!url) {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    return validVideoId(url.pathname.split("/").filter(Boolean)[0]);
  }

  if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) {
    return null;
  }

  const watchId = url.searchParams.get("v");

  if (watchId) {
    return validVideoId(watchId);
  }

  const [firstSegment, secondSegment] = url.pathname.split("/").filter(Boolean);

  if (["embed", "shorts", "live"].includes(firstSegment)) {
    return validVideoId(secondSegment);
  }

  return null;
}

export function formatTime(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds < 0) {
    return "--:--";
  }

  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${padTime(minutes)}:${padTime(seconds)}`;
  }

  return `${minutes}:${padTime(seconds)}`;
}

export function isValidLoopRange(a: number | null, b: number | null): a is number {
  return a != null && b != null && b > a + 0.2;
}

function parseLooseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function validVideoId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return VIDEO_ID_PATTERN.test(value) ? value : null;
}

function padTime(value: number): string {
  return value.toString().padStart(2, "0");
}
