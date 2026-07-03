# 日語階梯

N3 → N2 年度離線學習 PWA。資料先保存在 IndexedDB；使用者可自行授權 Google 雲端硬碟，在手機與電腦間同步。

## Google 雲端硬碟同步

1. 在 Google Cloud 建立專案並啟用 Google Drive API。
2. 設定 OAuth 同意畫面；若維持測試模式，將使用者加入 Test users。
3. 建立「Web application」OAuth Client ID，Authorized JavaScript origins 加入 `http://localhost:5173` 與 `https://sam9128.github.io`。
4. 複製 `.env.example` 為 `.env.local` 並填入 Client ID；GitHub Pages 則建立 Repository variable `VITE_GOOGLE_CLIENT_ID`。

網站採 Google Identity Services token model，只要求 `drive.appdata` 權限。備份位於使用者 Drive 的隱藏 `appDataFolder`；access token 僅存在記憶體，不寫入 IndexedDB、localStorage 或備份。OAuth Client ID 可公開，請勿加入 Client Secret。

## 本機執行

```bash
pnpm install
pnpm run validate:content
pnpm run dev
```

正式建置使用 `pnpm run build`。推送到 `main` 後，根目錄的 GitHub Actions 工作流程會自動建置並部署 GitHub Pages。

## 教材更新

年度教材已生成於 `public/content/periods/`。若要從開放詞彙來源重新產生：

```bash
pnpm run generate:content
pnpm run validate:content
```

生成器預期詞彙來源位於專案上層 `tmp/language-learning-decks/japanese/`。網站正式執行只讀取已生成的月份分包，不依賴該暫存資料夾。

## 資料與著作權

完整署名請見 `public/content/ATTRIBUTION.md`。JLPT 官方試題與音檔只提供來源連結，未收錄或轉載。
