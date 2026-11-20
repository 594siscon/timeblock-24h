# 時間方塊 (TimeBlock 24H) · 代碼層級版本變更日誌 (CHANGELOG)

本文件從**代碼與架構層面**詳細記錄「時間方塊」每一個版本的檔案修改、核心函式增刪、資料結構（Schema）演進與 Git Commit 紀錄。

---

## [v2.1.1] - 2026-11-20
### 核心主題：取消電腦版類別橫向拉桿、修正手機版頂部統計按鈕超出畫面、補齊代碼級變更面板

#### 1. 檔案與樣式級別變更（File & CSS Diffs）
- **[css/styles.css](file:///c:/Users/user/Desktop/文件/時間管理app/css/styles.css)**
  - `.category-filters`：移除 `overflow-x: auto` 與 `::-webkit-scrollbar` 橫向捲軸樣式，改為 `flex-wrap: wrap; overflow: visible;`，讓所有類別標籤自動換行完整呈現。
  - `@media (max-width: 960px)` & `@media (max-width: 480px)`：
    - 為 `.app-header` 設定 `width: 100%; max-width: 100vw; overflow: hidden; padding: 0 6px; gap: 3px;`。
    - 手機版隱藏 `.brand-text`（僅保留品牌圖示 `.brand-logo`），並將 `.icon-btn` 縮小為 `27px × 27px`、`.date-display-btn` 最小寬度收緊為 `72px`，確保右上角的 `#btnMobileStats`（📊 統計）與 `#btnThemeToggle`（🌙 主題）在任何手機螢幕寬度下皆完整顯示於畫面內。
- **[js/utils.js](file:///c:/Users/user/Desktop/文件/時間管理app/js/utils.js) & [js/ui.js](file:///c:/Users/user/Desktop/文件/時間管理app/js/ui.js)**
  - `APP_VERSION` 升級為 `'v2.1.1'`。
  - `VERSION_HISTORY` 每個版本新增 `commit`、`files`、`codeDetails` 欄位，並於 `renderVersionChangelog()` 渲染「💻 代碼與架構層級變更明細」折疊區塊。

---

## [v2.1.0] - 2026-11-20 (Commit: `fe2ccd1`)
### 核心主題：一日模板 24H 時間軸實境拖拽編輯、複數段可支配時間架構、介面精簡

#### 1. 資料結構（State Schema）變更
- **`settings.discretionaryWindows` (`Array<{id, start, end}>`)**：
  - 取代舊版單一時段欄位 `discretionaryStart` / `discretionaryEnd`。
  - 支援任意數量的時間區間組合（預設：`dw_morning` `07:00-08:30`、`dw_evening` `19:00-23:00`），並在 `Store.normalizeDiscretionaryWindows()` 中向下相容舊格式自動轉換。
- **`Store.editingDayTemplate` (`Object | null`)**：
  - 新增執行期狀態 `{ id, name, icon, description, blocks: [...] }`，用於標記當前 24H 時間軸是否處於「模板實境拖拽編輯模式」。

#### 2. 檔案與函式級別變更（File & Function Diffs）
- **[js/utils.js](file:///c:/Users/user/Desktop/文件/時間管理app/js/utils.js)**
  - `APP_VERSION` 更新為 `'v2.1.0'`。
  - 新增 `mergeTimeIntervals(windows)`：將複數段可支配時間排序並合併重疊區間（Interval Merging Algorithm），確保總時數與交集計算不重複。
  - 更新 `VERSION_HISTORY` 結構，新增 `codeChanges`（涉及檔案、函式與架構明細）。
- **[js/store.js](file:///c:/Users/user/Desktop/文件/時間管理app/js/store.js)**
  - 新增模板時間軸編輯方法：`isEditingDayTemplate()`、`getEditingDayTemplate()`、`startEditingDayTemplate(tplId, initMode)`、`updateEditingDayTemplateMeta(patch)`、`loadCurrentDayIntoEditingTemplate()`、`saveEditingDayTemplate()`、`cancelEditingDayTemplate()`。
  - 改造 `getBlocks()`、`getBlockById()`、`addBlock()`、`updateBlock()`、`deleteBlock()`、`duplicateBlock()`、`clearCurrentDay()`：當 `this.editingDayTemplate !== null` 時，自動將所有拖拽、點擊排入與縮放操作路由至模板的 `blocks` 陣列。
  - 新增 `getDayBlocksForStats(dateKey)`：確保右側統計面板在模板編輯模式下仍穩定讀取日常排程資料。
  - 新增複數可支配時段 CRUD：`getDiscretionaryWindows()`、`addDiscretionaryWindow()`、`updateDiscretionaryWindow(id, start, end)`、`removeDiscretionaryWindow(id)`。
- **[js/timeline.js](file:///c:/Users/user/Desktop/文件/時間管理app/js/timeline.js)**
  - 修改 `updateNowLine()`：當 `TF.store.isEditingDayTemplate()` 為 `true` 時自動隱藏當日紅線。
- **[js/ui.js](file:///c:/Users/user/Desktop/文件/時間管理app/js/ui.js)**
  - 新增 `renderTemplateEditorBanner()`：控制時間軸頂部 `#templateEditorBanner` 的顯示、即時時段計數與雙向表單綁定。
  - 重構 `renderStats()`：新增 `calcBlockDiscretionaryOverlap(block)` 針對合併後的複數區間計算交集；移除舊版 `.disc-presets-row` 預設晶片，改為動態渲染 `.disc-window-row` 複數時段清單。
  - 移除舊版彈窗式模板時段表單方法（`renderDayTemplateScheduleEditor`、`openDayTplBlockModal`），統一導向主時間軸拖拽編輯。
- **[index.html](file:///c:/Users/user/Desktop/文件/時間管理app/index.html) & [css/styles.css](file:///c:/Users/user/Desktop/文件/時間管理app/css/styles.css)**
  - 移除日常模式下冗餘的 `.timeline-Quickbar` 與重複的「📅 選日期」按鈕。
  - 新增 `#templateEditorBanner`（`.tpl-editor-banner`）紫色系編輯工具列與 `.disc-windows-list` 複數時段控制列樣式。

---

## [v2.0.0] - 2026-11-20 (Commit: `af3ab64`)
### 核心主題：全新 V2 核心架構重做、全域事件委派、獨立儲存區与版本紀錄系統

#### 1. 根本 Bug 修復與架構重設
- **修復初始化中斷漏洞**：舊版 `ui.js` 在 `renderStats()` 中讀取 `TF.store.state.selectedDate` 得到 `undefined`，導致 `parseDateKey(undefined)` 拋出 `TypeError: Cannot read properties of undefined (reading 'split')`，中斷了後續所有按鈕的 `addEventListener`。
- **全新儲存空間**：`STORAGE_KEY` 升級為 `'timeblock_24h_v2_data'`，並在 `Store` 中確保 `this.selectedDate` 與 `this.state.selectedDate` 永遠雙向同步。

#### 2. 檔案與函式級別變更
- **[js/app.js](file:///c:/Users/user/Desktop/文件/時間管理app/js/app.js)**
  - 改用最優先的 `document.addEventListener('click', ...)` 全域事件委派處理 `[data-open-calendar]`、`[data-open-day-templates]`、`[data-open-categories]`、`[data-add-template]`、`[data-open-stats]`、`[data-open-version]`、`[data-close-modal]`。
- **[js/ui.js](file:///c:/Users/user/Desktop/文件/時間管理app/js/ui.js)**
  - `renderAll()` 內所有子渲染函式均以獨立 `try { ... } catch (e)` 錯誤隔離包裹。
  - `openModal()` / `closeModal()` 改為純 `.is-open` class 切換，移除 `setTimeout` 與 `hidden` 混用。
  - 新增 `openVersionModal()` 與 `renderVersionChangelog()`。
- **[index.html](file:///c:/Users/user/Desktop/文件/時間管理app/index.html) & [sw.js](file:///c:/Users/user/Desktop/文件/時間管理app/sw.js)**
  - `<head>` 加入內嵌版本比對腳本，版本號變更時自動清理舊版 Cache Storage。

---

## [v1.3.0 ~ v1.3.4] - 2026-11-20 (Commits: `d5c95d2`, `0f3b298`, `c583f39`, `ea30842`)
- `js/ui.js`：新增 `quickAddTemplateToTimeline(templateId)` 智慧點擊排入時間表演算法。
- `js/dnd.js`：區分觸控輕點（Tap）與長按拖曳（Long-press Drag 240ms）。

## [v1.2.0 ~ v1.2.2] - 2026-11-20 (Commits: `d481d06`, `7a4763c`)
- `js/utils.js`：新增 `getWeekDates()`、`getMonthDates()`、`formatWeekRangeDisplay()`、`formatMonthRangeDisplay()`，更名為「時間方塊」。
- `index.html`：新增右下角 `#cornerVersionBadge` 版本號徽章。

## [v1.1.0] - 2026-11-19
- `js/store.js`：新增 `dayTemplates` 資料結構與 `applyDayTemplate()`。
- `js/timeline.js`：新增 `hourHeight === 'fit'` 全覽 24H 自動縮放計算。

## [v1.0.0] - 2026-11-18
- 初版建立：`js/utils.js`、`js/store.js`、`js/timeline.js`、`js/dnd.js`、`js/ui.js`、`js/sync.js`、`js/app.js`。
