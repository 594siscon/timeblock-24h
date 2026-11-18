# 時光方塊 · 24H 時間管理 App

電腦與 iPhone（iOS Safari PWA）共用的 24 小時拖曳式時間區塊管理應用，支援 **Firebase（Google 帳號登入 + Firestore 即時自動同步）**。

## 核心功能
- **電腦與 iPhone 共用（PWA）**：單一程式碼庫，支援 iPhone Safari「加入主畫面」全螢幕體驗與離線快取。
- **24 小時時間軸**：完整顯示 `00:00`–`24:00`（96 個 15 分鐘刻度），含即時時間紅線與三段高度密度切換。
- **拖曳填入方塊**：從左側欄（電腦）或底部活動列（iPhone）拖曳活動方塊填入時間表，自動吸附 15 分鐘刻度。
- **預設 1 小時、15 分鐘級距調整**：拖曳方塊上方或下方邊緣拉桿，即可以 **15 分鐘**為單位調整高度與起訖時間。
- **活動與分類管理**：支援自訂活動類別（名稱、顏色、圖示）、常用活動模板與每日 24 小時分配統計。
- **Google 帳號即時自動同步**：串接免費 **Firebase**（Google Auth + Firestore `onSnapshot`），免設 Google Cloud OAuth 密鑰，任一裝置修改排程，另一台裝置立即更新。

---

## 啟用「Firebase Google 帳號即時自動同步」（免費，約 2 分鐘）

### 步驟 1：建立 Firebase 免費專案
1. 前往 [https://console.firebase.google.com](https://console.firebase.google.com) → 點 **建立專案**（Google Analytics 可關閉以加快建立）。

### 步驟 2：一鍵開啟 Google 登入（免手動填 OAuth 密鑰！）
1. 左側點 **Build → Authentication** → 點 **開始使用**。
2. 在 **Sign-in method** 點 **Google** → 開啟開關 → 選取專案支援信箱 → 按 **儲存**。
3. 切到上方 **Settings → Authorized domains** → 按 **Add domain** → 加入 `594siscon.github.io`。

### 步驟 3：建立 Firestore 資料庫與安全規則
1. 左側點 **Build → Firestore Database** → 點 **建立資料庫**（位置選 `asia-east1 (台灣)`，先選「測試模式」或「正式版模式」皆可）。
2. 建立完成後切到上方 **規則（Rules）** 分頁，貼上專案內的 [`firestore.rules`](./firestore.rules) 全部內容 → 按 **發佈**。

### 步驟 4：複製 `firebaseConfig`
1. 點左上角齒輪 **專案設定 → 一般** → 下方「您的應用程式」點 **`</>`（網頁）** 註冊應用程式。
2. 複製顯示的 `firebaseConfig` 程式碼：
   - 直接在 App 右上角點 **「雲端同步」** → 展開 **「⚙️ Firebase 連線設定」** → 整段貼上儲存；
   - 或填入 [`js/sync-config.js`](./js/sync-config.js) 推上 GitHub，電腦與 iPhone 開啟網頁就能直接一鍵 Google 登入！

---

## 在 iPhone 上安裝為 App
1. 於 GitHub 專案開啟 **Settings → Pages → Build and deployment → Branch 選 `main`（`/ (root)`）→ Save**。
2. 用 iPhone **Safari** 開啟 `https://594siscon.github.io/timeblock-24h/`。
3. 點擊 Safari 下方 **分享 → 加入主畫面** 即可像原生 iOS App 一樣使用。
