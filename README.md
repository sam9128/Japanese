# 日語階梯

N3 → N2 年度離線學習 PWA。未登入時資料保存在 IndexedDB；登入後可透過 Supabase 在手機與電腦間同步。

## 帳號與跨裝置同步

1. 在 Supabase 建立專案，於 SQL Editor 執行 `supabase/schema.sql`。
2. 複製 `.env.example` 為 `.env.local`，填入 Project URL 與 Publishable Key。
3. GitHub Pages 部署時建立 Repository variable `VITE_SUPABASE_URL`，以及 Repository secret `VITE_SUPABASE_PUBLISHABLE_KEY`。
4. Supabase Authentication → URL Configuration 的 Site URL 與 Redirect URLs 加入 `https://sam9128.github.io/Japanese/`。

前端只使用可公開的 Publishable Key；請勿放入 `service_role` key。每位使用者的資料由 PostgreSQL RLS 依 `auth.uid()` 隔離。

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
