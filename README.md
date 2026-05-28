# Dictan

Dictan は YouTube 動画でディクテーション練習をするためのブラウザアプリです。動画を読み込み、聞き取りたい区間を A-B ループにして、聞こえた内容を入力できます。正解メモを隠しながら練習し、あとで見比べる用途を想定しています。

公開先:

https://yonekurasat.github.io/dictan/

## 主な機能

- YouTube URL または動画 ID から動画を読み込み
- A-B ループ再生
- 3 秒戻る / 3 秒進める操作
- 再生速度の変更: `0.5x`, `0.75x`, `1x`, `1.25x`, `1.5x`
- ディクテーション入力欄
- 正解メモ欄
- 正解メモの表示 / 非表示切り替え
- 動画履歴の保存、タイトル取得、削除
- 最後に開いた動画の自動復元
- 入力中でも使えるキーボードショートカット
- `localStorage` によるブラウザ内保存

## キーボードショートカット

| 操作 | ショートカット |
| --- | --- |
| 再生 / 一時停止 | `Ctrl` + `Enter` |
| 3 秒戻る / 進める | `Ctrl` + `,` / `Ctrl` + `.` |
| A / B 地点を設定 | `Ctrl` + `Shift` + `A` / `Ctrl` + `Shift` + `B` |
| A-B ループ切り替え | `Ctrl` + `Shift` + `L` |
| 正解メモの表示切り替え | `Ctrl` + `Shift` + `H` |
| B を A にして再生 | `Ctrl` + `Shift` + `N` |
| 入力欄からフォーカスを外す | `Esc` |

## 技術スタック

- React
- TypeScript
- Vite
- Vitest
- Testing Library
- Playwright
- GitHub Actions / GitHub Pages

## ローカル開発

GitHub Actions と合わせて Node.js 24 を推奨します。

```bash
npm install
npm run dev
```

開発サーバーは `127.0.0.1` に bind します。アクセス先 URL は Vite の出力を確認してください。

## テストとビルド

単体テスト / コンポーネントテスト:

```bash
npm test
```

通常の production build:

```bash
npm run build
```

GitHub Pages 用の build:

```bash
npm run build -- --base=/dictan/
```

Playwright の E2E テスト:

```bash
npm run test:e2e
```

Playwright のブラウザが未インストールの場合:

```bash
npx playwright install
```

## デプロイ

GitHub Pages へのデプロイは `.github/workflows/pages.yml` で定義しています。

`main` ブランチに push すると、GitHub Actions が次の処理を実行します。

1. `npm ci` で依存関係をインストール
2. `npm test` を実行
3. `npm run build -- --base=/dictan/` で Pages 用にビルド
4. `dist` をアップロード
5. GitHub Pages にデプロイ

GitHub リポジトリ側では、Settings > Pages の Source を `GitHub Actions` に設定してください。

## プライバシー

入力したディクテーション本文、正解メモ、動画履歴、A-B ループ設定、再生速度は、このブラウザの `localStorage` に保存されます。Dictan のサーバーには送信されません。

動画の表示とタイトル取得のため、YouTube および Google に動画 URL または動画 ID が送信されます。
