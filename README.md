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

## 啟用「Google 帳號電腦 ↔ iPhone 即時自動同步」（免費 Supabase）

### 步驟 1：建立 Supabase 免費專案與資料表
1. 前往 [https://supabase.com](https://supabase.com) 登入並點擊 **New Project** 建立免費專案。
2. 進入左側 **SQL Editor**，將專案內的 [`supabase_setup.sql`](./supabase_setup.sql) 全部貼上並按 **Run**。

### 步驟 2：開啟 Google 登入（OAuth）
1. 在 Supabase 左側點 **Authentication → Sign In / Providers → Google**，打開 **Enable Sign in with Google**，並複製畫面上顯示的 **Callback URL**（格式為 `https://<你的專案ID>.supabase.co/auth/v1/callback`）。
2. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)：
   - 建立或選擇專案 → 點 **建立憑證 → OAuth 用戶端 ID**（若首次使用，先快速完成「OAuth 同意畫面」，選 External 即可）。
   - 應用程式類型選 **網頁應用程式（Web application）**。
   - **已授權的重新導向 URI** 貼上剛剛 Supabase 給的 **Callback URL**，按建立。
   - 複製產生的 **用戶端編號（Client ID）** 與 **用戶端密鑰（Client Secret）**，貼回 Supabase 的 Google Provider 設定並 **Save**。
3. 在 Supabase 左側點 **Authentication → URL Configuration**：
   - **Site URL** 填入你的 GitHub Pages 網址：`https://594siscon.github.io/timeblock-24h/`
   - **Redirect URLs** 加入 `https://594siscon.github.io/timeblock-24h/**`（若也會在電腦本機測試，可一併加上 `http://localhost:8080/**`）並 **Save**。

### 步驟 3：填入 Supabase URL 與 Key
1. 到 Supabase **Project Settings → API** 複製 **Project URL** 與 **Publishable / anon key**。
2. 在 App 右上角點 **「雲端同步」** → 展開 **「⚙️ Supabase 連線設定」** → 貼上並儲存 → 點 **「使用 Google 帳號登入並即時同步」** 即可！
   - 也可以把 URL 與 Key 填入 [`js/sync-config.js`](./js/sync-config.js) 推上 GitHub，電腦與 iPhone 開啟網頁就能直接一鍵 Google 登入！

---

## 在 iPhone 上安裝為 App
1. 於 GitHub 專案開啟 **Settings → Pages → Build and deployment → Branch 選 `main`（`/ (root)`）→ Save**。
2. 用 iPhone **Safari** 開啟產生的 `https://<你的帳號>.github.io/<專案名稱>/` 網址。
3. 點擊 Safari 下方 **分享 → 加入主畫面** 即可像原生 iOS App 一樣使用。
