# 日語階梯

N3 → N2 年度離線學習 PWA。所有學習紀錄只保存在瀏覽器 IndexedDB，不上傳伺服器。

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
