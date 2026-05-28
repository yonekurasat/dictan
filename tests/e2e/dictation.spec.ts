import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://www.youtube.com/oembed**", async (route) => {
    const endpoint = new URL(route.request().url());
    const videoUrl = endpoint.searchParams.get("url") ?? "";
    const videoId = new URL(videoUrl).searchParams.get("v") ?? "";
    const titles: Record<string, string> = {
      dQw4w9WgXcQ: "First Video",
      "M7lc1UVf-VE": "Second Video",
    };

    await route.fulfill({
      contentType: "application/json",
      json: { title: titles[videoId] ?? `Video ${videoId}` },
    });
  });

  await page.addInitScript(() => {
    class MockPlayer {
      currentTime = 8;
      duration = 120;
      state = 2;
      playbackRate = 1;
      frame: HTMLIFrameElement | null = null;

      constructor(element: HTMLElement, options: { events?: { onReady?: (event: { target: MockPlayer }) => void } }) {
        const frame = document.createElement("iframe");
        frame.setAttribute("title", "Mock YouTube");
        frame.style.width = "100%";
        frame.style.height = "100%";
        element.replaceWith(frame);
        this.frame = frame;
        window.setTimeout(() => options.events?.onReady?.({ target: this }), 0);
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

    window.YT = {
      Player: MockPlayer,
    } as never;
  });
});

test("loads a YouTube URL and persists dictation text", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("YouTube URL").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "読み込む" }).click();

  const dictationBox = page.getByRole("textbox", { name: "ディクテーション" });
  await expect(dictationBox).toBeEnabled();
  await expect(page.getByText("0:08")).toBeVisible();
  await expect(page.getByRole("button", { name: "3秒戻る" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "3秒進める" })).toBeEnabled();
  await page.getByRole("button", { name: "3秒戻る" }).click();
  await expect(page.getByText("0:05")).toBeVisible();
  await page.getByRole("button", { name: "3秒進める" }).click();
  await expect(page.getByText("0:08")).toBeVisible();
  const answerBox = page.getByRole("textbox", { name: "正解メモ" });
  await answerBox.fill("Correct transcript");
  await page.getByRole("button", { name: "正解メモを非表示" }).click();
  await expect(answerBox).toBeHidden();
  await expect(page.getByText("正解メモは非表示です")).toBeVisible();
  await dictationBox.focus();
  await page.keyboard.down("Control");
  await page.keyboard.press(",");
  await page.keyboard.up("Control");
  await expect(page.getByText("0:05")).toBeVisible();
  await page.keyboard.down("Control");
  await page.keyboard.press(".");
  await page.keyboard.up("Control");
  await expect(page.getByText("0:08")).toBeVisible();
  await page.keyboard.down("Control");
  await page.keyboard.press("Enter");
  await page.keyboard.up("Control");
  await expect(page.getByRole("button", { name: "一時停止" })).toBeVisible();
  await page.keyboard.down("Control");
  await page.keyboard.down("Shift");
  await page.keyboard.press("H");
  await page.keyboard.up("Shift");
  await page.keyboard.up("Control");
  await expect(answerBox).toBeVisible();
  await expect(answerBox).toHaveValue("Correct transcript");
  await expect(page.getByRole("button", { name: "Aを1秒戻す" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Aを1秒進める" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Bを1秒戻す" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Bを1秒進める" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "BをAにして再生" })).toBeDisabled();

  await page.getByRole("button", { name: "現在位置をAに設定" }).click();
  await expect(page.getByRole("button", { name: "Aを1秒戻す" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Aを1秒進める" })).toBeEnabled();
  await page.getByRole("button", { name: "Aを1秒進める" }).click();
  await page.getByRole("button", { name: "現在位置をBに設定" }).click();
  await page.getByRole("button", { name: "Bを1秒進める" }).click();
  await expect(page.getByRole("button", { name: "BをAにして再生" })).toBeEnabled();
  await page.getByRole("button", { name: "BをAにして再生" }).click();
  await dictationBox.fill("Never gonna give you up");

  const savedDraft = await page.evaluate(() => localStorage.getItem("dictan:v1:dQw4w9WgXcQ"));
  expect(savedDraft).toContain("Never gonna give you up");
  expect(savedDraft).toContain('"a":9');
  expect(savedDraft).toContain('"b":null');

  await page.getByLabel("YouTube URL").fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  await page.getByRole("button", { name: "読み込む" }).click();
  await expect(page.getByRole("heading", { name: "Dictan" })).toBeVisible();
  await expect(dictationBox).toBeEnabled();
  await expect(page.getByLabel("YouTube URL")).toHaveValue("https://www.youtube.com/watch?v=M7lc1UVf-VE");

  await page.getByRole("button", { name: "履歴" }).click();

  const historyDialog = page.getByRole("dialog", { name: "履歴" });
  const historyList = historyDialog.getByRole("list", { name: "動画履歴" });
  const secondHistoryItem = historyList.getByRole("button", { name: "Second Videoを開く" });
  const firstHistoryItem = historyList.getByRole("button", { name: "First Videoを開く" });
  await expect(secondHistoryItem).toContainText("Second Video");
  await expect(firstHistoryItem).toContainText("First Video");
  await historyList.getByRole("button", { name: "履歴からSecond Videoを削除" }).click();
  await expect(historyList.getByRole("button", { name: "Second Videoを開く" })).toHaveCount(0);

  await firstHistoryItem.click();
  await expect(page.getByLabel("YouTube URL")).toHaveValue("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await expect(page.getByRole("heading", { name: "Dictan" })).toBeVisible();
  await expect(dictationBox).toBeEnabled();

  await page.reload();
  await expect(page.getByLabel("YouTube URL")).toHaveValue("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await expect(dictationBox).toBeEnabled();
});
