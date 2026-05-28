import { type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsLeft,
  Clock3,
  Eraser,
  Eye,
  EyeOff,
  FastForward,
  History,
  Link,
  Pause,
  Play,
  Repeat,
  Rewind,
  SkipBack,
  Type,
  X,
} from "lucide-react";
import { deleteVideoHistoryItem, loadVideoHistory, upsertVideoHistoryItem } from "./history";
import { createDraft, loadDraft, saveDraft } from "./storage";
import type { LoopRange, PracticeDraft, VideoHistoryItem } from "./types";
import { useYouTubePlayer } from "./useYouTubePlayer";
import { fetchYouTubeVideoTitle } from "./youtubeMetadata";
import { extractYouTubeVideoId, formatTime, isValidLoopRange } from "./youtubeUrl";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5];
type LoopPointKey = "a" | "b";
type LoadVideoOptions = {
  updateHistory?: boolean;
};

export default function App() {
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PracticeDraft | null>(null);
  const [historyItems, setHistoryItems] = useState<VideoHistoryItem[]>(() => loadVideoHistory());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAnswerVisible, setIsAnswerVisible] = useState(true);
  const lastLoopSeekAtRef = useRef(0);
  const hasAutoRestoredRef = useRef(false);
  const seekBackwardButtonRef = useRef<HTMLButtonElement | null>(null);
  const seekForwardButtonRef = useRef<HTMLButtonElement | null>(null);
  const playPauseButtonRef = useRef<HTMLButtonElement | null>(null);
  const setAButtonRef = useRef<HTMLButtonElement | null>(null);
  const setBButtonRef = useRef<HTMLButtonElement | null>(null);
  const loopToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const moveBToAButtonRef = useRef<HTMLButtonElement | null>(null);
  const answerVisibilityButtonRef = useRef<HTMLButtonElement | null>(null);
  const videoId = draft?.videoId ?? null;
  const player = useYouTubePlayer(videoId);

  const hasValidLoop = useMemo(() => {
    if (!draft) {
      return false;
    }

    return isValidLoopRange(draft.loopRange.a, draft.loopRange.b);
  }, [draft]);

  useEffect(() => {
    if (hasAutoRestoredRef.current) {
      return;
    }

    hasAutoRestoredRef.current = true;
    const lastHistoryItem = historyItems[0];

    if (lastHistoryItem) {
      loadVideoFromUrl(lastHistoryItem.sourceUrl, { updateHistory: false });
    }
  }, []);

  useEffect(() => {
    if (draft) {
      saveDraft(draft);
    }
  }, [draft]);

  useEffect(() => {
    if (!isHistoryOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHistoryOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isHistoryOpen]);

  useEffect(() => {
    if (!draft || player.status !== "ready") {
      return;
    }

    player.setPlaybackRate(draft.playbackRate);
  }, [draft?.playbackRate, draft?.videoId, player]);

  useEffect(() => {
    if (!draft || !draft.loopRange.enabled || !hasValidLoop) {
      return;
    }

    const { a, b } = draft.loopRange;

    if (a == null || b == null || player.currentTime < b) {
      return;
    }

    const now = Date.now();

    if (now - lastLoopSeekAtRef.current < 300) {
      return;
    }

    lastLoopSeekAtRef.current = now;
    player.seekTo(a);

    if (player.isPlaying) {
      player.play();
    }
  }, [draft, hasValidLoop, player]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) {
        return;
      }

      if (event.key === "Escape" && isTextEntryElement(document.activeElement)) {
        event.preventDefault();
        document.activeElement.blur();
        return;
      }

      if (!event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "enter") {
        event.preventDefault();
        clickShortcutButton(playPauseButtonRef);
        return;
      }

      if (key === ",") {
        event.preventDefault();
        clickShortcutButton(seekBackwardButtonRef);
        return;
      }

      if (key === ".") {
        event.preventDefault();
        clickShortcutButton(seekForwardButtonRef);
        return;
      }

      if (!event.shiftKey) {
        return;
      }

      if (key === "a") {
        event.preventDefault();
        clickShortcutButton(setAButtonRef);
        return;
      }

      if (key === "b") {
        event.preventDefault();
        clickShortcutButton(setBButtonRef);
        return;
      }

      if (key === "l") {
        event.preventDefault();
        clickShortcutButton(loopToggleButtonRef);
        return;
      }

      if (key === "h") {
        event.preventDefault();
        clickShortcutButton(answerVisibilityButtonRef);
        return;
      }

      if (key === "n") {
        event.preventDefault();
        clickShortcutButton(moveBToAButtonRef);
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, []);

  function handleLoadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadVideoFromUrl(urlValue);
  }

  function loadVideoFromUrl(sourceUrl: string, options: LoadVideoOptions = {}): boolean {
    const trimmedUrl = sourceUrl.trim();
    const nextVideoId = extractYouTubeVideoId(trimmedUrl);
    const shouldUpdateHistory = options.updateHistory ?? true;

    if (!nextVideoId) {
      setUrlError("有効なYouTube URLまたは動画IDを入力してください。");
      return false;
    }

    const savedDraft = loadDraft(nextVideoId);
    setUrlValue(trimmedUrl);
    setDraft(savedDraft ? { ...savedDraft, sourceUrl: trimmedUrl } : createDraft(nextVideoId, trimmedUrl));
    setUrlError(null);

    if (shouldUpdateHistory) {
      void updateVideoHistory(nextVideoId, trimmedUrl);
    }

    return true;
  }

  async function updateVideoHistory(nextVideoId: string, sourceUrl: string) {
    const title = await fetchYouTubeVideoTitle(nextVideoId);
    setHistoryItems(upsertVideoHistoryItem({ videoId: nextVideoId, sourceUrl, title }));
  }

  function handleHistorySelect(item: VideoHistoryItem) {
    setIsHistoryOpen(false);
    loadVideoFromUrl(item.sourceUrl);
  }

  function handleHistoryDelete(videoId: string) {
    setHistoryItems(deleteVideoHistoryItem(videoId));
  }

  function updateDraft(update: (current: PracticeDraft) => PracticeDraft) {
    setDraft((current) => (current ? update(current) : current));
  }

  function updateLoopRange(update: (current: LoopRange) => LoopRange) {
    updateDraft((current) => ({
      ...current,
      loopRange: update(current.loopRange),
    }));
  }

  function setLoopPoint(point: LoopPointKey) {
    updateLoopRange((current) => {
      const next = {
        ...current,
        [point]: Number(player.currentTime.toFixed(2)),
      };

      return {
        ...next,
        enabled: isValidLoopRange(next.a, next.b) ? next.enabled : false,
      };
    });
  }

  function adjustLoopPoint(point: LoopPointKey, deltaSeconds: number) {
    updateLoopRange((current) => {
      const currentValue = current[point];

      if (currentValue == null) {
        return current;
      }

      const upperBound = player.duration > 0 ? player.duration : Number.POSITIVE_INFINITY;
      const adjustedValue = clampTime(currentValue + deltaSeconds, 0, upperBound);
      const nextValue = Number(adjustedValue.toFixed(2));
      const next: LoopRange = point === "a" ? { ...current, a: nextValue } : { ...current, b: nextValue };

      return {
        ...next,
        enabled: isValidLoopRange(next.a, next.b) ? next.enabled : false,
      };
    });
  }

  function setPlaybackRate(rate: number) {
    player.setPlaybackRate(rate);
    updateDraft((current) => ({
      ...current,
      playbackRate: rate,
    }));
  }

  function seekBy(deltaSeconds: number) {
    if (player.status !== "ready") {
      return;
    }

    const upperBound = player.duration > 0 ? player.duration : Number.POSITIVE_INFINITY;
    const nextTime = clampTime(player.currentTime + deltaSeconds, 0, upperBound);

    player.seekTo(nextTime);

    if (player.isPlaying) {
      player.play();
    }
  }

  function clearLoop() {
    updateLoopRange(() => ({
      a: null,
      b: null,
      enabled: false,
    }));
  }

  function toggleLoop() {
    updateLoopRange((current) => ({
      ...current,
      enabled: hasValidLoop ? !current.enabled : false,
    }));
  }

  function moveBToAAndPlay() {
    const nextStart = draft?.loopRange.b;

    if (nextStart == null || player.status !== "ready") {
      return;
    }

    updateLoopRange((current) => ({
      ...current,
      a: nextStart,
      b: null,
      enabled: false,
    }));
    player.seekTo(nextStart);
    player.play();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">YouTube Dictation</p>
          <h1>Dictan</h1>
        </div>
      </header>

      <main className="workspace">
        <section className="video-pane" aria-label="YouTube練習エリア">
          <form className="url-form" onSubmit={handleLoadVideo}>
            <label className="field-label" htmlFor="youtube-url">
              <Link aria-hidden="true" size={18} />
              YouTube URL
            </label>
            <div className="url-row">
              <input
                id="youtube-url"
                value={urlValue}
                onChange={(event) => setUrlValue(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                autoComplete="off"
                spellCheck={false}
              />
              <button className="primary-button" type="submit" title="動画を読み込む">
                <Check aria-hidden="true" size={18} />
                読み込む
              </button>
              <button
                className="secondary-button"
                type="button"
                title="履歴を開く"
                onClick={() => setIsHistoryOpen(true)}
              >
                <History aria-hidden="true" size={18} />
                履歴
              </button>
            </div>
            {urlError ? <p className="field-error">{urlError}</p> : null}
          </form>

          <div className="player-region">
            {videoId ? (
              <div className="player-frame">
                <div ref={player.mountRef} className="youtube-player" />
                {player.status === "loading" ? <div className="player-overlay">Loading</div> : null}
                {player.error ? <div className="player-error">{player.error}</div> : null}
              </div>
            ) : (
              <div className="empty-player">
                <Clock3 aria-hidden="true" size={34} />
                <span>動画未選択</span>
              </div>
            )}
          </div>

          <div className="control-surface">
            <div className="timebar">
              <span>{formatTime(player.currentTime)}</span>
              <div className="timebar-track" aria-hidden="true">
                <div
                  className="timebar-fill"
                  style={{
                    width:
                      player.duration > 0
                        ? `${Math.min((player.currentTime / player.duration) * 100, 100)}%`
                        : "0%",
                  }}
                />
              </div>
              <span>{formatTime(player.duration)}</span>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="icon-button"
                title="先頭に戻る"
                disabled={player.status !== "ready"}
                onClick={() => player.seekTo(0)}
              >
                <ChevronsLeft aria-hidden="true" size={18} />
                <span>0:00</span>
              </button>
              <span className="button-divider" aria-hidden="true" />
              <button
                type="button"
                className="icon-button"
                title="A地点へ移動"
                disabled={draft?.loopRange.a == null}
                onClick={() => draft?.loopRange.a != null && player.seekTo(draft.loopRange.a)}
              >
                <SkipBack aria-hidden="true" size={18} />
                <span>Aへ</span>
              </button>
              <button
                ref={seekBackwardButtonRef}
                type="button"
                className="icon-button"
                title="3秒戻る"
                aria-label="3秒戻る"
                disabled={player.status !== "ready"}
                onClick={() => seekBy(-3)}
              >
                <Rewind aria-hidden="true" size={18} />
                <span>3s</span>
              </button>
              <button
                ref={playPauseButtonRef}
                type="button"
                className="icon-button"
                title={player.isPlaying ? "一時停止" : "再生"}
                disabled={player.status !== "ready"}
                onClick={() => (player.isPlaying ? player.pause() : player.play())}
              >
                {player.isPlaying ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
                <span>{player.isPlaying ? "一時停止" : "再生"}</span>
              </button>
              <button
                ref={seekForwardButtonRef}
                type="button"
                className="icon-button"
                title="3秒進める"
                aria-label="3秒進める"
                disabled={player.status !== "ready"}
                onClick={() => seekBy(3)}
              >
                <FastForward aria-hidden="true" size={18} />
                <span>3s</span>
              </button>
              <button
                ref={loopToggleButtonRef}
                type="button"
                className={draft?.loopRange.enabled ? "loop-toggle active" : "loop-toggle"}
                title="ABループ"
                disabled={!hasValidLoop}
                onClick={toggleLoop}
              >
                <Repeat aria-hidden="true" size={18} />
                <span>{draft?.loopRange.enabled ? "ABループ中" : "ABループ"}</span>
              </button>
            </div>

            <div className="loop-grid">
              <div className="loop-point">
                <span>A</span>
                <strong>{formatTime(draft?.loopRange.a)}</strong>
                <button
                  type="button"
                  title="Aを1秒戻す"
                  aria-label="Aを1秒戻す"
                  disabled={draft?.loopRange.a == null}
                  onClick={() => adjustLoopPoint("a", -1)}
                >
                  -1s
                </button>
                <button
                  type="button"
                  title="Aを1秒進める"
                  aria-label="Aを1秒進める"
                  disabled={draft?.loopRange.a == null}
                  onClick={() => adjustLoopPoint("a", 1)}
                >
                  +1s
                </button>
                <button
                  ref={setAButtonRef}
                  type="button"
                  title="現在位置をAに設定"
                  aria-label="現在位置をAに設定"
                  disabled={player.status !== "ready"}
                  onClick={() => setLoopPoint("a")}
                >
                  設定
                </button>
              </div>
              <div className="loop-point">
                <span>B</span>
                <strong>{formatTime(draft?.loopRange.b)}</strong>
                <button
                  type="button"
                  title="Bを1秒戻す"
                  aria-label="Bを1秒戻す"
                  disabled={draft?.loopRange.b == null}
                  onClick={() => adjustLoopPoint("b", -1)}
                >
                  -1s
                </button>
                <button
                  type="button"
                  title="Bを1秒進める"
                  aria-label="Bを1秒進める"
                  disabled={draft?.loopRange.b == null}
                  onClick={() => adjustLoopPoint("b", 1)}
                >
                  +1s
                </button>
                <button
                  ref={setBButtonRef}
                  type="button"
                  title="現在位置をBに設定"
                  aria-label="現在位置をBに設定"
                  disabled={player.status !== "ready"}
                  onClick={() => setLoopPoint("b")}
                >
                  設定
                </button>
              </div>
              <button
                ref={moveBToAButtonRef}
                type="button"
                className="icon-button"
                title="BをAにして再生"
                aria-label="BをAにして再生"
                disabled={draft?.loopRange.b == null || player.status !== "ready"}
                onClick={moveBToAAndPlay}
              >
                <span>B→A</span>
              </button>
              <button type="button" className="icon-button" title="ループをクリア" disabled={!draft} onClick={clearLoop}>
                <Eraser aria-hidden="true" size={18} />
                <span>クリア</span>
              </button>
            </div>

            <div className="rate-row" aria-label="再生速度">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={draft?.playbackRate === rate ? "rate-button active" : "rate-button"}
                  disabled={player.status !== "ready"}
                  onClick={() => setPlaybackRate(rate)}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="notes-pane" aria-label="ディクテーション入力エリア">
          <div className="text-panel">
            <label className="field-label" htmlFor="dictation-text">
              <Type aria-hidden="true" size={18} />
              ディクテーション
            </label>
            <textarea
              id="dictation-text"
              value={draft?.dictation ?? ""}
              disabled={!draft}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  dictation: event.target.value,
                }))
              }
              placeholder="聞き取った内容を入力"
            />
          </div>

          <div className="text-panel secondary">
            <div className="text-panel-header">
              <label className="field-label" htmlFor="answer-text">
                <Check aria-hidden="true" size={18} />
                正解メモ
              </label>
              <button
                ref={answerVisibilityButtonRef}
                type="button"
                className="visibility-toggle"
                title={isAnswerVisible ? "正解メモを非表示" : "正解メモを表示"}
                aria-label={isAnswerVisible ? "正解メモを非表示" : "正解メモを表示"}
                aria-controls="answer-panel-body"
                aria-expanded={isAnswerVisible}
                onClick={() => setIsAnswerVisible((current) => !current)}
              >
                {isAnswerVisible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
                <span>{isAnswerVisible ? "非表示" : "表示"}</span>
              </button>
            </div>
            <div id="answer-panel-body">
              {isAnswerVisible ? (
                <textarea
                  id="answer-text"
                  value={draft?.answer ?? ""}
                  disabled={!draft}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      answer: event.target.value,
                    }))
                  }
                  placeholder="必要に応じて正解や字幕を貼り付け"
                />
              ) : (
                <div className="answer-hidden" aria-live="polite">
                  正解メモは非表示です
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="info-section" aria-label="アプリ情報">
        <section className="info-panel" aria-labelledby="usage-title">
          <h2 id="usage-title">使い方</h2>
          <ol>
            <li>YouTube URLを入力して動画を読み込みます。</li>
            <li>聞き取りたい範囲でAとBを設定し、必要に応じてABループを使います。</li>
            <li>右側のディクテーション欄に聞き取った内容を書きます。</li>
            <li>次の区間へ進むときはB→Aを押すと、B地点から続けて再生できます。</li>
          </ol>
        </section>

        <section className="info-panel" aria-labelledby="shortcuts-title">
          <h2 id="shortcuts-title">ショートカット</h2>
          <p>ディクテーション欄に入力中でも使えます。</p>
          <dl className="shortcut-list">
            <div>
              <dt>再生/一時停止</dt>
              <dd>
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
              </dd>
            </div>
            <div>
              <dt>3秒戻る/進める</dt>
              <dd>
                <kbd>Ctrl</kbd> + <kbd>,</kbd> / <kbd>.</kbd>
              </dd>
            </div>
            <div>
              <dt>A/Bを設定</dt>
              <dd>
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> / <kbd>B</kbd>
              </dd>
            </div>
            <div>
              <dt>ABループ切替</dt>
              <dd>
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd>
              </dd>
            </div>
            <div>
              <dt>正解メモ表示切替</dt>
              <dd>
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>
              </dd>
            </div>
            <div>
              <dt>B→Aして再生</dt>
              <dd>
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>
              </dd>
            </div>
            <div>
              <dt>入力欄から出る</dt>
              <dd>
                <kbd>Esc</kbd>
              </dd>
            </div>
          </dl>
        </section>

        <section className="info-panel" aria-labelledby="privacy-title">
          <h2 id="privacy-title">プライバシーポリシー</h2>
          <p>
            入力したディクテーション本文、正解メモ、動画履歴、ABループ設定は、このブラウザのlocalStorageに保存されます。
            Dictanのサーバーには送信されません。
          </p>
          <p>
            動画の表示とタイトル取得のため、YouTubeおよびGoogleへ動画URLまたは動画IDが送信されます。
            保存内容を消したい場合は、ブラウザのサイトデータを削除してください。
          </p>
        </section>
      </footer>

      {isHistoryOpen ? (
        <div className="modal-backdrop" onClick={() => setIsHistoryOpen(false)}>
          <div
            aria-labelledby="history-title"
            aria-modal="true"
            className="history-dialog"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-dialog-header">
              <h2 id="history-title">履歴</h2>
              <button
                className="icon-button"
                type="button"
                title="履歴を閉じる"
                aria-label="履歴を閉じる"
                onClick={() => setIsHistoryOpen(false)}
              >
                <X aria-hidden="true" size={18} />
                <span>閉じる</span>
              </button>
            </div>

            {historyItems.length > 0 ? (
              <ul className="history-list" aria-label="動画履歴">
                {historyItems.map((item) => (
                  <li key={item.videoId}>
                    <div className="history-row">
                      <button
                        className="history-item"
                        type="button"
                        aria-label={`${item.title}を開く`}
                        onClick={() => handleHistorySelect(item)}
                      >
                        <strong>{item.title}</strong>
                        <span>{item.sourceUrl}</span>
                      </button>
                      <button
                        className="history-delete"
                        type="button"
                        title="履歴から削除"
                        aria-label={`履歴から${item.title}を削除`}
                        onClick={() => handleHistoryDelete(item.videoId)}
                      >
                        <X aria-hidden="true" size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="history-empty">履歴はまだありません</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function clampTime(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function isTextEntryElement(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

function clickShortcutButton(buttonRef: RefObject<HTMLButtonElement | null>) {
  const button = buttonRef.current;

  if (!button || button.disabled) {
    return;
  }

  button.click();
}
