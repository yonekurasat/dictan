import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerStatus } from "./types";
import { loadYouTubeIframeApi, type YouTubePlayer } from "./youtubeApi";

const PLAYER_VARS = {
  autoplay: 0,
  controls: 1,
  modestbranding: 1,
  playsinline: 1,
  rel: 0,
} as const;

export function useYouTubePlayer(videoId: string | null) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let readyTimeoutId: number | undefined;
    const hostElement = mountRef.current;

    playerRef.current?.destroy();
    playerRef.current = null;
    hostElement?.replaceChildren();
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(null);

    if (!videoId) {
      setStatus("idle");
      return;
    }

    setStatus("loading");

    if (!hostElement) {
      setStatus("error");
      setError("YouTubeプレイヤーを表示する領域を初期化できませんでした。再読み込みしてください。");
      return;
    }

    const playerTarget = document.createElement("div");
    playerTarget.className = "youtube-player-target";
    hostElement.append(playerTarget);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (isCancelled || !playerTarget.isConnected) {
          return;
        }

        readyTimeoutId = window.setTimeout(() => {
          if (!isCancelled) {
            setStatus("error");
            setError("YouTubeプレイヤーの準備が完了しませんでした。再読み込みするか、別の動画URLを試してください。");
          }
        }, 15000);

        playerRef.current = new YT.Player(playerTarget, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: PLAYER_VARS,
          events: {
            onReady: (event) => {
              if (isCancelled) {
                return;
              }

              if (readyTimeoutId) {
                window.clearTimeout(readyTimeoutId);
              }

              setStatus("ready");
              setDuration(safePlayerNumber(() => event.target.getDuration()));
            },
            onError: () => {
              if (readyTimeoutId) {
                window.clearTimeout(readyTimeoutId);
              }

              setStatus("error");
              setError("この動画は埋め込み再生できない可能性があります。別の動画URLを試してください。");
            },
            onStateChange: (event) => {
              setIsPlaying(event.data === 1);
            },
          },
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setStatus("error");
          setError("YouTubeプレイヤーを読み込めませんでした。ネットワーク接続を確認してください。");
        }
      });

    return () => {
      isCancelled = true;
      if (readyTimeoutId) {
        window.clearTimeout(readyTimeoutId);
      }
      playerRef.current?.destroy();
      playerRef.current = null;
      hostElement.replaceChildren();
    };
  }, [videoId]);

  useEffect(() => {
    if (!videoId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;

      if (!player) {
        return;
      }

      setCurrentTime(safePlayerNumber(() => player.getCurrentTime()));
      setDuration(safePlayerNumber(() => player.getDuration()));
      setIsPlaying(safePlayerNumber(() => player.getPlayerState()) === 1);
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [videoId]);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(Math.max(0, seconds), true);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    playerRef.current?.setPlaybackRate(rate);
  }, []);

  return {
    mountRef,
    status,
    error,
    currentTime,
    duration,
    isPlaying,
    play,
    pause,
    seekTo,
    setPlaybackRate,
  };
}

function safePlayerNumber(readValue: () => number): number {
  try {
    const value = readValue();
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}
