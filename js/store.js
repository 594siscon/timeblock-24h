(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  const {
    uid,
    toDateKey,
    addDays,
    clamp,
    snapMinutes,
    MINUTES_PER_DAY,
    SNAP_MINUTES,
    DEFAULT_DURATION
  } = TF.utils;

  // 全新 v2 獨立儲存空間，完全不受舊版殘留資料影響
  const STORAGE_KEY = 'timeblock_24h_v2_data';

  const PRESET_COLORS = [
    '#2563EB', // 皇家藍
    '#7C3AED', // 魅力紫
    '#10B981', // 翡翠綠
    '#F59E0B', // 琥珀橘
    '#EC4899', // 櫻花粉
    '#EF4444', // 珊瑚紅
    '#06B6D4', // 湖水青
    '#6366F1', // 靛青藍
    '#84CC16', // 青檸綠
    '#64748B'  // 靜謐灰
  ];

  const DEFAULT_CATEGORIES = [
    { id: 'cat_work', name: '工作', color: '#2563EB', icon: '💼', sortOrder: 0 },
    { id: 'cat_study', name: '學習', color: '#7C3AED', icon: '📚', sortOrder: 1 },
    { id: 'cat_sport', name: '運動', color: '#10B981', icon: '🏃', sortOrder: 2 },
    { id: 'cat_life', name: '生活', color: '#F59E0B', icon: '🍽️', sortOrder: 3 },
    { id: 'cat_rest', name: '休息', color: '#64748B', icon: '🌙', sortOrder: 4 },
    { id: 'cat_fun', name: '娛樂', color: '#EC4899', icon: '🎮', sortOrder: 5 }
  ];

  const DEFAULT_TEMPLATES = [
    { id: 'tpl_deepwork', title: '深度工作', categoryId: 'cat_work', defaultDuration: 90 },
    { id: 'tpl_meeting', title: '會議討論', categoryId: 'cat_work', defaultDuration: 60 },
    { id: 'tpl_study', title: '閱讀學習', categoryId: 'cat_study', defaultDuration: 60 },
    { id: 'tpl_workout', title: '運動健身', categoryId: 'cat_sport', defaultDuration: 60 },
    { id: 'tpl_meal', title: '用餐時間', categoryId: 'cat_life', defaultDuration: 60 },
    { id: 'tpl_commute', title: '通勤雜務', categoryId: 'cat_life', defaultDuration: 45 },
    { id: 'tpl_nap', title: '午休放鬆', categoryId: 'cat_rest', defaultDuration: 45 },
    { id: 'tpl_sleep', title: '睡眠時間', categoryId: 'cat_rest', defaultDuration: 420 },
    { id: 'tpl_leisure', title: '休閒娛樂', categoryId: 'cat_fun', defaultDuration: 60 }
  ];

  const DEFAULT_DAY_TEMPLATES = [
    {
      id: 'dtpl_workday',
      name: '常規高效工作日',
      icon: '💼',
      description: '適合週一至週五專注工作、進修與規律作息',
      blocks: [
        { title: '夜間睡眠', categoryId: 'cat_rest', startMinutes: 0, durationMinutes: 420, note: '充足睡眠 7 小時' },
        { title: '晨間準備與早餐', categoryId: 'cat_life', startMinutes: 420, durationMinutes: 60, note: '' },
        { title: '早間通勤', categoryId: 'cat_life', startMinutes: 480, durationMinutes: 60, note: '' },
        { title: '上午核心深度工作', categoryId: 'cat_work', startMinutes: 540, durationMinutes: 180, note: '處理最重要的專案任務' },
        { title: '午餐與午休', categoryId: 'cat_life', startMinutes: 720, durationMinutes: 90, note: '' },
        { title: '下午協作與推進', categoryId: 'cat_work', startMinutes: 810, durationMinutes: 240, note: '會議、溝通與執行' },
        { title: '晚餐與休息', categoryId: 'cat_life', startMinutes: 1080, durationMinutes: 90, note: '' },
        { title: '運動健身', categoryId: 'cat_sport', startMinutes: 1170, durationMinutes: 60, note: '有氧或重訓' },
        { title: '自主閱讀與學習', categoryId: 'cat_study', startMinutes: 1260, durationMinutes: 90, note: '投資自我成長' },
        { title: '睡前放鬆與洗漱', categoryId: 'cat_rest', startMinutes: 1350, durationMinutes: 90, note: '' }
      ]
    },
    {
      id: 'dtpl_weekend',
      name: '週末充電放鬆日',
      icon: '🌿',
      description: '自然醒、運動、閱讀充電與自由娛樂時光',
      blocks: [
        { title: '充足睡眠', categoryId: 'cat_rest', startMinutes: 0, durationMinutes: 510, note: '睡到 08:30' },
        { title: '悠閒早午餐', categoryId: 'cat_life', startMinutes: 540, durationMinutes: 90, note: '' },
        { title: '戶外運動或散步', categoryId: 'cat_sport', startMinutes: 660, durationMinutes: 120, note: '' },
        { title: '咖啡廳閱讀與學習', categoryId: 'cat_study', startMinutes: 840, durationMinutes: 150, note: '' },
        { title: '聚餐與休閒娛樂', categoryId: 'cat_fun', startMinutes: 1020, durationMinutes: 210, note: '' },
        { title: '整理與睡前沉澱', categoryId: 'cat_rest', startMinutes: 1260, durationMinutes: 180, note: '' }
      ]
    },
    {
      id: 'dtpl_study',
      name: '全天衝刺進修日',
      icon: '🔥',
      description: '高強度專注學習或個人專案開發排程',
      blocks: [
        { title: '睡眠時間', categoryId: 'cat_rest', startMinutes: 0, durationMinutes: 450, note: '' },
        { title: '早餐與晨讀', categoryId: 'cat_study', startMinutes: 480, durationMinutes: 60, note: '' },
        { title: '第一階段深度學習', categoryId: 'cat_study', startMinutes: 540, durationMinutes: 180, note: '' },
        { title: '午餐與小憩', categoryId: 'cat_life', startMinutes: 720, durationMinutes: 90, note: '' },
        { title: '第二階段實作練習', categoryId: 'cat_study', startMinutes: 810, durationMinutes: 210, note: '' },
        { title: '傍晚運動舒展', categoryId: 'cat_sport', startMinutes: 1020, durationMinutes: 60, note: '' },
        { title: '晚餐時光', categoryId: 'cat_life', startMinutes: 1080, durationMinutes: 90, note: '' },
        { title: '晚間複習與總結', categoryId: 'cat_study', startMinutes: 1170, durationMinutes: 120, note: '' },
        { title: '自由娛樂與放鬆', categoryId: 'cat_fun', startMinutes: 1290, durationMinutes: 150, note: '' }
      ]
    }
  ];

  function buildInitialSampleBlocks(todayKey) {
    return {
      [todayKey]: [
        {
          id: uid('blk'),
          date: todayKey,
          title: '睡眠時間',
          categoryId: 'cat_rest',
          startMinutes: 0,
          durationMinutes: 420, // 00:00 - 07:00
          note: '規律作息'
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '早餐與晨間準備',
          categoryId: 'cat_life',
          startMinutes: 450, // 07:30 - 08:30
          durationMinutes: 60,
          note: ''
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '深度工作',
          categoryId: 'cat_work',
          startMinutes: 540, // 09:00 - 12:00
          durationMinutes: 180,
          note: '專注完成今日核心目標'
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '午餐與午休',
          categoryId: 'cat_life',
          startMinutes: 720, // 12:00 - 13:30
          durationMinutes: 90,
          note: ''
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '專案推進與會議',
          categoryId: 'cat_work',
          startMinutes: 810, // 13:30 - 17:30
          durationMinutes: 240,
          note: ''
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '運動健身',
          categoryId: 'cat_sport',
          startMinutes: 1110, // 18:30 - 19:30
          durationMinutes: 60,
          note: ''
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '閱讀學習',
          categoryId: 'cat_study',
          startMinutes: 1200, // 20:00 - 21:30
          durationMinutes: 90,
          note: '晚間可支配時間自我提升'
        }
      ]
    };
  }

  class Store {
    constructor() {
      this.listeners = new Set();
      this.undoStack = [];
      this.selectedDate = toDateKey(new Date());
      this.selectedCategoryFilter = 'all';
      this.selectedBlockId = null;
      this.state = this.load();
      // 確保 state.selectedDate 與 store.selectedDate 永遠同步，杜絕 undefined
      this.state.selectedDate = this.selectedDate;
    }

    getDefaultState() {
      const todayKey = toDateKey(new Date());
      return {
        selectedDate: todayKey,
        categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
        templates: DEFAULT_TEMPLATES.map((t) => ({ ...t })),
        dayTemplates: DEFAULT_DAY_TEMPLATES.map((dt) => ({
          ...dt,
          blocks: dt.blocks.map((b) => ({ ...b }))
        })),
        blocksByDate: buildInitialSampleBlocks(todayKey),
        settings: {
          theme: 'light',
          hourHeight: 60,
          statsScope: 'day', // 'day' | 'week' | 'month'
          statsMode: 'daily', // 'daily' | 'discretionary'
          discretionaryStart: 1140, // 19:00
          discretionaryEnd: 1380 // 23:00
        }
      };
    }

    load() {
      try {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.categories) && parsed.categories.length > 0 && Array.isArray(parsed.templates)) {
            return {
              selectedDate: this.selectedDate,
              categories: parsed.categories,
              templates: parsed.templates,
              dayTemplates: Array.isArray(parsed.dayTemplates)
                ? parsed.dayTemplates
                : DEFAULT_DAY_TEMPLATES.map((dt) => ({ ...dt, blocks: dt.blocks.map((b) => ({ ...b })) })),
              blocksByDate: parsed.blocksByDate && typeof parsed.blocksByDate === 'object' ? parsed.blocksByDate : {},
              settings: {
                theme: parsed.settings?.theme || 'light',
                hourHeight: parsed.settings?.hourHeight ?? 60,
                statsScope: parsed.settings?.statsScope || 'day',
                statsMode: parsed.settings?.statsMode || 'daily',
                discretionaryStart: parsed.settings?.discretionaryStart ?? 1140,
                discretionaryEnd: parsed.settings?.discretionaryEnd ?? 1380
              }
            };
          }
        }
      } catch (err) {
        console.warn('讀取儲存資料失敗，使用全新預設資料：', err);
      }

      const initial = this.getDefaultState();
      this.save(initial);
      return initial;
    }

    save(stateObj = this.state) {
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
      } catch (err) {
        console.warn('寫入本地資料失敗：', err);
      }
    }

    resetToDefault() {
      this.selectedDate = toDateKey(new Date());
      this.selectedCategoryFilter = 'all';
      this.selectedBlockId = null;
      this.undoStack = [];
      this.state = this.getDefaultState();
      this.save(this.state);
      this.notify('reset');
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify(reason = 'change') {
      this.state.selectedDate = this.selectedDate;
      this.save();
      for (const fn of this.listeners) {
        try {
          fn(reason);
        } catch (err) {
          console.error('Store listener error:', err);
        }
      }
    }

    pushUndo(label) {
      const snapshot = JSON.stringify({
        categories: this.state.categories,
        templates: this.state.templates,
        dayTemplates: this.state.dayTemplates,
        blocksByDate: this.state.blocksByDate
      });
      this.undoStack.push({ label, snapshot });
      if (this.undoStack.length > 25) this.undoStack.shift();
    }

    undo() {
      const last = this.undoStack.pop();
      if (!last) return null;
      try {
        const data = JSON.parse(last.snapshot);
        this.state.categories = data.categories;
        this.state.templates = data.templates;
        if (data.dayTemplates) this.state.dayTemplates = data.dayTemplates;
        this.state.blocksByDate = data.blocksByDate;
        this.notify('undo');
        return last.label;
      } catch (_) {
        return null;
      }
    }

    // --- Date & Settings ---
    setDate(dateKey) {
      if (!dateKey || typeof dateKey !== 'string') return;
      this.selectedDate = dateKey;
      this.state.selectedDate = dateKey;
      this.selectedBlockId = null;
      this.notify('date');
    }

    shiftDate(daysDelta) {
      this.setDate(addDays(this.selectedDate, daysDelta));
    }

    setCategoryFilter(catId) {
      this.selectedCategoryFilter = catId || 'all';
      this.notify('filter');
    }

    setSelectedBlock(blockId) {
      if (this.selectedBlockId === blockId) return;
      this.selectedBlockId = blockId;
      this.notify('selection');
    }

    setTheme(theme) {
      this.state.settings.theme = theme;
      this.notify('settings');
    }

    setHourHeight(val) {
      this.state.settings.hourHeight = val === 'fit' ? 'fit' : clamp(Number(val) || 60, 20, 120);
      this.notify('settings');
    }

    setStatsScope(scope) {
      if (!['day', 'week', 'month'].includes(scope)) return;
      this.state.settings.statsScope = scope;
      this.notify('settings');
    }

    setStatsMode(mode) {
      if (mode !== 'daily' && mode !== 'discretionary') return;
      this.state.settings.statsMode = mode;
      this.notify('settings');
    }

    setDiscretionaryWindow(startMins, endMins) {
      const s = clamp(snapMinutes(startMins), 0, MINUTES_PER_DAY - SNAP_MINUTES);
      const e = clamp(snapMinutes(endMins), s + SNAP_MINUTES, MINUTES_PER_DAY);
      this.state.settings.discretionaryStart = s;
      this.state.settings.discretionaryEnd = e;
      this.notify('settings');
    }

    hasEventsOnDate(dateKey) {
      const list = this.state.blocksByDate[dateKey];
      return Array.isArray(list) && list.length > 0;
    }

    // --- Categories ---
    getCategories() {
      return [...this.state.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    getCategoryById(id) {
      return this.state.categories.find((c) => c.id === id) || this.state.categories[0] || DEFAULT_CATEGORIES[0];
    }

    addCategory({ name, color, icon }) {
      this.pushUndo('新增類別');
      const cat = {
        id: uid('cat'),
        name: (name || '新類別').trim(),
        color: color || PRESET_COLORS[this.state.categories.length % PRESET_COLORS.length],
        icon: (icon || '🏷️').trim(),
        sortOrder: this.state.categories.length
      };
      this.state.categories.push(cat);
      this.notify('categories');
      return cat;
    }

    updateCategory(id, patch) {
      const idx = this.state.categories.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      this.pushUndo('編輯類別');
      this.state.categories[idx] = { ...this.state.categories[idx], ...patch };
      this.notify('categories');
      return this.state.categories[idx];
    }

    deleteCategory(id) {
      if (this.state.categories.length <= 1) return false;
      const idx = this.state.categories.findIndex((c) => c.id === id);
      if (idx === -1) return false;
      this.pushUndo('刪除類別');

      const fallbackId = this.state.categories.find((c) => c.id !== id).id;
      this.state.categories.splice(idx, 1);

      for (const tpl of this.state.templates) {
        if (tpl.categoryId === id) tpl.categoryId = fallbackId;
      }
      for (const dt of (this.state.dayTemplates || [])) {
        for (const b of (dt.blocks || [])) {
          if (b.categoryId === id) b.categoryId = fallbackId;
        }
      }
      for (const dateKey of Object.keys(this.state.blocksByDate)) {
        for (const blk of this.state.blocksByDate[dateKey]) {
          if (blk.categoryId === id) blk.categoryId = fallbackId;
        }
      }

      if (this.selectedCategoryFilter === id) this.selectedCategoryFilter = 'all';
      this.notify('categories');
      return true;
    }

    // --- Activity Block Templates ---
    getTemplates(categoryId = 'all') {
      if (!categoryId || categoryId === 'all') return [...this.state.templates];
      return this.state.templates.filter((t) => t.categoryId === categoryId);
    }

    getTemplateById(id) {
      return this.state.templates.find((t) => t.id === id) || null;
    }

    addTemplate({ title, categoryId, defaultDuration = DEFAULT_DURATION }) {
      this.pushUndo('新增活動方塊');
      const tpl = {
        id: uid('tpl'),
        title: (title || '新活動').trim(),
        categoryId: categoryId || this.state.categories[0]?.id,
        defaultDuration: clamp(snapMinutes(Number(defaultDuration) || DEFAULT_DURATION), SNAP_MINUTES, MINUTES_PER_DAY)
      };
      this.state.templates.push(tpl);
      this.notify('templates');
      return tpl;
    }

    updateTemplate(id, patch) {
      const idx = this.state.templates.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      this.pushUndo('更新活動方塊');
      this.state.templates[idx] = { ...this.state.templates[idx], ...patch };
      this.notify('templates');
      return this.state.templates[idx];
    }

    deleteTemplate(id) {
      const idx = this.state.templates.findIndex((t) => t.id === id);
      if (idx === -1) return false;
      this.pushUndo('刪除活動方塊');
      this.state.templates.splice(idx, 1);
      this.notify('templates');
      return true;
    }

    // --- Day Templates (一日活動模板庫) ---
    getDayTemplates() {
      if (!Array.isArray(this.state.dayTemplates)) {
        this.state.dayTemplates = DEFAULT_DAY_TEMPLATES.map((dt) => ({ ...dt }));
      }
      return [...this.state.dayTemplates];
    }

    getDayTemplateById(id) {
      return (this.state.dayTemplates || []).find((dt) => dt.id === id) || null;
    }

    createDayTemplate({ name, icon = '📅', description = '', blocks = [] }) {
      this.pushUndo('建立一日模板');
      const tpl = {
        id: uid('dtpl'),
        name: (name || '自訂一日模板').trim(),
        icon: (icon || '📅').trim(),
        description: (description || `包含 ${blocks.length} 項活動安排`).trim(),
        blocks: blocks.map((b) => ({
          title: (b.title || '未命名活動').trim(),
          categoryId: b.categoryId || this.state.categories[0]?.id,
          startMinutes: clamp(snapMinutes(b.startMinutes ?? 0), 0, MINUTES_PER_DAY - SNAP_MINUTES),
          durationMinutes: clamp(snapMinutes(b.durationMinutes ?? DEFAULT_DURATION), SNAP_MINUTES, MINUTES_PER_DAY),
          note: (b.note || '').trim()
        })).sort((a, b) => a.startMinutes - b.startMinutes)
      };
      if (!Array.isArray(this.state.dayTemplates)) this.state.dayTemplates = [];
      this.state.dayTemplates.push(tpl);
      this.notify('dayTemplates');
      return tpl;
    }

    updateDayTemplate(id, patch) {
      if (!Array.isArray(this.state.dayTemplates)) return null;
      const idx = this.state.dayTemplates.findIndex((dt) => dt.id === id);
      if (idx === -1) return null;
      this.pushUndo('編輯一日模板');
      const current = this.state.dayTemplates[idx];
      const nextBlocks = Array.isArray(patch.blocks)
        ? patch.blocks.map((b) => ({
            title: (b.title || '未命名活動').trim(),
            categoryId: b.categoryId || this.state.categories[0]?.id,
            startMinutes: clamp(snapMinutes(b.startMinutes ?? 0), 0, MINUTES_PER_DAY - SNAP_MINUTES),
            durationMinutes: clamp(snapMinutes(b.durationMinutes ?? DEFAULT_DURATION), SNAP_MINUTES, MINUTES_PER_DAY),
            note: (b.note || '').trim()
          })).sort((a, b) => a.startMinutes - b.startMinutes)
        : current.blocks;

      this.state.dayTemplates[idx] = {
        ...current,
        name: patch.name !== undefined ? patch.name.trim() : current.name,
        icon: patch.icon !== undefined ? patch.icon.trim() : current.icon,
        description: patch.description !== undefined ? patch.description.trim() : current.description,
        blocks: nextBlocks
      };
      this.notify('dayTemplates');
      return this.state.dayTemplates[idx];
    }

    deleteDayTemplate(id) {
      if (!Array.isArray(this.state.dayTemplates)) return false;
      const idx = this.state.dayTemplates.findIndex((dt) => dt.id === id);
      if (idx === -1) return false;
      this.pushUndo('刪除一日模板');
      this.state.dayTemplates.splice(idx, 1);
      this.notify('dayTemplates');
      return true;
    }

    applyDayTemplate(templateId, { overwrite = true } = {}) {
      const tpl = this.getDayTemplateById(templateId);
      if (!tpl || !Array.isArray(tpl.blocks)) return 0;
      this.pushUndo(`套用模板「${tpl.name}」`);

      const newBlocks = tpl.blocks.map((b) => {
        const start = clamp(snapMinutes(b.startMinutes), 0, MINUTES_PER_DAY - SNAP_MINUTES);
        const dur = clamp(snapMinutes(b.durationMinutes), SNAP_MINUTES, MINUTES_PER_DAY - start);
        return {
          id: uid('blk'),
          date: this.selectedDate,
          title: b.title,
          categoryId: this.getCategoryById(b.categoryId).id,
          startMinutes: start,
          durationMinutes: dur,
          note: b.note || ''
        };
      });

      if (overwrite) {
        this.state.blocksByDate[this.selectedDate] = newBlocks;
      } else {
        const existing = this.getBlocks(this.selectedDate);
        this.state.blocksByDate[this.selectedDate] = [...existing, ...newBlocks];
      }

      this.selectedBlockId = null;
      this.notify('blocks');
      return newBlocks.length;
    }

    // --- Time Blocks on 24H Timeline ---
    getBlocks(dateKey = this.selectedDate) {
      const list = this.state.blocksByDate[dateKey] || [];
      return [...list].sort((a, b) => a.startMinutes - b.startMinutes);
    }

    getBlockById(blockId, dateKey = this.selectedDate) {
      const list = this.state.blocksByDate[dateKey] || [];
      return list.find((b) => b.id === blockId) || null;
    }

    addBlock({ title, categoryId, startMinutes, durationMinutes = DEFAULT_DURATION, note = '', dateKey = this.selectedDate }) {
      this.pushUndo('排入活動');
      const start = clamp(snapMinutes(startMinutes), 0, MINUTES_PER_DAY - SNAP_MINUTES);
      const maxDur = MINUTES_PER_DAY - start;
      const duration = clamp(snapMinutes(durationMinutes), SNAP_MINUTES, maxDur);

      const block = {
        id: uid('blk'),
        date: dateKey,
        title: (title || '未命名活動').trim(),
        categoryId: categoryId || this.state.categories[0]?.id,
        startMinutes: start,
        durationMinutes: duration,
        note: (note || '').trim()
      };

      if (!this.state.blocksByDate[dateKey]) {
        this.state.blocksByDate[dateKey] = [];
      }
      this.state.blocksByDate[dateKey].push(block);
      this.selectedBlockId = block.id;
      this.notify('blocks');
      return block;
    }

    updateBlock(blockId, patch, dateKey = this.selectedDate) {
      const list = this.state.blocksByDate[dateKey];
      if (!list) return null;
      const idx = list.findIndex((b) => b.id === blockId);
      if (idx === -1) return null;

      this.pushUndo('修改活動');
      const current = list[idx];
      let nextStart = patch.startMinutes !== undefined ? snapMinutes(patch.startMinutes) : current.startMinutes;
      let nextDuration = patch.durationMinutes !== undefined ? snapMinutes(patch.durationMinutes) : current.durationMinutes;

      nextDuration = clamp(nextDuration, SNAP_MINUTES, MINUTES_PER_DAY);
      nextStart = clamp(nextStart, 0, MINUTES_PER_DAY - nextDuration);

      const updated = {
        ...current,
        ...patch,
        startMinutes: nextStart,
        durationMinutes: nextDuration
      };
      list[idx] = updated;
      this.notify('blocks');
      return updated;
    }

    deleteBlock(blockId, dateKey = this.selectedDate) {
      const list = this.state.blocksByDate[dateKey];
      if (!list) return false;
      const idx = list.findIndex((b) => b.id === blockId);
      if (idx === -1) return false;

      this.pushUndo('刪除活動');
      list.splice(idx, 1);
      if (this.selectedBlockId === blockId) this.selectedBlockId = null;
      this.notify('blocks');
      return true;
    }

    duplicateBlock(blockId, dateKey = this.selectedDate) {
      const blk = this.getBlockById(blockId, dateKey);
      if (!blk) return null;
      const nextStart = Math.min(MINUTES_PER_DAY - blk.durationMinutes, blk.startMinutes + blk.durationMinutes);
      return this.addBlock({
        title: blk.title,
        categoryId: blk.categoryId,
        startMinutes: nextStart,
        durationMinutes: blk.durationMinutes,
        note: blk.note,
        dateKey
      });
    }

    copyYesterdayToCurrent() {
      const yesterdayKey = addDays(this.selectedDate, -1);
      const prevBlocks = this.getBlocks(yesterdayKey);
      if (prevBlocks.length === 0) return 0;

      this.pushUndo('複製昨日排程');
      this.state.blocksByDate[this.selectedDate] = prevBlocks.map((b) => ({
        ...b,
        id: uid('blk'),
        date: this.selectedDate
      }));
      this.notify('blocks');
      return prevBlocks.length;
    }

    clearCurrentDay() {
      const list = this.state.blocksByDate[this.selectedDate] || [];
      if (list.length === 0) return 0;
      this.pushUndo('清空當日排程');
      this.state.blocksByDate[this.selectedDate] = [];
      this.selectedBlockId = null;
      this.notify('blocks');
      return list.length;
    }

    // --- Export / Import ---
    exportJSON() {
      return JSON.stringify({
        app: TF.APP_NAME,
        version: TF.VERSION,
        exportedAt: new Date().toISOString(),
        ...this.state
      }, null, 2);
    }

    importJSON(jsonText) {
      const parsed = JSON.parse(jsonText);
      if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.templates)) {
        throw new Error('備份檔案格式不正確');
      }
      this.pushUndo('匯入備份');
      this.state.categories = parsed.categories;
      this.state.templates = parsed.templates;
      if (Array.isArray(parsed.dayTemplates)) {
        this.state.dayTemplates = parsed.dayTemplates;
      }
      this.state.blocksByDate = parsed.blocksByDate || {};
      if (parsed.settings) {
        this.state.settings = { ...this.state.settings, ...parsed.settings };
      }
      this.selectedBlockId = null;
      this.notify('import');
    }
  }

  TF.PRESET_COLORS = PRESET_COLORS;
  TF.STORAGE_KEY = STORAGE_KEY;
  TF.store = new Store();
})(window);
