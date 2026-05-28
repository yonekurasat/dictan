import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { HISTORY_STORAGE_KEY } from "./history";
import { storageKey } from "./storage";
import type { YouTubePlayer } from "./youtubeApi";

class MockYouTubePlayer implements YouTubePlayer {
  private currentTime = 8;
  private duration = 120;
  private state = 2;
  private playbackRate = 1;
  private frame: HTMLIFrameElement | null = null;

  constructor(element: HTMLElement | string, options: { events?: { onReady?: (event: { target: YouTubePlayer }) => void } }) {
    const target = typeof element === "string" ? document.getElementById(element) : element;
    const frame = document.createElement("iframe");
    frame.setAttribute("data-testid", "mock-youtube-player");
    target?.replaceWith(frame);
    this.frame = frame;
    setTimeout(() => options.events?.onReady?.({ target: this }), 0);
  }

  playVideo() {
    this.state = 1;
  }

  pauseVideo() {
    this.state = 2;
  }

  stopVideo() {
    this.state = 0;
  }

  destroy() {
    this.state = 0;
    this.frame?.remove();
    this.frame = null;
  }

  seekTo(seconds: number) {
    this.currentTime = seconds;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getDuration() {
    return this.duration;
  }

  getPlayerState() {
    return this.state;
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
  }

  getPlaybackRate() {
    return this.playbackRate;
  }
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    window.YT = {
      Player: MockYouTubePlayer as never,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL) => {
        const videoUrl = input.searchParams.get("url") ?? "";
        const videoId = new URL(videoUrl).searchParams.get("v") ?? "";
        const titles: Record<string, string> = {
          dQw4w9WgXcQ: "First Video",
          "M7lc1UVf-VE": "Second Video",
        };

        return new Response(JSON.stringify({ title: titles[videoId] ?? `Video ${videoId}` }), { status: 200 });
      }),
    );
  });

  afterEach(() => {
    delete window.YT;
    vi.unstubAllGlobals();
  });

  it("loads a video, enables dictation, and saves typed text", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("YouTube URL"), "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "読み込む" }));

    const dictation = await screen.findByLabelText("ディクテーション");
    await waitFor(() => expect(dictation).toBeEnabled());
    await user.type(dictation, "Never gonna give you up");

    expect(localStorage.getItem(storageKey("dQw4w9WgXcQ"))).toContain("Never gonna give you up");
  });

  it("orders playback controls and seeks backward or forward by three seconds", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const seekBackward = screen.getByRole("button", { name: "3秒戻る" });
    const seekForward = screen.getByRole("button", { name: "3秒進める" });

    expect(seekBackward).toBeDisabled();
    expect(seekForward).toBeDisabled();
    expect(container.querySelector(".button-row")?.textContent?.replace(/\s+/g, "")).toBe(
      "0:00Aへ3s再生3sABループ",
    );

    await user.type(screen.getByLabelText("YouTube URL"), "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "読み込む" }));

    const dictation = await screen.findByLabelText("ディクテーション");
    await waitFor(() => expect(dictation).toBeEnabled());
    await screen.findByText("0:08");

    await waitFor(() => expect(seekBackward).toBeEnabled());
    await user.click(seekBackward);
    await screen.findByText("0:05");

    await user.click(seekForward);
    await screen.findByText("0:08");
  });

  it("handles Ctrl shortcuts while the dictation textarea is focused", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("YouTube URL"), "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "読み込む" }));

    const dictation = await screen.findByLabelText("ディクテーション");
    await waitFor(() => expect(dictation).toBeEnabled());
    dictation.focus();
    expect(dictation).toHaveFocus();

    fireEvent.keyDown(dictation, { key: "Enter", ctrlKey: true });
    await screen.findByRole("button", { name: "一時停止" });

    fireEvent.keyDown(dictation, { key: "A", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange.a).toBe(8);
    });

    fireEvent.keyDown(dictation, { key: ".", ctrlKey: true });
    await screen.findByText("0:11");

    fireEvent.keyDown(dictation, { key: "B", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange.b).toBe(11);
    });

    fireEvent.keyDown(dictation, { key: "L", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange.enabled).toBe(true);
    });

    fireEvent.keyDown(dictation, { key: "N", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange).toMatchObject({ a: 11, b: null, enabled: false });
    });

    expect(screen.getByRole("textbox", { name: "正解メモ" })).toBeInTheDocument();
    fireEvent.keyDown(dictation, { key: "H", ctrlKey: true, shiftKey: true });
    expect(screen.queryByRole("textbox", { name: "正解メモ" })).not.toBeInTheDocument();
    expect(screen.getByText("正解メモは非表示です")).toBeInTheDocument();
    fireEvent.keyDown(dictation, { key: "H", ctrlKey: true, shiftKey: true });
    expect(screen.getByRole("textbox", { name: "正解メモ" })).toBeInTheDocument();

    fireEvent.keyDown(dictation, { key: ",", ctrlKey: true, isComposing: true });
    expect(dictation).toHaveFocus();
    expect(screen.queryByText("0:08")).not.toBeInTheDocument();

    fireEvent.keyDown(dictation, { key: "Escape" });
    expect(dictation).not.toHaveFocus();
  });

  it("hides and shows the answer memo without clearing its text", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("YouTube URL"), "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "読み込む" }));

    const answerMemo = await screen.findByRole("textbox", { name: "正解メモ" });
    await waitFor(() => expect(answerMemo).toBeEnabled());
    await user.type(answerMemo, "Correct transcript");

    await user.click(screen.getByRole("button", { name: "正解メモを非表示" }));
    expect(screen.queryByRole("textbox", { name: "正解メモ" })).not.toBeInTheDocument();
    expect(screen.getByText("正解メモは非表示です")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "正解メモを表示" }));
    expect(screen.getByRole("textbox", { name: "正解メモ" })).toHaveValue("Correct transcript");
  });

  it("adjusts A and B loop points by one second after they are set", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("YouTube URL"), "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "読み込む" }));

    const dictation = await screen.findByLabelText("ディクテーション");
    await waitFor(() => expect(dictation).toBeEnabled());
    await screen.findByText("0:08");

    const decreaseA = screen.getByRole("button", { name: "Aを1秒戻す" });
    const increaseA = screen.getByRole("button", { name: "Aを1秒進める" });
    const decreaseB = screen.getByRole("button", { name: "Bを1秒戻す" });
    const increaseB = screen.getByRole("button", { name: "Bを1秒進める" });

    expect(decreaseA).toBeDisabled();
    expect(increaseA).toBeDisabled();
    expect(decreaseB).toBeDisabled();
    expect(increaseB).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "現在位置をAに設定" }));
    await waitFor(() => expect(increaseA).toBeEnabled());
    await user.click(increaseA);
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange.a).toBe(9);
    });
    await user.click(decreaseA);
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange.a).toBe(8);
    });

    await user.click(screen.getByRole("button", { name: "現在位置をBに設定" }));
    await waitFor(() => expect(increaseB).toBeEnabled());
    await user.click(increaseB);
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange.b).toBe(9);
    });
    await user.click(decreaseB);
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange.b).toBe(8);
    });
  });

  it("moves B to A, clears B, and starts playback", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("YouTube URL"), "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "読み込む" }));

    const dictation = await screen.findByLabelText("ディクテーション");
    await waitFor(() => expect(dictation).toBeEnabled());
    await screen.findByText("0:08");

    const moveBToAButton = screen.getByRole("button", { name: "BをAにして再生" });
    expect(moveBToAButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "現在位置をAに設定" }));
    await user.click(screen.getByRole("button", { name: "現在位置をBに設定" }));
    await user.click(screen.getByRole("button", { name: "Bを1秒進める" }));
    await waitFor(() => expect(moveBToAButton).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "ABループ" }));
    await user.click(moveBToAButton);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey("dQw4w9WgXcQ")) ?? "{}");
      expect(saved.loopRange).toMatchObject({
        a: 9,
        b: null,
        enabled: false,
      });
    });
    expect(moveBToAButton).toBeDisabled();
    await screen.findByRole("button", { name: "一時停止" });
  });

  it("records loaded videos in history and reloads a selected history item", async () => {
    const user = userEvent.setup();
    render(<App />);

    const urlInput = screen.getByLabelText("YouTube URL");
    await user.type(urlInput, "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "読み込む" }));
    await waitFor(() => expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toContain("First Video"));

    await user.clear(urlInput);
    await user.type(urlInput, "https://youtu.be/M7lc1UVf-VE");
    await user.click(screen.getByRole("button", { name: "読み込む" }));
    await waitFor(() => expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toContain("Second Video"));

    await user.click(screen.getByRole("button", { name: "履歴" }));

    const dialog = await screen.findByRole("dialog", { name: "履歴" });
    const historyList = within(dialog).getByRole("list", { name: "動画履歴" });
    const historyOpenButtons = within(historyList).getAllByRole("button", { name: /を開く$/ });

    expect(historyOpenButtons[0]).toHaveTextContent("Second Video");
    expect(historyOpenButtons[1]).toHaveTextContent("First Video");

    await user.click(within(historyList).getByRole("button", { name: "履歴からSecond Videoを削除" }));
    expect(within(historyList).queryByRole("button", { name: "Second Videoを開く" })).not.toBeInTheDocument();
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).not.toContain("Second Video");

    await user.click(within(historyList).getByRole("button", { name: "First Videoを開く" }));

    expect(screen.queryByRole("dialog", { name: "履歴" })).not.toBeInTheDocument();
    expect(urlInput).toHaveValue("https://youtu.be/dQw4w9WgXcQ");
    await waitFor(() => expect(screen.getByLabelText("ディクテーション")).toBeEnabled());
    expect(screen.getByRole("heading", { name: "Dictan" })).toBeInTheDocument();
  });

  it("automatically restores the most recently opened history item", async () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          videoId: "dQw4w9WgXcQ",
          sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
          title: "First Video",
          lastUsedAt: "2026-01-02T00:00:00.000Z",
        },
      ]),
    );
    localStorage.setItem(
      storageKey("dQw4w9WgXcQ"),
      JSON.stringify({
        videoId: "dQw4w9WgXcQ",
        sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
        dictation: "Saved dictation",
        answer: "Saved answer",
        loopRange: { a: null, b: null, enabled: false },
        playbackRate: 1,
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByLabelText("YouTube URL")).toHaveValue("https://youtu.be/dQw4w9WgXcQ"));
    expect(screen.getByRole("textbox", { name: "ディクテーション" })).toHaveValue("Saved dictation");
    expect(screen.getByRole("textbox", { name: "正解メモ" })).toHaveValue("Saved answer");
  });

  it("keeps the app rendered when a different URL is loaded while a player exists", async () => {
    const user = userEvent.setup();
    render(<App />);

    const urlInput = screen.getByLabelText("YouTube URL");
    await user.type(urlInput, "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "読み込む" }));
    await waitFor(() => expect(screen.getByLabelText("ディクテーション")).toBeEnabled());

    await user.clear(urlInput);
    await user.type(urlInput, "https://youtu.be/M7lc1UVf-VE");
    await user.click(screen.getByRole("button", { name: "読み込む" }));

    await waitFor(() => expect(screen.getByLabelText("ディクテーション")).toBeEnabled());
    expect(screen.getByRole("heading", { name: "Dictan" })).toBeInTheDocument();
    expect(urlInput).toHaveValue("https://youtu.be/M7lc1UVf-VE");
  });
});
