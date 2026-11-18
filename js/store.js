(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  const { uid, toDateKey, addDays, clamp, snapMinutes, MINUTES_PER_DAY, SNAP_MINUTES, DEFAULT_DURATION } = TF.utils;

  const STORAGE_KEY = 'timeblock_24h_data_v1';

  const PRESET_COLORS = [
    '#3B82F6', // 藍
    '#8B5CF6', // 紫
    '#10B981', // 綠
    '#F59E0B', // 琥珀
    '#EC4899', // 粉紅
    '#EF4444', // 紅
    '#06B6D4', // 青
    '#6366F1', // 靛藍
    '#84CC16', // 萊姆綠
    '#64748B'  // 灰藍
  ];

  const DEFAULT_CATEGORIES = [
    { id: 'cat_work', name: '工作', color: '#3B82F6', icon: '💼', sortOrder: 0 },
    { id: 'cat_study', name: '學習', color: '#8B5CF6', icon: '📚', sortOrder: 1 },
    { id: 'cat_sport', name: '運動', color: '#10B981', icon: '🏃', sortOrder: 2 },
    { id: 'cat_life', name: '生活', color: '#F59E0B', icon: '🍽️', sortOrder: 3 },
    { id: 'cat_rest', name: '休息', color: '#64748B', icon: '🌙', sortOrder: 4 },
    { id: 'cat_fun', name: '娛樂', color: '#EC4899', icon: '🎮', sortOrder: 5 }
  ];

  const DEFAULT_TEMPLATES = [
    { id: 'tpl_deepwork', title: '深度工作', categoryId: 'cat_work', defaultDuration: 60 },
    { id: 'tpl_meeting', title: '會議討論', categoryId: 'cat_work', defaultDuration: 60 },
    { id: 'tpl_study', title: '閱讀學習', categoryId: 'cat_study', defaultDuration: 60 },
    { id: 'tpl_workout', title: '運動健身', categoryId: 'cat_sport', defaultDuration: 60 },
    { id: 'tpl_meal', title: '用餐時間', categoryId: 'cat_life', defaultDuration: 60 },
    { id: 'tpl_commute', title: '通勤雜務', categoryId: 'cat_life', defaultDuration: 60 },
    { id: 'tpl_nap', title: '休息放鬆', categoryId: 'cat_rest', defaultDuration: 60 },
    { id: 'tpl_sleep', title: '睡眠時間', categoryId: 'cat_rest', defaultDuration: 60 },
    { id: 'tpl_leisure', title: '休閒娛樂', categoryId: 'cat_fun', defaultDuration: 60 }
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
          note: ''
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '早餐與晨間準備',
          categoryId: 'cat_life',
          startMinutes: 450, // 07:30
          durationMinutes: 60,
          note: ''
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '深度工作',
          categoryId: 'cat_work',
          startMinutes: 540, // 09:00
          durationMinutes: 120,
          note: '專注處理今日核心任務'
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '午餐與午休',
          categoryId: 'cat_life',
          startMinutes: 720, // 12:00
          durationMinutes: 60,
          note: ''
        },
        {
          id: uid('blk'),
          date: todayKey,
          title: '運動健身',
          categoryId: 'cat_sport',
          startMinutes: 1080, // 18:00
          durationMinutes: 60,
          note: ''
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
    }

    load() {
      try {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.templates)) {
            return {
              categories: parsed.categories,
              templates: parsed.templates,
              blocksByDate: parsed.blocksByDate || {},
              settings: {
                theme: parsed.settings?.theme || 'light',
                hourHeight: parsed.settings?.hourHeight || 64
              }
            };
          }
        }
      } catch (err) {
        console.warn('無法讀取本地資料，將使用預設設定：', err);
      }

      const todayKey = toDateKey(new Date());
      const initial = {
        categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
        templates: DEFAULT_TEMPLATES.map((t) => ({ ...t })),
        blocksByDate: buildInitialSampleBlocks(todayKey),
        settings: {
          theme: 'light',
          hourHeight: 64
        }
      };
      this.save(initial);
      return initial;
    }

    save(stateObj = this.state) {
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
      } catch (err) {
        console.warn('無法寫入本地資料：', err);
      }
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify(reason = 'change') {
      this.save();
      for (const fn of this.listeners) {
        fn(reason);
      }
    }

    pushUndo(label = '變更') {
      const snapshot = JSON.stringify({
        categories: this.state.categories,
        templates: this.state.templates,
        blocksByDate: this.state.blocksByDate
      });
      this.undoStack.push({ label, snapshot });
      if (this.undoStack.length > 30) this.undoStack.shift();
    }

    undo() {
      if (this.undoStack.length === 0) return null;
      const last = this.undoStack.pop();
      const restored = JSON.parse(last.snapshot);
      this.state.categories = restored.categories;
      this.state.templates = restored.templates;
      this.state.blocksByDate = restored.blocksByDate;
      this.selectedBlockId = null;
      this.notify('undo');
      return last.label;
    }

    // --- Date & Selection ---
    setDate(dateKey) {
      this.selectedDate = dateKey;
      this.selectedBlockId = null;
      this.notify('date');
    }

    shiftDate(days) {
      this.setDate(addDays(this.selectedDate, days));
    }

    setCategoryFilter(catId) {
      this.selectedCategoryFilter = catId;
      this.notify('filter');
    }

    setSelectedBlock(blockId) {
      if (this.selectedBlockId === blockId) return;
      this.selectedBlockId = blockId;
      this.notify('selection');
    }

    // --- Settings ---
    setTheme(theme) {
      this.state.settings.theme = theme;
      this.notify('settings');
    }

    setHourHeight(px) {
      this.state.settings.hourHeight = px;
      this.notify('zoom');
    }

    // --- Categories ---
    getCategories() {
      return [...this.state.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    getCategoryById(id) {
      return (
        this.state.categories.find((c) => c.id === id) ||
        this.state.categories[0] || {
          id: 'fallback',
          name: '未分類',
          color: '#64748B',
          icon: '📌'
        }
      );
    }

    addCategory({ name, color, icon = '🏷️' }) {
      this.pushUndo('新增類別');
      const cat = {
        id: uid('cat'),
        name: name.trim(),
        color: color || PRESET_COLORS[0],
        icon: icon || '🏷️',
        sortOrder: this.state.categories.length
      };
      this.state.categories.push(cat);
      this.notify('categories');
      return cat;
    }

    updateCategory(id, patch) {
      const idx = this.state.categories.findIndex((c) => c.id === id);
      if (idx === -1) return;
      this.pushUndo('更新類別');
      this.state.categories[idx] = { ...this.state.categories[idx], ...patch };
      this.notify('categories');
    }

    deleteCategory(id) {
      if (this.state.categories.length <= 1) return false;
      this.pushUndo('刪除類別');
      this.state.categories = this.state.categories.filter((c) => c.id !== id);
      const fallbackId = this.state.categories[0].id;

      // Reassign templates and blocks pointing to deleted category
      this.state.templates.forEach((t) => {
        if (t.categoryId === id) t.categoryId = fallbackId;
      });
      Object.values(this.state.blocksByDate).forEach((blocks) => {
        blocks.forEach((b) => {
          if (b.categoryId === id) b.categoryId = fallbackId;
        });
      });

      if (this.selectedCategoryFilter === id) {
        this.selectedCategoryFilter = 'all';
      }
      this.notify('categories');
      return true;
    }

    // --- Templates ---
    getTemplates(categoryId = 'all') {
      if (categoryId === 'all') return this.state.templates;
      return this.state.templates.filter((t) => t.categoryId === categoryId);
    }

    getTemplateById(id) {
      return this.state.templates.find((t) => t.id === id);
    }

    addTemplate({ title, categoryId, defaultDuration = DEFAULT_DURATION }) {
      this.pushUndo('新增活動方塊');
      const dur = clamp(snapMinutes(defaultDuration), SNAP_MINUTES, MINUTES_PER_DAY);
      const tpl = {
        id: uid('tpl'),
        title: title.trim(),
        categoryId,
        defaultDuration: dur
      };
      this.state.templates.push(tpl);
      this.notify('templates');
      return tpl;
    }

    updateTemplate(id, patch) {
      const idx = this.state.templates.findIndex((t) => t.id === id);
      if (idx === -1) return;
      this.pushUndo('更新活動方塊');
      this.state.templates[idx] = { ...this.state.templates[idx], ...patch };
      this.notify('templates');
    }

    deleteTemplate(id) {
      this.pushUndo('刪除活動方塊');
      this.state.templates = this.state.templates.filter((t) => t.id !== id);
      this.notify('templates');
    }

    // --- Time Blocks ---
    getBlocks(dateKey = this.selectedDate) {
      return this.state.blocksByDate[dateKey] || [];
    }

    getBlockById(id, dateKey = this.selectedDate) {
      return this.getBlocks(dateKey).find((b) => b.id === id);
    }

    addBlock({
      date = this.selectedDate,
      title,
      categoryId,
      startMinutes,
      durationMinutes = DEFAULT_DURATION,
      note = ''
    }) {
      this.pushUndo('新增行程方塊');
      const dur = clamp(snapMinutes(durationMinutes), SNAP_MINUTES, MINUTES_PER_DAY);
      const start = clamp(snapMinutes(startMinutes), 0, MINUTES_PER_DAY - dur);

      const block = {
        id: uid('blk'),
        date,
        title: (title || '未命名活動').trim(),
        categoryId: categoryId || this.state.categories[0]?.id,
        startMinutes: start,
        durationMinutes: dur,
        note
      };

      if (!this.state.blocksByDate[date]) {
        this.state.blocksByDate[date] = [];
      }
      this.state.blocksByDate[date].push(block);
      this.selectedBlockId = block.id;
      this.notify('blocks');
      return block;
    }

    updateBlock(id, patch, { date = this.selectedDate, recordUndo = true } = {}) {
      const list = this.state.blocksByDate[date];
      if (!list) return null;
      const idx = list.findIndex((b) => b.id === id);
      if (idx === -1) return null;

      if (recordUndo) this.pushUndo('調整行程');
      const current = list[idx];
      let startMinutes = patch.startMinutes !== undefined ? snapMinutes(patch.startMinutes) : current.startMinutes;
      let durationMinutes = patch.durationMinutes !== undefined ? snapMinutes(patch.durationMinutes) : current.durationMinutes;

      durationMinutes = clamp(durationMinutes, SNAP_MINUTES, MINUTES_PER_DAY);
      startMinutes = clamp(startMinutes, 0, MINUTES_PER_DAY - durationMinutes);

      list[idx] = {
        ...current,
        ...patch,
        startMinutes,
        durationMinutes
      };
      this.notify('blocks');
      return list[idx];
    }

    deleteBlock(id, date = this.selectedDate) {
      const list = this.state.blocksByDate[date];
      if (!list) return false;
      const exists = list.some((b) => b.id === id);
      if (!exists) return false;

      this.pushUndo('刪除行程');
      this.state.blocksByDate[date] = list.filter((b) => b.id !== id);
      if (this.selectedBlockId === id) this.selectedBlockId = null;
      this.notify('blocks');
      return true;
    }

    duplicateBlock(id, date = this.selectedDate) {
      const blk = this.getBlockById(id, date);
      if (!blk) return null;
      const nextStart = blk.startMinutes + blk.durationMinutes;
      const startMinutes = nextStart + blk.durationMinutes <= MINUTES_PER_DAY
        ? nextStart
        : Math.max(0, blk.startMinutes - blk.durationMinutes);
      return this.addBlock({
        date,
        title: blk.title,
        categoryId: blk.categoryId,
        startMinutes,
        durationMinutes: blk.durationMinutes,
        note: blk.note
      });
    }

    copyYesterdayToCurrent() {
      const yesterday = addDays(this.selectedDate, -1);
      const source = this.getBlocks(yesterday);
      if (!source || source.length === 0) return 0;

      this.pushUndo('複製昨日排程');
      this.state.blocksByDate[this.selectedDate] = source.map((b) => ({
        ...b,
        id: uid('blk'),
        date: this.selectedDate
      }));
      this.selectedBlockId = null;
      this.notify('blocks');
      return source.length;
    }

    clearCurrentDay() {
      const list = this.getBlocks(this.selectedDate);
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
        version: 1,
        exportedAt: new Date().toISOString(),
        ...this.state
      }, null, 2);
    }

    importJSON(jsonText) {
      const parsed = JSON.parse(jsonText);
      if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.templates)) {
        throw new Error('檔案格式不正確');
      }
      this.pushUndo('匯入備份');
      this.state.categories = parsed.categories;
      this.state.templates = parsed.templates;
      this.state.blocksByDate = parsed.blocksByDate || {};
      this.selectedBlockId = null;
      this.notify('import');
    }
  }

  TF.PRESET_COLORS = PRESET_COLORS;
  TF.store = new Store();
})(window);
