type PlayerVars = {
  autoplay?: 0 | 1;
  controls?: 0 | 1;
  modestbranding?: 0 | 1;
  playsinline?: 0 | 1;
  rel?: 0 | 1;
};

type PlayerEvent = {
  target: YouTubePlayer;
  data?: number;
};

type PlayerOptions = {
  videoId: string;
  host?: string;
  playerVars?: PlayerVars;
  events?: {
    onReady?: (event: PlayerEvent) => void;
    onError?: (event: PlayerEvent) => void;
    onStateChange?: (event: PlayerEvent) => void;
  };
};

export type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  destroy: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  getPlaybackRate: () => number;
};

type YouTubeNamespace = {
  Player: new (element: HTMLElement | string, options: PlayerOptions) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let iframeApiPromise: Promise<YouTubeNamespace> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (iframeApiPromise) {
    return iframeApiPromise;
  }

  iframeApiPromise = new Promise((resolve, reject) => {
    const existingCallback = window.onYouTubeIframeAPIReady;
    let timeoutId: number;
    const fail = (error: Error) => {
      window.clearTimeout(timeoutId);
      iframeApiPromise = null;
      reject(error);
    };
    timeoutId = window.setTimeout(() => {
      fail(new Error("YouTube IFrame API load timed out."));
    }, 15000);

    window.onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      window.clearTimeout(timeoutId);

      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        fail(new Error("YouTube IFrame API could not be initialized."));
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => fail(new Error("YouTube IFrame API could not be loaded."));
      document.head.append(script);
    }
  });

  return iframeApiPromise;
}
