(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  global.TimeBlock = TF;

  const APP_NAME = '時間方塊';
  const APP_VERSION = 'v2.1.1';
  const APP_BUILD_DATE = '2026-11-20';
  const MINUTES_PER_DAY = 1440;
  const SNAP_MINUTES = 15;
  const DEFAULT_DURATION = 60;
  const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  /**
   * 詳細版本更新紀錄（包含功能更新與代碼層級 Commit / 檔案 / 函式變更明細）
   */
  const VERSION_HISTORY = [
    {
      version: 'v2.1.1',
      commit: 'HEAD',
      date: '2026-11-20',
      tag: '最新正式版',
      isCurrent: true,
      title: '取消電腦版類別橫向拉桿（改為自動換行）與修正手機版頂部統計按鈕超出畫面',
      changes: [
        '電腦版：取消左側活動類別篩選區的左右橫向拉桿（Scrollbar），改為自動換行多列平鋪，所有類別一目了然直接點擊',
        '手機版：最佳化頂部 Header 響應式寬度與間距（精簡手機端品牌文字與按鈕內距），確保右上角「📊 統計」與「🌙 主題」按鈕完整顯示不超出畫面',
        '新增專案根目錄 CHANGELOG.md 與版本面板內的「💻 代碼與架構層級變更明細」折疊區塊'
      ],
      files: ['css/styles.css', 'index.html', 'js/utils.js', 'sw.js', 'manifest.json', 'CHANGELOG.md'],
      codeDetails: [
        'CSS 排版修正：將 .category-filters 由 overflow-x: auto 改為 flex-wrap: wrap; overflow: visible; 並移除 ::-webkit-scrollbar 規則',
        '響應式 Header 修正：於 @media (max-width: 960px) 與 (max-width: 480px) 設定 .app-header { max-width: 100vw; overflow: hidden; }，隱藏手機端 .brand-text 並收緊 .date-display-btn 與 .icon-btn 寬度'
      ]
    },
    {
      version: 'v2.1.0',
      commit: 'fe2ccd1',
      date: '2026-11-20',
      tag: '功能升級版',
      isCurrent: false,
      title: '模板 24H 時間軸拖拽編輯、複數可支配時段與介面精簡美化',
      changes: [
        '一日模板支援「24H 時間軸實境拖拽編輯模式」：可像平時編輯時間列表一樣，直接從 Dock 拖拽活動方塊、拉動邊緣調整時長',
        '可支配時間升級支援「複數段時間」自由組合（可新增、修改、刪除多段時段並自動合併重疊區間），移除舊有預設按鈕晶片',
        '刪除作用重複的「選日期」按鈕，統一由頂部日期導覽列開啟日曆，畫面更純粹',
        '全面整理與美化電腦版三欄與手機版底部 Dock 排版、字距與卡片視覺層次'
      ],
      files: ['js/utils.js', 'js/store.js', 'js/timeline.js', 'js/ui.js', 'js/app.js', 'index.html', 'css/styles.css', 'CHANGELOG.md'],
      codeDetails: [
        'Store 狀態擴充：新增 editingDayTemplate 執行期物件與 startEditingDayTemplate() / saveEditingDayTemplate() / cancelEditingDayTemplate()，將 getBlocks() / addBlock() / updateBlock() / deleteBlock() 自動路由至模板拖拽編輯模式',
        'Schema 升級：settings.discretionaryWindows 改為 Array<{id, start, end}> 結構，新增 normalizeDiscretionaryWindows() 向下相容舊資料與 add/update/removeDiscretionaryWindow() 方法',
        '演算法新增：於 js/utils.js 新增 mergeTimeIntervals(windows) 區間合併演算法，於 js/ui.js 新增 calcBlockDiscretionaryOverlap() 計算方塊與多段可支配時間的精確交集',
        'DOM 與 UI 重構：於 index.html 新增 #templateEditorBanner 拖拽編輯工具列，移除重複的 [data-open-calendar] 快捷列按鈕與 #dayTplBlockModal 冗餘結構'
      ]
    },
    {
      version: 'v2.0.0',
      commit: 'af3ab64',
      date: '2026-11-20',
      tag: '全新重構版',
      isCurrent: false,
      title: '時間方塊 2.0 全新架構重做與完整版本紀錄系統',
      changes: [
        '全新打造全域事件委派（Event Delegation）架構，日曆與 Dock 100% 零延遲響應',
        '全新純淨 Modal 視窗引擎：關閉時完全脫離渲染樹（display: none），根除透明遮罩阻擋點擊問題',
        '新增「版本紀錄與系統資訊」專屬面板，詳細記錄歷代版本號與更新內容',
        '完整實作「日 / 週 / 月」三週期統計，區分「全天 24H」與「可支配時間」雙維度分析',
        '電腦版與手機版活動方塊庫全面支援「輕點即智慧排入時間表」與「拖曳放置」雙模式'
      ],
      files: ['index.html', 'css/styles.css', 'js/utils.js', 'js/store.js', 'js/timeline.js', 'js/dnd.js', 'js/ui.js', 'js/app.js', 'sw.js'],
      codeDetails: [
        '修復致命初始化中斷 Bug：同步 Store.selectedDate 與 Store.state.selectedDate，解決舊版 parseDateKey(undefined) 拋出 TypeError 導致後續 addEventListener 中斷的問題',
        '獨立儲存空間：切換 STORAGE_KEY = "timeblock_24h_v2_data"，並於 index.html <head> 內嵌版本比對腳本自動清理舊版 Cache Storage',
        '錯誤隔離架構：於 js/app.js 最優先註冊 document 全域 click 委派；於 js/ui.js 的 renderAll() 對所有子渲染函式加上獨立 try / catch 保護'
      ]
    },
    {
      version: 'v1.3.0 ~ v1.3.4',
      commit: 'd5c95d2..ea30842',
      date: '2026-11-20',
      tag: '功能擴充與修補',
      isCurrent: false,
      title: '一日模板時段編輯升級與觸控交互修正',
      changes: [
        '升級一日模板編輯介面，支援管理模板內的各個活動時段',
        '新增活動方塊點擊智慧排入（Smart Click-to-Add）功能',
        '調整行動版響應式標頭與底部 Dock 操作列排版'
      ],
      files: ['js/ui.js', 'js/dnd.js', 'css/styles.css'],
      codeDetails: [
        '於 js/ui.js 實作 quickAddTemplateToTimeline(templateId) 空檔搜尋與碰撞檢測演算法',
        '於 js/dnd.js 區分觸控輕點（Tap）與長按拖曳（240ms longPressTimer）'
      ]
    },
    {
      version: 'v1.2.0 ~ v1.2.2',
      commit: 'd481d06..7a4763c',
      date: '2026-11-20',
      tag: '品牌重塑與統計',
      isCurrent: false,
      title: '正式更名為「時間方塊」並加入週/月統計與版本顯示',
      changes: [
        '應用程式正式更名為「時間方塊（TimeBlock 24H）」',
        '於網頁右下角與側邊欄新增常駐版本號顯示徽章',
        '建立日、週、月時間分配統計圖表，支援預設模板編輯與刪除'
      ],
      files: ['js/utils.js', 'js/ui.js', 'index.html', 'css/styles.css'],
      codeDetails: [
        '於 js/utils.js 新增 APP_NAME、APP_VERSION、getWeekDates()、getMonthDates()',
        '於 index.html 新增 #cornerVersionBadge 常駐版本顯示元件'
      ]
    },
    {
      version: 'v1.1.0',
      commit: 'df7dbc8',
      date: '2026-11-19',
      tag: '功能更新',
      isCurrent: false,
      title: '新增一日活動模板、可支配時間統計、手機日曆與 24H 全覽',
      changes: [
        '新增一日活動模板庫（常規工作日、週末充電日），支援一鍵套入新的一天',
        '統計面板分為「全天 24 小時」與「可支配時間」',
        '新增手機與電腦共用的月份日曆選擇器，並支援時間軸「全覽（Fit 24H）」模式'
      ],
      files: ['js/store.js', 'js/timeline.js', 'js/ui.js'],
      codeDetails: [
        '於 js/store.js 新增 dayTemplates 狀態與 applyDayTemplate(id, { overwrite })',
        '於 js/timeline.js 新增 getHourHeight() 對 "fit" 全覽模式的動態高度計算'
      ]
    },
    {
      version: 'v1.0.0',
      commit: 'initial',
      date: '2026-11-18',
      tag: '初代發布',
      isCurrent: false,
      title: '24H 時間方塊管理核心與雲端同步',
      changes: [
        '建立 24 小時（15 分鐘刻度）視覺化時間軸與活動方塊拖曳排程',
        '支援自訂活動類別、色彩、圖示與常用活動方塊模板',
        '支援 JSON 備份匯出/匯入與 Firebase 跨裝置即時雲端同步'
      ],
      files: ['index.html', 'css/styles.css', 'js/utils.js', 'js/store.js', 'js/timeline.js', 'js/dnd.js', 'js/ui.js', 'js/sync.js', 'js/app.js'],
      codeDetails: [
        '建立 TimeFlow 全域命名空間、computeBlockLayout() 重疊方塊並排演算法與 CloudSyncManager 同步引擎'
      ]
    }
  ];

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function clamp(val, min, max) {
    const n = Number(val);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function snapMinutes(minutes, step = SNAP_MINUTES) {
    const n = Number(minutes) || 0;
    return Math.round(n / step) * step;
  }

  function formatTime(totalMinutes) {
    const clamped = clamp(Math.round(Number(totalMinutes) || 0), 0, MINUTES_PER_DAY);
    const hours = Math.floor(clamped / 60);
    const mins = clamped % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  function formatDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0 && m > 0) return `${h}小時${m}分`;
    if (h > 0) return `${h}小時`;
    return `${m}分鐘`;
  }

  function formatHoursDecimal(minutes) {
    const total = Math.max(0, Number(minutes) || 0);
    const hrs = total / 60;
    return Number.isInteger(hrs) ? `${hrs}h` : `${hrs.toFixed(1).replace(/\.0$/, '')}h`;
  }

  function toDateKey(dateObj) {
    const dt = dateObj instanceof Date && !Number.isNaN(dateObj.getTime()) ? dateObj : new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(dateKey) {
    if (!dateKey || typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(dateKey, delta) {
    const dt = parseDateKey(dateKey);
    dt.setDate(dt.getDate() + Number(delta || 0));
    return toDateKey(dt);
  }

  function formatDateDisplay(dateKey) {
    const safeKey = dateKey && typeof dateKey === 'string' ? dateKey : toDateKey(new Date());
    const dt = parseDateKey(safeKey);
    const todayKey = toDateKey(new Date());
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    const weekday = WEEKDAYS[dt.getDay()] || '';
    const isToday = safeKey === todayKey;
    return {
      dateKey: safeKey,
      short: `${month}/${day} ${weekday}`,
      full: `${dt.getFullYear()}年${month}月${day}日 ${weekday}`,
      weekday,
      isToday
    };
  }

  function getWeekDates(dateKey) {
    const dt = parseDateKey(dateKey);
    const day = dt.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(dt);
    monday.setDate(dt.getDate() + diffToMonday);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(toDateKey(d));
    }
    return dates;
  }

  function formatWeekRangeDisplay(dateKey) {
    const dates = getWeekDates(dateKey);
    const startDt = parseDateKey(dates[0]);
    const endDt = parseDateKey(dates[6]);
    return `${startDt.getMonth() + 1}/${startDt.getDate()} (週一) – ${endDt.getMonth() + 1}/${endDt.getDate()} (週日)`;
  }

  function getMonthDates(dateKey) {
    const dt = parseDateKey(dateKey);
    const y = dt.getFullYear();
    const m = dt.getMonth();
    const totalDays = new Date(y, m + 1, 0).getDate();
    const dates = [];
    for (let d = 1; d <= totalDays; d++) {
      dates.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return dates;
  }

  function formatMonthRangeDisplay(dateKey) {
    const dt = parseDateKey(dateKey);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const totalDays = new Date(y, m, 0).getDate();
    return `${y} 年 ${m} 月（共 ${totalDays} 天）`;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hexToRgba(hex, alpha) {
    const clean = (hex || '#3B82F6').replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16) || 59;
    const g = parseInt(full.slice(2, 4), 16) || 130;
    const b = parseInt(full.slice(4, 6), 16) || 246;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * 將複數段可支配時間區間合併（消除重疊部分），以便精準計算總長度與交集
   * @param {Array<{start: number, end: number}>} windows
   * @returns {Array<{start: number, end: number}>}
   */
  function mergeTimeIntervals(windows) {
    if (!Array.isArray(windows) || windows.length === 0) {
      return [{ start: 1140, end: 1380 }];
    }
    const valid = windows
      .map((w) => {
        const s = clamp(Number(w.start) || 0, 0, MINUTES_PER_DAY - SNAP_MINUTES);
        const e = clamp(Number(w.end) || (s + 60), s + SNAP_MINUTES, MINUTES_PER_DAY);
        return { start: s, end: e };
      })
      .filter((w) => w.end > w.start)
      .sort((a, b) => a.start - b.start);

    if (valid.length === 0) return [{ start: 1140, end: 1380 }];

    const merged = [valid[0]];
    for (let i = 1; i < valid.length; i++) {
      const prev = merged[merged.length - 1];
      const cur = valid[i];
      if (cur.start <= prev.end) {
        prev.end = Math.max(prev.end, cur.end);
      } else {
        merged.push({ ...cur });
      }
    }
    return merged;
  }

  /**
   * 計算重疊時間方塊的並排欄位（Side-by-side layout）
   */
  function computeBlockLayout(blocks) {
    const layout = new Map();
    if (!blocks || blocks.length === 0) return layout;

    const sorted = [...blocks].sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return b.durationMinutes - a.durationMinutes;
    });

    const clusters = [];
    let currentCluster = [];
    let clusterEnd = -1;

    for (const block of sorted) {
      const start = block.startMinutes;
      const end = start + block.durationMinutes;
      if (currentCluster.length === 0 || start < clusterEnd) {
        currentCluster.push(block);
        clusterEnd = Math.max(clusterEnd, end);
      } else {
        clusters.push(currentCluster);
        currentCluster = [block];
        clusterEnd = end;
      }
    }
    if (currentCluster.length > 0) clusters.push(currentCluster);

    for (const cluster of clusters) {
      const colEnds = [];
      const assigned = [];

      for (const block of cluster) {
        const start = block.startMinutes;
        const end = start + block.durationMinutes;
        let colIndex = colEnds.findIndex((endTime) => endTime <= start);
        if (colIndex === -1) {
          colIndex = colEnds.length;
          colEnds.push(end);
        } else {
          colEnds[colIndex] = end;
        }
        assigned.push({ id: block.id, col: colIndex });
      }

      const totalCols = colEnds.length;
      for (const item of assigned) {
        layout.set(item.id, { col: item.col, totalCols });
      }
    }

    return layout;
  }

  TF.APP_NAME = APP_NAME;
  TF.VERSION = APP_VERSION;
  TF.BUILD_DATE = APP_BUILD_DATE;
  TF.VERSION_HISTORY = VERSION_HISTORY;

  TF.utils = {
    APP_NAME,
    APP_VERSION,
    APP_BUILD_DATE,
    VERSION_HISTORY,
    MINUTES_PER_DAY,
    SNAP_MINUTES,
    DEFAULT_DURATION,
    uid,
    clamp,
    snapMinutes,
    formatTime,
    formatDuration,
    formatHoursDecimal,
    toDateKey,
    parseDateKey,
    addDays,
    formatDateDisplay,
    getWeekDates,
    formatWeekRangeDisplay,
    getMonthDates,
    formatMonthRangeDisplay,
    escapeHtml,
    hexToRgba,
    mergeTimeIntervals,
    computeBlockLayout
  };
})(window);
