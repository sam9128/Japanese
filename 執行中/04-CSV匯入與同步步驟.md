# CSV 匯入與同步到 AnkiDroid

## 重要限制

AnkiDroid 目前不能直接匯入 CSV／文字檔，只能直接匯入 Anki 套件（`.apkg`）。本專案的 CSV 需先用電腦版 Anki 匯入，再經 AnkiWeb 同步到 Android。

## 一次設定流程

1. 在電腦安裝 Anki：https://apps.ankiweb.net/
2. 以和 AnkiDroid 相同的 AnkiWeb 帳號登入。
3. 在電腦版 Anki 選擇「檔案」→「匯入」。
4. 先選擇 `N3單字_W1_100張.csv`。
5. 匯入畫面應自動帶入：
   - 分隔符號：Comma
   - 筆記類型：Basic
   - 牌組：`JLPT-N3-單字`
   - 第 1 欄：Front
   - 第 2 欄：Back
   - 第 3 欄：Tags
   - HTML：開啟
6. 預覽確認日文、中文與 `<br>` 換行正常，再匯入。
7. 用同樣方式匯入 `N3文法_W1_15張.csv`；牌組應為 `JLPT-N3-文法`。
8. 在電腦版按「同步」，選擇上傳到 AnkiWeb。
9. 打開 AnkiDroid 按「同步」，下載雲端資料。

## 驗收

- `JLPT-N3-單字`：100 張。
- `JLPT-N3-文法`：15 張。
- 卡片背面能正常換行顯示讀音、中文與例句。
- 標籤包含：`JLPT_N3`、`115_07`、`W1`。

若匯入畫面沒有自動辨識，手動依上面的欄位設定，不要直接按匯入。
