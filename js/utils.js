(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  global.TimeBlock = TF;

  const APP_NAME = '時間方塊';
  const APP_VERSION = 'v2.0.0';
  const APP_BUILD_DATE = '2026-11-20';
  const MINUTES_PER_DAY = 1440;
  const SNAP_MINUTES = 15;
  const DEFAULT_DURATION = 60;
  const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  /**
   * 詳細版本更新紀錄（Changelog）
   */
  const VERSION_HISTORY = [
    {
      version: 'v2.0.0',
      date: '2026-11-20',
      tag: '全新重構版',
      isCurrent: true,
      title: '時間方塊 2.0 全新架構重做與完整版本紀錄系統',
      changes: [
        '全新打造全域事件委派（Event Delegation）架構，電腦版與手機版日曆、底部 Dock 100% 零延遲響應',
        '全新純淨 Modal 視窗引擎：關閉時完全脫離渲染樹（display: none），徹底根除透明遮罩阻擋點擊問題',
        '新增「版本紀錄與系統資訊」專屬面板，詳細記錄歷代版本號、更新內容與快取狀態',
        '一日活動模板編輯器採用與主時間表完全一致的「活動方塊編輯介面」，支援時段清單直覺增刪改',
        '完整實作「日 / 週 / 月」三週期統計，並區分「全天 24H」與「自訂可支配時間」雙維度分析',
        '電腦版與手機版活動方塊庫全面支援「輕點即智慧排入時間表」與「拖曳放置」雙模式',
        '啟用全新獨立資料儲存區（timeblock_24h_v2_data）與自動清理舊版 Service Worker 快取機制'
      ]
    },
    {
      version: 'v1.3.0 ~ v1.3.4',
      date: '2026-11-20',
      tag: '功能擴充與修補',
      isCurrent: false,
      title: '一日模板時段編輯升級與觸控交互修正',
      changes: [
        '升級一日模板編輯介面，支援以時間列表方式管理模板內的各個活動時段',
        '新增活動方塊點擊智慧排入（Smart Click-to-Add）功能',
        '調整行動版響應式標頭與底部 Dock 操作列排版'
      ]
    },
    {
      version: 'v1.2.0 ~ v1.2.2',
      date: '2026-11-20',
      tag: '品牌重塑與統計',
      isCurrent: false,
      title: '正式更名為「時間方塊」並加入週/月統計與版本顯示',
      changes: [
        '應用程式正式更名為「時間方塊（TimeBlock 24H）」',
        '於網頁右下角與側邊欄新增常駐版本號顯示徽章',
        '建立日、週、月時間分配統計圖表，支援預設模板編輯與刪除'
      ]
    },
    {
      version: 'v1.1.0',
      date: '2026-11-19',
      tag: '功能更新',
      isCurrent: false,
      title: '新增一日活動模板、可支配時間統計、手機日曆與 24H 全覽',
      changes: [
        '新增一日活動模板庫（常規工作日、週末充電日），支援一鍵套入新的一天',
        '統計面板分為「全天 24 小時」與「可支配時間（自訂時段）」',
        '新增手機與電腦共用的月份日曆選擇器，並支援時間軸「全覽（Fit 24H）」模式'
      ]
    },
    {
      version: 'v1.0.0',
      date: '2026-11-18',
      tag: '初代發布',
      isCurrent: false,
      title: '24H 時間方塊管理核心與雲端同步',
      changes: [
        '建立 24 小時（15 分鐘刻度）視覺化時間軸與活動方塊拖曳排程',
        '支援自訂活動類別、色彩、圖示與常用活動方塊模板',
        '支援 JSON 備份匯出/匯入與 Firebase 跨裝置即時雲端同步'
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
    computeBlockLayout
  };
})(window);
