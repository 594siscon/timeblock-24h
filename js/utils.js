(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  global.TimeBlock = TF; // Alias for 時間方塊

  const APP_NAME = '時間方塊';
  const APP_VERSION = 'v1.2.2';
  const MINUTES_PER_DAY = 1440;
  const SNAP_MINUTES = 15;
  const DEFAULT_DURATION = 60;
  const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function snapMinutes(minutes, step = SNAP_MINUTES) {
    return Math.round(minutes / step) * step;
  }

  function formatTime(totalMinutes) {
    const clamped = clamp(Math.round(totalMinutes), 0, MINUTES_PER_DAY);
    const hours = Math.floor(clamped / 60);
    const mins = clamped % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}小時${m}分`;
    if (h > 0) return `${h}小時`;
    return `${m}分鐘`;
  }

  function formatHoursDecimal(minutes) {
    const hrs = minutes / 60;
    return Number.isInteger(hrs) ? `${hrs}h` : `${hrs.toFixed(2).replace(/\.?0+$/, '')}h`;
  }

  function toDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(dateKey, delta) {
    const dt = parseDateKey(dateKey);
    dt.setDate(dt.getDate() + delta);
    return toDateKey(dt);
  }

  function formatDateDisplay(dateKey) {
    const dt = parseDateKey(dateKey);
    const todayKey = toDateKey(new Date());
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    const weekday = WEEKDAYS[dt.getDay()];
    const isToday = dateKey === todayKey;
    return {
      short: `${month}/${day} ${weekday}`,
      full: `${dt.getFullYear()}年${month}月${day}日 ${weekday}`,
      weekday,
      isToday
    };
  }

  function getWeekDates(dateKey) {
    const dt = parseDateKey(dateKey);
    const day = dt.getDay(); // 0 is Sun, 1 is Mon...
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
    const sMonth = startDt.getMonth() + 1;
    const sDay = startDt.getDate();
    const eMonth = endDt.getMonth() + 1;
    const eDay = endDt.getDate();
    return `${sMonth}/${sDay} (週一) – ${eMonth}/${eDay} (週日)`;
  }

  function getMonthDates(dateKey) {
    const dt = parseDateKey(dateKey);
    const y = dt.getFullYear();
    const m = dt.getMonth(); // 0-based
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
    return `${y} 年 ${m} 月（全月 ${totalDays} 天）`;
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
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Compute side-by-side column positions for overlapping blocks so nothing gets hidden.
   * Returns a Map of block.id -> { col, totalCols }
   */
  function computeBlockLayout(blocks) {
    const layout = new Map();
    if (!blocks || blocks.length === 0) return layout;

    const sorted = [...blocks].sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return b.durationMinutes - a.durationMinutes;
    });

    // Group into connected overlapping clusters
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

  TF.utils = {
    APP_NAME,
    APP_VERSION,
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
