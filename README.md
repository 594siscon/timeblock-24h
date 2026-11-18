# 時光方塊 · 24H 時間管理 App

電腦與 iPhone（iOS Safari PWA）共用的 24 小時拖曳式時間區塊管理應用，支援 **Supabase 跨裝置即時自動同步**。

## 核心功能
- **電腦與 iPhone 共用（PWA）**：單一程式碼庫，支援 iPhone Safari「加入主畫面」全螢幕體驗與離線快取。
- **24 小時時間軸**：完整顯示 `00:00`–`24:00`（96 個 15 分鐘刻度），含即時時間紅線與三段高度密度切換。
- **拖曳填入方塊**：從左側欄（電腦）或底部活動列（iPhone）拖曳活動方塊填入時間表，自動吸附 15 分鐘刻度。
- **預設 1 小時、15 分鐘級距調整**：拖曳方塊上方或下方邊緣拉桿，即可以 **15 分鐘**為單位調整高度與起訖時間。
- **活動與分類管理**：支援自訂活動類別（名稱、顏色、圖示）、常用活動模板與每日 24 小時分配統計。
- **電腦 ↔ iPhone 即時自動同步**：串接免費 **Supabase**（Auth + PostgreSQL + Realtime），任一裝置調整排程，另一台裝置立即更新。

---

## 啟用「電腦 ↔ iPhone 即時自動同步」（免費 Supabase，3 分鐘設定）

1. 前往 [https://supabase.com](https://supabase.com) 登入並點擊 **New Project** 建立免費專案。
2. 進入左側 **SQL Editor**，將專案內的 [`supabase_setup.sql`](./supabase_setup.sql) 全部貼上並按 **Run**（自動建立資料表、RLS 隱私權限與 Realtime 即時推播）。
3. （建議）前往左側 **Authentication → Providers → Email**，關閉 **Confirm email**（讓註冊後不需收信即可馬上登入同步）。
4. 前往左側 **Project Settings → API**（或 **API Keys**），複製：
   - **Project URL**（例如 `https://xxxx.supabase.co`）
   - **Publishable / anon public key**
5. 在 App 右上角點 **「雲端同步」** → 展開 **「⚙️ Supabase 連線設定」** → 貼上 URL 與 Key 並儲存 → 註冊／登入帳號即可！
   - 若不想在 iPhone 重複貼上金鑰：登入後點 **「🔗 複製 iPhone 快速設定連結」** 傳到手機點開，或直接把 URL 與 Key 填入 [`js/sync-config.js`](./js/sync-config.js) 後推上 GitHub。

---

## 在 iPhone 上安裝為 App
1. 於 GitHub 專案開啟 **Settings → Pages → Build and deployment → Branch 選 `main`（`/ (root)`）→ Save**。
2. 用 iPhone **Safari** 開啟產生的 `https://<你的帳號>.github.io/<專案名稱>/` 網址。
3. 點擊 Safari 下方 **分享 → 加入主畫面** 即可像原生 iOS App 一樣使用。
