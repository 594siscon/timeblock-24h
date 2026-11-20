(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  const {
    MINUTES_PER_DAY,
    SNAP_MINUTES,
    DEFAULT_DURATION,
    clamp,
    snapMinutes,
    formatTime,
    formatDuration,
    formatHoursDecimal,
    toDateKey,
    parseDateKey,
    formatDateDisplay,
    getWeekDates,
    formatWeekRangeDisplay,
    getMonthDates,
    formatMonthRangeDisplay,
    escapeHtml,
    hexToRgba
  } = TF.utils;

  const PRESET_ICONS = ['💼', '📚', '🏃', '🍽️', '🌙', '🎮', '💻', '🎨', '🧘', '🚗', '📞', '🛒', '🎵', '✨', '📌', '❤️'];

  class UIController {
    constructor() {
      this.toastTimer = null;
      this.editingBlockId = null;
      this.editingCategoryId = null;
      this.editingTemplateId = null;
      this.editingTemplateSchedule = [];
      this.editingTplBlockIdx = null;

      this.calYear = new Date().getFullYear();
      this.calMonth = new Date().getMonth();

      this.cacheElements();
      this.populateTimeOptions();
      this.bindEvents();
    }

    cacheElements() {
      // Header & Quickbar
      this.dateLabelEl = document.getElementById('currentDateLabel');
      this.dateSubLabelEl = document.getElementById('currentDateSub');
      this.dateInputEl = document.getElementById('datePickerInput');
      this.todayBtnEl = document.getElementById('btnToday');
      this.timelineFullDateBanner = document.getElementById('timelineFullDateBanner');
      this.timelineBlockCountBadge = document.getElementById('timelineBlockCountBadge');

      // Sidebar Dock & Mobile Dock/Drawer
      this.catFilterDesktopEl = document.getElementById('categoryFiltersDesktop');
      this.catFilterMobileEl = document.getElementById('categoryFiltersMobile');
      this.templateListDesktopEl = document.getElementById('templateListDesktop');
      this.templateListMobileEl = document.getElementById('templateListMobile');
      this.mobileDockEl = document.getElementById('mobileDockList');
      this.mobileDrawerEl = document.getElementById('mobileDrawer');
      this.mobileDrawerBackdropEl = document.getElementById('mobileDrawerBackdrop');

      // Stats
      this.statsDesktopEl = document.getElementById('statsContentDesktop');
      this.statsModalBodyEl = document.getElementById('statsContentModal');
      this.statsDesktopHeading = document.getElementById('statsDesktopHeading');
      this.statsDesktopSubHeading = document.getElementById('statsDesktopSubHeading');
      this.statsModalTitleEl = document.getElementById('statsModalTitle');

      // Modal 1: Block Modal
      this.blockModalEl = document.getElementById('blockModal');
      this.blockFormEl = document.getElementById('blockForm');
      this.blockModalTitleEl = document.getElementById('blockModalTitle');
      this.blockTitleInput = document.getElementById('blockTitleInput');
      this.blockCategoryPicker = document.getElementById('blockCategoryPicker');
      this.blockStartSelect = document.getElementById('blockStartSelect');
      this.blockEndSelect = document.getElementById('blockEndSelect');
      this.blockDurationChips = document.getElementById('blockDurationChips');
      this.blockNoteInput = document.getElementById('blockNoteInput');
      this.btnDeleteBlockModal = document.getElementById('btnDeleteBlockModal');

      // Modal 2: Category Modal
      this.categoryModalEl = document.getElementById('categoryModal');
      this.categoryListEl = document.getElementById('categoryManagerList');
      this.categoryFormEl = document.getElementById('categoryForm');
      this.catNameInput = document.getElementById('catNameInput');
      this.catColorInput = document.getElementById('catColorInput');
      this.catIconInput = document.getElementById('catIconInput');
      this.catColorSwatches = document.getElementById('catColorSwatches');
      this.catIconSwatches = document.getElementById('catIconSwatches');
      this.catFormSubmitBtn = document.getElementById('catFormSubmitBtn');
      this.catFormCancelEditBtn = document.getElementById('catFormCancelEditBtn');

      // Modal 3: Activity Template Modal
      this.templateModalEl = document.getElementById('templateModal');
      this.templateFormEl = document.getElementById('templateForm');
      this.templateModalTitleEl = document.getElementById('templateModalTitle');
      this.tplTitleInput = document.getElementById('tplTitleInput');
      this.tplCategorySelect = document.getElementById('tplCategorySelect');
      this.tplDurationSelect = document.getElementById('tplDurationSelect');
      this.btnDeleteTemplateModal = document.getElementById('btnDeleteTemplateModal');

      // Modal 4 & 5: Stats & Sync Modals
      this.statsModalEl = document.getElementById('statsModal');
      this.syncModalEl = document.getElementById('syncModal');
      this.toastEl = document.getElementById('toast');

      this.syncStatusDotEl = document.getElementById('syncStatusDot');
      this.syncStatusTextEl = document.getElementById('syncStatusText');
      this.syncModalDotEl = document.getElementById('syncModalDot');
      this.syncBannerTitleEl = document.getElementById('syncBannerTitle');
      this.syncBannerSubEl = document.getElementById('syncBannerSub');
      this.syncLoggedInPanelEl = document.getElementById('syncLoggedInPanel');
      this.syncAuthPanelEl = document.getElementById('syncAuthPanel');
      this.syncUserAvatarEl = document.getElementById('syncUserAvatar');
      this.syncUserNameEl = document.getElementById('syncUserName');
      this.syncUserEmailEl = document.getElementById('syncUserEmail');
      this.syncLastTimeEl = document.getElementById('syncLastTime');
      this.syncErrorBoxEl = document.getElementById('syncErrorBox');
      this.syncConfigDetailsEl = document.getElementById('syncConfigDetails');
      this.syncConfigFormEl = document.getElementById('syncConfigForm');
      this.fbConfigInput = document.getElementById('fbConfigInput');
      this.syncEmailFormEl = document.getElementById('syncEmailForm');
      this.syncEmailInput = document.getElementById('syncEmailInput');
      this.syncPasswordInput = document.getElementById('syncPasswordInput');

      // Modal 6: Calendar Modal
      this.calendarModalEl = document.getElementById('calendarModal');
      this.calendarModalMonthLabel = document.getElementById('calendarModalMonthLabel');
      this.calendarGridDays = document.getElementById('calendarGridDays');
      this.calPrevMonthBtn = document.getElementById('calPrevMonth');
      this.calNextMonthBtn = document.getElementById('calNextMonth');
      this.calJumpTodayBtn = document.getElementById('calJumpToday');

      // Modal 7: Day Templates Modal
      this.dayTemplateModalEl = document.getElementById('dayTemplateModal');
      this.dayTemplateListEl = document.getElementById('dayTemplateList');
      this.btnSaveCurrentAsDayTemplate = document.getElementById('btnSaveCurrentAsDayTemplate');
      this.btnCreateBlankDayTemplate = document.getElementById('btnCreateBlankDayTemplate');
      this.saveDayTemplatePanel = document.getElementById('saveDayTemplatePanel');
      this.saveDayTemplateForm = document.getElementById('saveDayTemplateForm');
      this.dayTplFormTitle = document.getElementById('dayTplFormTitle');
      this.editingDayTplId = document.getElementById('editingDayTplId');
      this.newDayTplName = document.getElementById('newDayTplName');
      this.newDayTplIcon = document.getElementById('newDayTplIcon');
      this.newDayTplDesc = document.getElementById('newDayTplDesc');
      this.btnSubmitDayTemplate = document.getElementById('btnSubmitDayTemplate');
      this.btnCancelSaveDayTemplate = document.getElementById('btnCancelSaveDayTemplate');
      this.btnCloseDayTplEditor = document.getElementById('btnCloseDayTplEditor');
      this.dayTplScheduleList = document.getElementById('dayTplScheduleList');
      this.btnAddScheduleRow = document.getElementById('btnAddScheduleRow');
      this.btnLoadCurrentDayIntoEditor = document.getElementById('btnLoadCurrentDayIntoEditor');
      this.btnClearEditorSchedule = document.getElementById('btnClearEditorSchedule');
      this.dayTplScheduleSummary = document.getElementById('dayTplScheduleSummary');

      // Modal 8: Day Template Block Item Editor Modal
      this.dayTplBlockModalEl = document.getElementById('dayTplBlockModal');
      this.dayTplBlockModalTitle = document.getElementById('dayTplBlockModalTitle');
      this.dayTplBlockForm = document.getElementById('dayTplBlockForm');
      this.dayTplBlockTitleInput = document.getElementById('dayTplBlockTitleInput');
      this.dayTplBlockCategoryPicker = document.getElementById('dayTplBlockCategoryPicker');
      this.dayTplBlockStartSelect = document.getElementById('dayTplBlockStartSelect');
      this.dayTplBlockEndSelect = document.getElementById('dayTplBlockEndSelect');
      this.dayTplBlockDurationChips = document.getElementById('dayTplBlockDurationChips');
      this.dayTplBlockNoteInput = document.getElementById('dayTplBlockNoteInput');
      this.btnDeleteDayTplBlock = document.getElementById('btnDeleteDayTplBlock');

      // Modal 9: Version History Modal
      this.versionModalEl = document.getElementById('versionModal');
      this.versionChangelogListEl = document.getElementById('versionChangelogList');
      this.btnForceRefreshCache = document.getElementById('btnForceRefreshCache');
      this.btnResetAllData = document.getElementById('btnResetAllData');
    }

    populateTimeOptions() {
      const startOpts = [];
      for (let m = 0; m < MINUTES_PER_DAY; m += SNAP_MINUTES) {
        startOpts.push(`<option value="${m}">${formatTime(m)}</option>`);
      }
      if (this.blockStartSelect) this.blockStartSelect.innerHTML = startOpts.join('');
      if (this.dayTplBlockStartSelect) this.dayTplBlockStartSelect.innerHTML = startOpts.join('');

      const endOpts = [];
      for (let m = SNAP_MINUTES; m <= MINUTES_PER_DAY; m += SNAP_MINUTES) {
        endOpts.push(`<option value="${m}">${formatTime(m)}</option>`);
      }
      if (this.blockEndSelect) this.blockEndSelect.innerHTML = endOpts.join('');
      if (this.dayTplBlockEndSelect) this.dayTplBlockEndSelect.innerHTML = endOpts.join('');

      const durOpts = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 360, 480];
      if (this.tplDurationSelect) {
        this.tplDurationSelect.innerHTML = durOpts
          .map((m) => `<option value="${m}" ${m === DEFAULT_DURATION ? 'selected' : ''}>${formatDuration(m)}${m === 60 ? '（預設）' : ''}</option>`)
          .join('');
      }

      if (this.catColorSwatches) {
        this.catColorSwatches.innerHTML = (TF.PRESET_COLORS || [])
          .map((c) => `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`)
          .join('');
      }

      if (this.catIconSwatches) {
        this.catIconSwatches.innerHTML = PRESET_ICONS
          .map((ic) => `<button type="button" class="icon-swatch" data-icon="${ic}">${ic}</button>`)
          .join('');
      }
    }

    bindEvents() {
      // Close modal on backdrop click
      document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.closeModal(backdrop);
        });
      });

      this.mobileDrawerBackdropEl?.addEventListener('click', () => this.closeMobileDrawer());

      // --- Modal 1: Block Form Events ---
      this.blockStartSelect?.addEventListener('change', () => {
        const start = Number(this.blockStartSelect.value);
        const end = Number(this.blockEndSelect.value);
        if (end <= start) {
          this.blockEndSelect.value = String(Math.min(MINUTES_PER_DAY, start + DEFAULT_DURATION));
        }
        this.highlightActiveDurationChip();
      });

      this.blockEndSelect?.addEventListener('change', () => {
        const start = Number(this.blockStartSelect.value);
        const end = Number(this.blockEndSelect.value);
        if (end <= start) {
          this.blockStartSelect.value = String(Math.max(0, end - SNAP_MINUTES));
        }
        this.highlightActiveDurationChip();
      });

      this.blockDurationChips?.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-dur]');
        if (!chip) return;
        const dur = Number(chip.dataset.dur);
        const start = Number(this.blockStartSelect.value);
        const end = Math.min(MINUTES_PER_DAY, start + dur);
        this.blockEndSelect.value = String(end);
        this.highlightActiveDurationChip();
      });

      this.blockCategoryPicker?.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-cat-id]');
        if (!pill) return;
        this.blockCategoryPicker.querySelectorAll('.cat-pick-pill').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
      });

      this.blockFormEl?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = this.blockTitleInput.value.trim() || '未命名活動';
        const activeCat = this.blockCategoryPicker.querySelector('.cat-pick-pill.is-active');
        const categoryId = activeCat ? activeCat.dataset.catId : TF.store.getCategories()[0]?.id;
        const startMinutes = Number(this.blockStartSelect.value);
        const endMinutes = Number(this.blockEndSelect.value);
        const durationMinutes = Math.max(SNAP_MINUTES, endMinutes - startMinutes);
        const note = this.blockNoteInput.value.trim();

        if (this.editingBlockId) {
          TF.store.updateBlock(this.editingBlockId, {
            title,
            categoryId,
            startMinutes,
            durationMinutes,
            note
          });
          this.showToast(`已更新活動「${title}」`, true);
        } else {
          TF.store.addBlock({ title, categoryId, startMinutes, durationMinutes, note });
          this.showToast(`已排入活動「${title}」`, true);
        }
        this.closeModal(this.blockModalEl);
      });

      this.btnDeleteBlockModal?.addEventListener('click', () => {
        if (!this.editingBlockId) return;
        TF.store.deleteBlock(this.editingBlockId);
        this.closeModal(this.blockModalEl);
        this.showToast('已刪除活動方塊', true);
      });

      // --- Modal 8: Day Template Block Item Form Events (同款介面) ---
      this.dayTplBlockStartSelect?.addEventListener('change', () => {
        const start = Number(this.dayTplBlockStartSelect.value);
        const end = Number(this.dayTplBlockEndSelect.value);
        if (end <= start) {
          this.dayTplBlockEndSelect.value = String(Math.min(MINUTES_PER_DAY, start + DEFAULT_DURATION));
        }
        this.highlightActiveDayTplDurationChip();
      });

      this.dayTplBlockEndSelect?.addEventListener('change', () => {
        const start = Number(this.dayTplBlockStartSelect.value);
        const end = Number(this.dayTplBlockEndSelect.value);
        if (end <= start) {
          this.dayTplBlockStartSelect.value = String(Math.max(0, end - SNAP_MINUTES));
        }
        this.highlightActiveDayTplDurationChip();
      });

      this.dayTplBlockDurationChips?.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-dur]');
        if (!chip) return;
        const dur = Number(chip.dataset.dur);
        const start = Number(this.dayTplBlockStartSelect.value);
        const end = Math.min(MINUTES_PER_DAY, start + dur);
        this.dayTplBlockEndSelect.value = String(end);
        this.highlightActiveDayTplDurationChip();
      });

      this.dayTplBlockCategoryPicker?.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-cat-id]');
        if (!pill) return;
        this.dayTplBlockCategoryPicker.querySelectorAll('.cat-pick-pill').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
      });

      this.dayTplBlockForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = this.dayTplBlockTitleInput.value.trim() || '未命名活動';
        const activeCat = this.dayTplBlockCategoryPicker.querySelector('.cat-pick-pill.is-active');
        const categoryId = activeCat ? activeCat.dataset.catId : TF.store.getCategories()[0]?.id;
        const startMinutes = Number(this.dayTplBlockStartSelect.value);
        const endMinutes = Number(this.dayTplBlockEndSelect.value);
        const durationMinutes = Math.max(SNAP_MINUTES, endMinutes - startMinutes);
        const note = this.dayTplBlockNoteInput.value.trim();

        if (!Array.isArray(this.editingTemplateSchedule)) {
          this.editingTemplateSchedule = [];
        }

        const itemData = { title, categoryId, startMinutes, durationMinutes, note };
        if (this.editingTplBlockIdx !== null && this.editingTplBlockIdx >= 0) {
          this.editingTemplateSchedule[this.editingTplBlockIdx] = itemData;
          this.showToast(`已更新模板時段「${title}」`);
        } else {
          this.editingTemplateSchedule.push(itemData);
          this.showToast(`已新增模板時段「${title}」`);
        }

        this.editingTemplateSchedule.sort((a, b) => a.startMinutes - b.startMinutes);
        this.closeModal(this.dayTplBlockModalEl);
        this.renderDayTemplateScheduleEditor();
      });

      this.btnDeleteDayTplBlock?.addEventListener('click', () => {
        if (this.editingTplBlockIdx !== null && this.editingTplBlockIdx >= 0) {
          const removed = this.editingTemplateSchedule.splice(this.editingTplBlockIdx, 1);
          this.closeModal(this.dayTplBlockModalEl);
          this.renderDayTemplateScheduleEditor();
          this.showToast(`已移除模板時段「${removed[0]?.title || ''}」`);
        }
      });

      // --- Modal 2: Category Form Events ---
      this.catColorSwatches?.addEventListener('click', (e) => {
        const sw = e.target.closest('[data-color]');
        if (!sw) return;
        this.catColorInput.value = sw.dataset.color;
        this.syncCategorySwatchSelection();
      });

      this.catColorInput?.addEventListener('input', () => this.syncCategorySwatchSelection());

      this.catIconSwatches?.addEventListener('click', (e) => {
        const sw = e.target.closest('[data-icon]');
        if (!sw) return;
        this.catIconInput.value = sw.dataset.icon;
        this.syncCategorySwatchSelection();
      });

      this.catFormCancelEditBtn?.addEventListener('click', () => this.resetCategoryForm());

      this.categoryFormEl?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.catNameInput.value.trim();
        if (!name) return;
        const color = this.catColorInput.value || '#2563EB';
        const icon = this.catIconInput.value.trim() || '🏷️';

        if (this.editingCategoryId) {
          TF.store.updateCategory(this.editingCategoryId, { name, color, icon });
          this.showToast(`已更新類別「${name}」`);
        } else {
          TF.store.addCategory({ name, color, icon });
          this.showToast(`已新增類別「${name}」`);
        }
        this.resetCategoryForm();
        this.renderCategoryManagerList();
      });

      this.categoryListEl?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cat-action]');
        if (!btn) return;
        const catId = btn.dataset.catId;
        const action = btn.dataset.catAction;

        if (action === 'edit') {
          const cat = TF.store.getCategoryById(catId);
          if (!cat) return;
          this.editingCategoryId = cat.id;
          this.catNameInput.value = cat.name;
          this.catColorInput.value = cat.color;
          this.catIconInput.value = cat.icon || '🏷️';
          this.catFormSubmitBtn.textContent = '儲存類別修改';
          this.catFormCancelEditBtn.hidden = false;
          this.syncCategorySwatchSelection();
          this.catNameInput.focus();
        } else if (action === 'delete') {
          if (TF.store.getCategories().length <= 1) {
            this.showToast('至少需要保留一個活動類別');
            return;
          }
          TF.store.deleteCategory(catId);
          this.resetCategoryForm();
          this.renderCategoryManagerList();
          this.showToast('已刪除類別', true);
        }
      });

      // --- Modal 3: Activity Template Form Events ---
      this.templateFormEl?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = this.tplTitleInput.value.trim();
        if (!title) return;
        const categoryId = this.tplCategorySelect.value;
        const defaultDuration = Number(this.tplDurationSelect.value) || DEFAULT_DURATION;

        if (this.editingTemplateId) {
          TF.store.updateTemplate(this.editingTemplateId, { title, categoryId, defaultDuration });
          this.showToast(`已更新活動方塊「${title}」`);
        } else {
          TF.store.addTemplate({ title, categoryId, defaultDuration });
          this.showToast(`已新增活動方塊「${title}」，點擊即可排入時間表`);
        }
        this.closeModal(this.templateModalEl);
      });

      this.btnDeleteTemplateModal?.addEventListener('click', () => {
        if (!this.editingTemplateId) return;
        const tpl = TF.store.getTemplateById(this.editingTemplateId);
        const name = tpl ? `「${tpl.title}」` : '';
        if (confirm(`確定要刪除活動方塊${name}嗎？`)) {
          TF.store.deleteTemplate(this.editingTemplateId);
          this.closeModal(this.templateModalEl);
          this.showToast('已刪除活動方塊', true);
        }
      });

      // --- Modal 6: Calendar Navigation Events ---
      this.calPrevMonthBtn?.addEventListener('click', () => this.shiftCalendarMonth(-1));
      this.calNextMonthBtn?.addEventListener('click', () => this.shiftCalendarMonth(1));
      this.calJumpTodayBtn?.addEventListener('click', () => {
        TF.store.setDate(toDateKey(new Date()));
        this.closeModal(this.calendarModalEl);
        TF.timeline?.scrollToSmartPosition();
      });

      this.calendarGridDays?.addEventListener('click', (e) => {
        const cell = e.target.closest('[data-cal-date]');
        if (!cell) return;
        const dateKey = cell.dataset.calDate;
        TF.store.setDate(dateKey);
        this.closeModal(this.calendarModalEl);
        TF.timeline?.scrollToSmartPosition();
      });

      // --- Modal 7: Day Templates & Schedule List Editor Events ---
      this.btnCreateBlankDayTemplate?.addEventListener('click', () => {
        this.openDayTemplateScheduleEditor(null, 'blank');
      });

      this.btnSaveCurrentAsDayTemplate?.addEventListener('click', () => {
        const currentBlocks = TF.store.getBlocks();
        if (!currentBlocks || currentBlocks.length === 0) {
          this.showToast('今日尚無活動，已為您開啟空白模板時間列表');
          this.openDayTemplateScheduleEditor(null, 'blank');
          return;
        }
        this.openDayTemplateScheduleEditor(null, 'today');
      });

      this.btnCancelSaveDayTemplate?.addEventListener('click', () => {
        if (this.saveDayTemplatePanel) this.saveDayTemplatePanel.hidden = true;
      });

      this.btnCloseDayTplEditor?.addEventListener('click', () => {
        if (this.saveDayTemplatePanel) this.saveDayTemplatePanel.hidden = true;
      });

      this.btnAddScheduleRow?.addEventListener('click', () => {
        this.openDayTplBlockModal(null);
      });

      this.btnLoadCurrentDayIntoEditor?.addEventListener('click', () => {
        const currentBlocks = TF.store.getBlocks();
        if (!currentBlocks || currentBlocks.length === 0) {
          this.showToast('今日尚無活動排程可帶入');
          return;
        }
        this.editingTemplateSchedule = currentBlocks
          .map((b) => ({
            title: b.title,
            categoryId: b.categoryId,
            startMinutes: b.startMinutes,
            durationMinutes: b.durationMinutes,
            note: b.note || ''
          }))
          .sort((a, b) => a.startMinutes - b.startMinutes);
        this.renderDayTemplateScheduleEditor();
        this.showToast(`已載入今日 ${currentBlocks.length} 項活動至模板時間列表`);
      });

      this.btnClearEditorSchedule?.addEventListener('click', () => {
        if (!this.editingTemplateSchedule || this.editingTemplateSchedule.length === 0) return;
        if (confirm('確定要清空目前編輯列表中的所有時段嗎？')) {
          this.editingTemplateSchedule = [];
          this.renderDayTemplateScheduleEditor();
        }
      });

      this.dayTplScheduleList?.addEventListener('click', (e) => {
        const delBtn = e.target.closest('[data-row-action="delete"]');
        if (delBtn) {
          e.stopPropagation();
          const row = delBtn.closest('[data-row-idx]');
          if (!row) return;
          const idx = Number(row.dataset.rowIdx);
          const removed = this.editingTemplateSchedule.splice(idx, 1);
          this.renderDayTemplateScheduleEditor();
          this.showToast(`已刪除時段「${removed[0]?.title || ''}」`);
          return;
        }

        const card = e.target.closest('[data-row-idx]');
        if (card) {
          const idx = Number(card.dataset.rowIdx);
          this.openDayTplBlockModal(idx);
        }
      });

      this.saveDayTemplateForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const editingId = this.editingDayTplId ? this.editingDayTplId.value : '';
        const name = this.newDayTplName.value.trim();
        if (!name) return;
        const icon = this.newDayTplIcon.value.trim() || '📅';
        const desc = this.newDayTplDesc ? this.newDayTplDesc.value.trim() : '';

        const cleanBlocks = (this.editingTemplateSchedule || [])
          .map((b) => ({
            title: (b.title || '未命名活動').trim(),
            categoryId: b.categoryId || 'cat_work',
            startMinutes: Number(b.startMinutes) || 0,
            durationMinutes: Math.max(15, Number(b.durationMinutes) || 60),
            note: (b.note || '').trim()
          }))
          .sort((a, b) => a.startMinutes - b.startMinutes);

        if (editingId) {
          const updated = TF.store.updateDayTemplate(editingId, {
            name,
            icon,
            description: desc || `包含 ${cleanBlocks.length} 項活動安排`,
            blocks: cleanBlocks
          });
          if (updated) {
            this.showToast(`已儲存一日模板「${updated.name}」（共 ${cleanBlocks.length} 項時段）`, true);
            this.saveDayTemplatePanel.hidden = true;
            this.renderDayTemplatesList();
          }
        } else {
          const created = TF.store.createDayTemplate({
            name,
            icon,
            description: desc || `包含 ${cleanBlocks.length} 項活動安排`,
            blocks: cleanBlocks
          });
          if (created) {
            this.showToast(`已建立一日模板「${created.name}」（共 ${cleanBlocks.length} 項時段）`, true);
            this.saveDayTemplatePanel.hidden = true;
            this.renderDayTemplatesList();
          }
        }
      });

      this.dayTemplateListEl?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-day-tpl-action]');
        if (!btn) return;
        const action = btn.dataset.dayTplAction;
        const tplId = btn.dataset.tplId;
        const tpl = TF.store.getDayTemplateById(tplId);
        if (!tpl) return;

        if (action === 'edit') {
          this.openDayTemplateScheduleEditor(tplId);
        } else if (action === 'apply-replace') {
          const count = TF.store.applyDayTemplate(tplId, { overwrite: true });
          this.closeModal(this.dayTemplateModalEl);
          this.showToast(`已套用模板「${tpl.name}」（覆蓋排入 ${count} 項活動）`, true);
          TF.timeline?.scrollToSmartPosition();
        } else if (action === 'apply-append') {
          const count = TF.store.applyDayTemplate(tplId, { overwrite: false });
          this.closeModal(this.dayTemplateModalEl);
          this.showToast(`已追加模板「${tpl.name}」（新增 ${count} 項活動）`, true);
          TF.timeline?.scrollToSmartPosition();
        } else if (action === 'delete') {
          if (confirm(`確定要刪除一日模板「${tpl.name}」嗎？`)) {
            TF.store.deleteDayTemplate(tplId);
            if (this.editingDayTplId && this.editingDayTplId.value === tplId) {
              this.saveDayTemplatePanel.hidden = true;
            }
            this.renderDayTemplatesList();
            this.showToast('已刪除一日模板', true);
          }
        }
      });

      // --- Stats Panel Delegation (Desktop & Modal) ---
      [this.statsDesktopEl, this.statsModalBodyEl].forEach((container) => {
        if (!container) return;

        container.addEventListener('click', (e) => {
          const scopeBtn = e.target.closest('[data-stats-scope]');
          if (scopeBtn) {
            TF.store.setStatsScope(scopeBtn.dataset.statsScope);
            return;
          }

          const tabBtn = e.target.closest('[data-stats-mode]');
          if (tabBtn) {
            TF.store.setStatsMode(tabBtn.dataset.statsMode);
            return;
          }

          const dayJumpBtn = e.target.closest('[data-jump-date]');
          if (dayJumpBtn) {
            TF.store.setDate(dayJumpBtn.dataset.jumpDate);
            TF.timeline?.scrollToSmartPosition();
            return;
          }

          const chip = e.target.closest('[data-preset-start]');
          if (chip) {
            const start = Number(chip.dataset.presetStart);
            const end = Number(chip.dataset.presetEnd);
            TF.store.setDiscretionaryWindow(start, end);
            return;
          }
        });

        container.addEventListener('change', (e) => {
          const sel = e.target.closest('.disc-select');
          if (!sel) return;
          const parent = sel.closest('.disc-time-inputs');
          if (!parent) return;
          const startSel = parent.querySelector('[data-disc="start"]');
          const endSel = parent.querySelector('[data-disc="end"]');
          if (startSel && endSel) {
            let start = Number(startSel.value);
            let end = Number(endSel.value);
            if (end <= start) {
              if (sel === startSel) end = Math.min(MINUTES_PER_DAY, start + 60);
              else start = Math.max(0, end - 60);
            }
            TF.store.setDiscretionaryWindow(start, end);
          }
        });
      });

      // --- Modal 9: Version History Modal Actions ---
      this.btnForceRefreshCache?.addEventListener('click', async () => {
        this.showToast(`正在清除舊版快取並檢查更新 (${TF.VERSION})...`);
        try {
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.update()));
          }
        } catch (_) {}
        setTimeout(() => location.reload(), 500);
      });

      this.btnResetAllData?.addEventListener('click', () => {
        if (confirm('確定要將所有活動排程、類別與模板重置為初始示範狀態嗎？')) {
          TF.store.resetToDefault();
          this.closeModal(this.versionModalEl);
          this.showToast('已重置為全新預設示範資料');
        }
      });

      // --- Cloud Sync Events ---
      document.getElementById('btnSyncModal')?.addEventListener('click', () => this.openSyncModal());

      document.getElementById('btnSyncGoogle')?.addEventListener('click', async () => {
        this.setSyncError('');
        if (!TF.sync?.hasConfig()) {
          if (this.syncConfigDetailsEl) this.syncConfigDetailsEl.open = true;
          this.setSyncError('請先於下方貼上 Firebase 的 firebaseConfig 並儲存');
          return;
        }
        const btn = document.getElementById('btnSyncGoogle');
        btn.disabled = true;
        try {
          await TF.sync.signInWithGoogle();
          if (TF.sync.user) {
            this.showToast('Google 登入成功！已啟用跨裝置即時同步');
            this.closeModal(this.syncModalEl);
          }
        } catch (err) {
          this.setSyncError(this.translateAuthError(err));
        } finally {
          btn.disabled = false;
          this.renderSyncStatus();
        }
      });

      this.syncConfigFormEl?.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.setSyncError('');
        const parsed = TF.parseFirebaseConfigInput?.(this.fbConfigInput.value);
        if (!parsed) {
          this.setSyncError('無法解析 firebaseConfig，請確認包含 apiKey 與 projectId');
          return;
        }
        TF.sync.saveConfig(parsed);
        const ok = await TF.sync.connectClient();
        if (ok) {
          this.syncConfigDetailsEl.open = false;
          this.showToast('已儲存 Firebase 設定');
        } else {
          this.setSyncError(TF.sync.lastError || '無法連線');
        }
        this.renderSyncStatus();
      });

      this.syncEmailFormEl?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleEmailAuth('signin');
      });

      document.getElementById('btnSyncEmailUp')?.addEventListener('click', async () => {
        await this.handleEmailAuth('signup');
      });

      document.getElementById('btnSyncPullNow')?.addEventListener('click', async () => {
        const res = await TF.sync?.pullFromCloud({ initialLogin: true });
        if (res === 'updated') this.showToast('已從雲端拉取最新排程');
        else if (res === 'empty') this.showToast('雲端尚無資料');
        else if (res === 'error') this.setSyncError(TF.sync.lastError);
      });

      document.getElementById('btnSyncPushNow')?.addEventListener('click', async () => {
        const ok = await TF.sync?.pushToCloud();
        if (ok) this.showToast('已將本機排程上傳至雲端');
        else this.setSyncError(TF.sync?.lastError);
      });

      document.getElementById('btnCopySyncLink')?.addEventListener('click', async () => {
        const link = TF.sync?.getQuickShareLink();
        if (!link) return;
        try {
          await navigator.clipboard.writeText(link);
          this.showToast('已複製快速設定連結！');
        } catch (_) {
          prompt('請複製以下連結：', link);
        }
      });

      document.getElementById('btnSyncSignOut')?.addEventListener('click', async () => {
        await TF.sync?.signOut();
        this.showToast('已登出雲端同步帳號');
      });
    }

    // ==================== Render Pipeline (Error-Isolated) ====================
    renderAll() {
      try { this.renderVersionLabels(); } catch (e) { console.error('renderVersionLabels error:', e); }
      try { this.renderDateHeader(); } catch (e) { console.error('renderDateHeader error:', e); }
      try { this.renderCategoryFilters(); } catch (e) { console.error('renderCategoryFilters error:', e); }
      try { this.renderTemplates(); } catch (e) { console.error('renderTemplates error:', e); }
      try { this.renderStats(); } catch (e) { console.error('renderStats error:', e); }
      try { this.applyTheme(); } catch (e) { console.error('applyTheme error:', e); }
      try { this.syncZoomButtons(); } catch (e) { console.error('syncZoomButtons error:', e); }
    }

    renderVersionLabels() {
      const ver = TF.VERSION || 'v2.0.0';
      document.querySelectorAll('[data-version-text]').forEach((el) => {
        el.textContent = ver;
      });
    }

    renderDateHeader() {
      const dateKey = TF.store.selectedDate || toDateKey(new Date());
      const info = formatDateDisplay(dateKey);
      if (this.dateLabelEl) this.dateLabelEl.textContent = info.short;
      if (this.dateSubLabelEl) this.dateSubLabelEl.textContent = info.isToday ? '今天' : dateKey;
      if (this.dateInputEl) this.dateInputEl.value = dateKey;
      if (this.todayBtnEl) this.todayBtnEl.classList.toggle('is-today', info.isToday);
      if (this.timelineFullDateBanner) {
        this.timelineFullDateBanner.textContent = `${info.full}${info.isToday ? '（今天）' : ''}`;
      }
      if (this.timelineBlockCountBadge) {
        const blocks = TF.store.getBlocks(dateKey);
        const totalMins = blocks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
        this.timelineBlockCountBadge.textContent = `${blocks.length} 項活動 · 共 ${formatHoursDecimal(totalMins)}`;
      }
    }

    renderCategoryFilters() {
      const categories = TF.store.getCategories();
      const active = TF.store.selectedCategoryFilter;

      const html = [
        `<button type="button" class="cat-filter-pill ${active === 'all' ? 'is-active' : ''}" data-filter-cat="all">全部</button>`,
        ...categories.map((cat) => `
          <button type="button" class="cat-filter-pill ${active === cat.id ? 'is-active' : ''}" data-filter-cat="${cat.id}" style="--pill-color:${cat.color}">
            <span class="cat-dot" style="background:${cat.color}"></span>
            <span>${escapeHtml(cat.name)}</span>
          </button>
        `)
      ].join('');

      if (this.catFilterDesktopEl) this.catFilterDesktopEl.innerHTML = html;
      if (this.catFilterMobileEl) this.catFilterMobileEl.innerHTML = html;

      [this.catFilterDesktopEl, this.catFilterMobileEl].forEach((container) => {
        if (!container) return;
        container.querySelectorAll('[data-filter-cat]').forEach((btn) => {
          btn.addEventListener('click', () => {
            TF.store.setCategoryFilter(btn.dataset.filterCat);
          });
        });
      });
    }

    renderTemplates() {
      const templates = TF.store.getTemplates(TF.store.selectedCategoryFilter);
      const allTemplates = TF.store.getTemplates('all');

      const buildCardHtml = (tpl, compact = false) => {
        const cat = TF.store.getCategoryById(tpl.categoryId);
        const dur = tpl.defaultDuration || DEFAULT_DURATION;
        if (compact) {
          return `
            <div class="dock-card" data-template-id="${tpl.id}" style="--tpl-color:${cat.color}; --tpl-bg:${hexToRgba(cat.color, 0.14)}" title="點擊直接排入時間表，或向上拖曳">
              <span class="dock-card-bar"></span>
              <span class="dock-card-icon">${escapeHtml(cat.icon || '')}</span>
              <span class="dock-card-info">
                <span class="dock-card-title">${escapeHtml(tpl.title)}</span>
                <span class="dock-card-sub">${escapeHtml(cat.name)} · ${formatDuration(dur)}</span>
              </span>
            </div>
          `;
        }
        return `
          <div class="template-card" data-template-id="${tpl.id}" style="--tpl-color:${cat.color}; --tpl-bg:${hexToRgba(cat.color, 0.12)}" title="點擊排入時間表，或按住拖曳至右側時間格">
            <div class="template-card-accent"></div>
            <div class="template-card-body">
              <div class="template-card-top">
                <span class="template-card-icon">${escapeHtml(cat.icon || '')}</span>
                <span class="template-card-title">${escapeHtml(tpl.title)}</span>
              </div>
              <div class="template-card-meta">
                <span class="template-cat-badge" style="color:${cat.color}; background:${hexToRgba(cat.color, 0.14)}">${escapeHtml(cat.name)}</span>
                <span class="template-dur-label">${formatDuration(dur)}</span>
              </div>
            </div>
            <button type="button" class="template-edit-btn" data-tpl-action="edit" data-tpl-id="${tpl.id}" title="編輯或刪除此活動方塊" aria-label="編輯">✏️</button>
          </div>
        `;
      };

      const emptyHtml = `<div class="empty-state">此類別尚無活動方塊，點擊上方「＋ 新增」建立</div>`;
      const listHtml = templates.length ? templates.map((t) => buildCardHtml(t, false)).join('') : emptyHtml;

      if (this.templateListDesktopEl) this.templateListDesktopEl.innerHTML = listHtml;
      if (this.templateListMobileEl) this.templateListMobileEl.innerHTML = listHtml;

      const dockSource = templates.length ? templates : allTemplates;
      if (this.mobileDockEl) {
        this.mobileDockEl.innerHTML = dockSource.map((t) => buildCardHtml(t, true)).join('');
      }

      [this.templateListDesktopEl, this.templateListMobileEl].forEach((container) => {
        if (!container) return;
        container.querySelectorAll('[data-tpl-action="edit"]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openTemplateModal(btn.dataset.tplId);
          });
        });
      });

      // Click-to-Add fallback binding (works in tandem with DnD controller)
      [this.templateListDesktopEl, this.templateListMobileEl, this.mobileDockEl].forEach((container) => {
        if (!container) return;
        container.querySelectorAll('[data-template-id]').forEach((card) => {
          card.addEventListener('click', (e) => {
            if (e.target.closest('[data-tpl-action]')) return;
            const tplId = card.dataset.templateId;
            if (!tplId) return;
            if (card._lastQuickAdd && Date.now() - card._lastQuickAdd < 450) return;
            card._lastQuickAdd = Date.now();
            this.quickAddTemplateToTimeline(tplId);
          });
        });
      });
    }

    /**
     * 智慧點擊排入時間表（Smart Click-to-Add）
     */
    quickAddTemplateToTimeline(templateId) {
      const tpl = TF.store.getTemplateById(templateId);
      if (!tpl) return null;

      const dur = tpl.defaultDuration || DEFAULT_DURATION;
      const dateKey = TF.store.selectedDate || toDateKey(new Date());
      const blocks = TF.store.getBlocks(dateKey);
      const isToday = dateKey === toDateKey(new Date());

      let baseMin = 9 * 60; // 預設從 09:00 開始尋找
      if (isToday) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        baseMin = Math.ceil(nowMin / SNAP_MINUTES) * SNAP_MINUTES;
        if (baseMin + dur > MINUTES_PER_DAY) baseMin = 0;
      }

      const hasCollision = (start, length) => {
        const end = start + length;
        return blocks.some((b) => {
          const bEnd = b.startMinutes + b.durationMinutes;
          return start < bEnd && end > b.startMinutes;
        });
      };

      let chosenStart = null;
      if (!hasCollision(baseMin, dur) && baseMin + dur <= MINUTES_PER_DAY) {
        chosenStart = baseMin;
      }

      if (chosenStart === null) {
        for (let m = baseMin; m <= MINUTES_PER_DAY - dur; m += SNAP_MINUTES) {
          if (!hasCollision(m, dur)) {
            chosenStart = m;
            break;
          }
        }
      }

      if (chosenStart === null) {
        for (let m = 7 * 60; m < baseMin; m += SNAP_MINUTES) {
          if (!hasCollision(m, dur)) {
            chosenStart = m;
            break;
          }
        }
      }

      if (chosenStart === null) {
        for (let m = 0; m < 7 * 60; m += SNAP_MINUTES) {
          if (!hasCollision(m, dur)) {
            chosenStart = m;
            break;
          }
        }
      }

      if (chosenStart === null) {
        if (blocks.length > 0) {
          let maxEnd = 0;
          for (const b of blocks) {
            const end = b.startMinutes + b.durationMinutes;
            if (end > maxEnd) maxEnd = end;
          }
          chosenStart = maxEnd + dur <= MINUTES_PER_DAY
            ? snapMinutes(maxEnd)
            : clamp(baseMin, 0, MINUTES_PER_DAY - dur);
        } else {
          chosenStart = baseMin;
        }
      }

      const block = TF.store.addBlock({
        title: tpl.title,
        categoryId: tpl.categoryId,
        startMinutes: chosenStart,
        durationMinutes: dur
      });

      if (block) {
        TF.store.setSelectedBlock(block.id);
        TF.timeline?.scrollToMinutes?.(chosenStart);
        this.showToast(
          `已排入【${tpl.title}】（${formatTime(chosenStart)} – ${formatTime(chosenStart + dur)}）`,
          true
        );
      }
      return block;
    }

    /**
     * 日 / 週 / 月 × 全天 24H / 自訂可支配時間 完整統計面板
     */
    renderStats() {
      const selectedDate = TF.store.selectedDate || TF.store.state?.selectedDate || toDateKey(new Date());
      const categories = TF.store.getCategories();
      const settings = TF.store.state.settings || {};
      const statsScope = settings.statsScope || 'day'; // 'day' | 'week' | 'month'
      const statsMode = settings.statsMode || 'daily'; // 'daily' | 'discretionary'

      const discStart = settings.discretionaryStart ?? 1140; // 19:00
      const discEnd = settings.discretionaryEnd ?? 1380; // 23:00
      const discDurationPerDay = Math.max(SNAP_MINUTES, discEnd - discStart);

      let targetDates = [];
      let rangeTitle = '';
      let scopeBadge = '';

      if (statsScope === 'week') {
        targetDates = getWeekDates(selectedDate);
        rangeTitle = formatWeekRangeDisplay(selectedDate);
        scopeBadge = '本週（7 天）';
      } else if (statsScope === 'month') {
        targetDates = getMonthDates(selectedDate);
        rangeTitle = formatMonthRangeDisplay(selectedDate);
        scopeBadge = `本月（${targetDates.length} 天）`;
      } else {
        targetDates = [selectedDate];
        const disp = formatDateDisplay(selectedDate);
        rangeTitle = disp.full || disp.short || selectedDate;
        scopeBadge = disp.isToday ? '今日' : '指定日';
      }

      const numDays = Math.max(1, targetDates.length);
      const totalWindowMins = statsMode === 'daily'
        ? numDays * MINUTES_PER_DAY
        : numDays * discDurationPerDay;

      const totalsByCat = new Map();
      let totalScheduledMins = 0;
      const dailySummaries = [];

      for (const d of targetDates) {
        const blocks = TF.store.getBlocks(d);
        let dayScheduledMins = 0;

        for (const b of blocks) {
          if (statsMode === 'daily') {
            totalScheduledMins += b.durationMinutes;
            dayScheduledMins += b.durationMinutes;
            totalsByCat.set(b.categoryId, (totalsByCat.get(b.categoryId) || 0) + b.durationMinutes);
          } else {
            const bStart = b.startMinutes;
            const bEnd = b.startMinutes + b.durationMinutes;
            const overlap = Math.max(0, Math.min(bEnd, discEnd) - Math.max(bStart, discStart));
            if (overlap > 0) {
              totalScheduledMins += overlap;
              dayScheduledMins += overlap;
              totalsByCat.set(b.categoryId, (totalsByCat.get(b.categoryId) || 0) + overlap);
            }
          }
        }

        const dayWindow = statsMode === 'daily' ? MINUTES_PER_DAY : discDurationPerDay;
        const dayFree = Math.max(0, dayWindow - dayScheduledMins);
        dailySummaries.push({
          dateKey: d,
          scheduledMins: dayScheduledMins,
          freeMins: dayFree,
          windowMins: dayWindow,
          isCurrentSelected: d === selectedDate
        });
      }

      const totalFreeMins = Math.max(0, totalWindowMins - totalScheduledMins);

      // Scope Tabs (日 / 週 / 月)
      const scopeTabsHtml = `
        <div class="stats-scope-tabs" role="tablist" aria-label="統計週期切換">
          <button type="button" class="stats-scope-btn ${statsScope === 'day' ? 'is-active' : ''}" data-stats-scope="day">📅 日統計</button>
          <button type="button" class="stats-scope-btn ${statsScope === 'week' ? 'is-active' : ''}" data-stats-scope="week">📊 週統計</button>
          <button type="button" class="stats-scope-btn ${statsScope === 'month' ? 'is-active' : ''}" data-stats-scope="month">🗓️ 月統計</button>
        </div>
      `;

      // Mode Tabs (全天 24H / 可支配時間)
      const modeTabsHtml = `
        <div class="stats-mode-tabs" role="tablist" aria-label="統計維度切換">
          <button type="button" class="stats-tab-btn ${statsMode === 'daily' ? 'is-active' : ''}" data-stats-mode="daily">全天（24 小時）</button>
          <button type="button" class="stats-tab-btn ${statsMode === 'discretionary' ? 'is-active' : ''}" data-stats-mode="discretionary">可支配時間（自由時段）</button>
        </div>
      `;

      const bannerHtml = `
        <div class="stats-scope-banner">
          <div class="stats-scope-info">
            <span class="stats-scope-range">${escapeHtml(rangeTitle)}</span>
            <span class="stats-scope-badge">${escapeHtml(scopeBadge)}</span>
          </div>
        </div>
      `;

      // Discretionary Time Window Selector
      let discControlsHtml = '';
      if (statsMode === 'discretionary') {
        const startOptions = [];
        for (let m = 0; m < MINUTES_PER_DAY; m += 30) {
          startOptions.push(`<option value="${m}" ${m === discStart ? 'selected' : ''}>${formatTime(m)}</option>`);
        }
        const endOptions = [];
        for (let m = 30; m <= MINUTES_PER_DAY; m += 30) {
          endOptions.push(`<option value="${m}" ${m === discEnd ? 'selected' : ''}>${formatTime(m)}</option>`);
        }

        const presets = [
          { label: '晚間 19:00-23:00', start: 1140, end: 1380 },
          { label: '晨間 06:00-09:00', start: 360, end: 540 },
          { label: '午後 13:00-18:00', start: 780, end: 1080 },
          { label: '白日 09:00-18:00', start: 540, end: 1080 },
          { label: '清醒 07:00-23:00', start: 420, end: 1380 }
        ];

        const presetChipsHtml = presets.map((p) => {
          const isActive = p.start === discStart && p.end === discEnd;
          return `
            <button type="button" class="disc-chip ${isActive ? 'is-active' : ''}" data-preset-start="${p.start}" data-preset-end="${p.end}">
              ${escapeHtml(p.label)}
            </button>
          `;
        }).join('');

        discControlsHtml = `
          <div class="disc-controls">
            <div class="disc-header-row">
              <span class="disc-label">自訂可支配時段：</span>
              <span class="disc-cur-duration">每日 ${formatDuration(discDurationPerDay)}</span>
            </div>
            <div class="disc-time-inputs">
              <select class="disc-select" data-disc="start">${startOptions.join('')}</select>
              <span class="disc-to-label">至</span>
              <select class="disc-select" data-disc="end">${endOptions.join('')}</select>
            </div>
            <div class="disc-presets-row">
              ${presetChipsHtml}
            </div>
          </div>
        `;
      }

      // Summary Metrics
      const isMultiDay = numDays > 1;
      const dailyAvgScheduled = isMultiDay ? totalScheduledMins / numDays : null;
      const dailyAvgFree = isMultiDay ? totalFreeMins / numDays : null;

      const summaryCardsHtml = `
        <div class="stats-summary-cards ${isMultiDay ? 'has-averages' : ''}">
          <div class="stats-metric">
            <span class="stats-metric-label">${isMultiDay ? '期間總時數' : '時段總長'}</span>
            <span class="stats-metric-val is-muted">${formatHoursDecimal(totalWindowMins)}</span>
          </div>
          <div class="stats-metric">
            <span class="stats-metric-label">已排程</span>
            <span class="stats-metric-val">${formatHoursDecimal(totalScheduledMins)}</span>
            ${isMultiDay ? `<span class="stats-metric-sub">日均 ${formatHoursDecimal(dailyAvgScheduled)}</span>` : ''}
          </div>
          <div class="stats-metric">
            <span class="stats-metric-label">${statsMode === 'discretionary' ? '可支配剩餘' : '未排程空檔'}</span>
            <span class="stats-metric-val is-free">${formatHoursDecimal(totalFreeMins)}</span>
            ${isMultiDay ? `<span class="stats-metric-sub is-free">日均 ${formatHoursDecimal(dailyAvgFree)}</span>` : ''}
          </div>
        </div>
      `;

      // Week 7-Day Bar Chart
      let weekChartHtml = '';
      if (statsScope === 'week' && dailySummaries.length === 7) {
        const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
        const barCols = dailySummaries.map((ds, idx) => {
          const dayNumber = parseInt(ds.dateKey.slice(8), 10);
          const pct = Math.min(100, ds.windowMins > 0 ? (ds.scheduledMins / ds.windowMins) * 100 : 0);
          const isSelected = ds.isCurrentSelected;
          return `
            <div class="week-chart-col ${isSelected ? 'is-selected' : ''}" data-jump-date="${ds.dateKey}" title="${ds.dateKey} (週${dayNames[idx]}): 已排程 ${formatDuration(ds.scheduledMins)} (點擊切換至此日)">
              <span class="week-col-hrs">${formatHoursDecimal(ds.scheduledMins)}</span>
              <div class="week-col-bar-wrap">
                <div class="week-col-bar-fill" style="height: ${pct.toFixed(1)}%;"></div>
              </div>
              <div class="week-col-label">
                <span class="week-col-dow">${dayNames[idx]}</span>
                <span class="week-col-dom">${dayNumber}</span>
              </div>
            </div>
          `;
        }).join('');

        weekChartHtml = `
          <div class="week-mini-chart-card">
            <div class="week-chart-header">
              <span class="week-chart-title">本週七日排程趨勢</span>
              <span class="week-chart-hint">點擊長條可切換日期</span>
            </div>
            <div class="week-chart-bars">
              ${barCols}
            </div>
          </div>
        `;
      }

      // Month Weekly Overview Chart
      let monthChartHtml = '';
      if (statsScope === 'month' && targetDates.length > 0) {
        const weekChunks = [];
        for (let i = 0; i < targetDates.length; i += 7) {
          const chunkDates = targetDates.slice(i, i + 7);
          let chunkScheduled = 0;
          for (const cd of chunkDates) {
            const blks = TF.store.getBlocks(cd);
            for (const b of blks) {
              if (statsMode === 'daily') {
                chunkScheduled += b.durationMinutes;
              } else {
                const overlap = Math.max(0, Math.min(b.startMinutes + b.durationMinutes, discEnd) - Math.max(b.startMinutes, discStart));
                if (overlap > 0) chunkScheduled += overlap;
              }
            }
          }
          const chunkWindow = chunkDates.length * (statsMode === 'daily' ? MINUTES_PER_DAY : discDurationPerDay);
          const startDom = parseInt(chunkDates[0].slice(8), 10);
          const endDom = parseInt(chunkDates[chunkDates.length - 1].slice(8), 10);
          weekChunks.push({
            label: `第 ${weekChunks.length + 1} 週 (${startDom}~${endDom}日)`,
            shortLabel: `W${weekChunks.length + 1}`,
            scheduledMins: chunkScheduled,
            windowMins: chunkWindow,
            pct: chunkWindow > 0 ? (chunkScheduled / chunkWindow) * 100 : 0
          });
        }

        const weekBars = weekChunks.map((wc) => `
          <div class="month-chart-col" title="${wc.label}: 已排程 ${formatHoursDecimal(wc.scheduledMins)} (${wc.pct.toFixed(1)}%)">
            <span class="month-col-hrs">${formatHoursDecimal(wc.scheduledMins)}</span>
            <div class="month-col-bar-wrap">
              <div class="month-col-bar-fill" style="height: ${Math.min(100, wc.pct).toFixed(1)}%;"></div>
            </div>
            <span class="month-col-label">${wc.shortLabel}</span>
          </div>
        `).join('');

        monthChartHtml = `
          <div class="week-mini-chart-card month-chart-card">
            <div class="week-chart-header">
              <span class="week-chart-title">本月各週時間投入走勢</span>
              <span class="week-chart-hint">共 ${weekChunks.length} 週</span>
            </div>
            <div class="week-chart-bars month-chart-bars">
              ${weekBars}
            </div>
          </div>
        `;
      }

      // Distribution Progress Bar
      const breakdown = categories
        .map((cat) => ({
          cat,
          minutes: totalsByCat.get(cat.id) || 0
        }))
        .filter((item) => item.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);

      const barSegments = [
        ...breakdown.map((item) => {
          const pct = totalWindowMins > 0 ? (item.minutes / totalWindowMins) * 100 : 0;
          return `<div class="stats-bar-seg" style="width:${pct.toFixed(2)}%; background:${item.cat.color}" title="${escapeHtml(item.cat.name)}: ${formatDuration(item.minutes)}"></div>`;
        }),
        totalFreeMins > 0
          ? `<div class="stats-bar-seg is-free-seg" style="width:${((totalFreeMins / totalWindowMins) * 100).toFixed(2)}%" title="未排程自由時間: ${formatDuration(totalFreeMins)}"></div>`
          : ''
      ].join('');

      const barTrackHtml = `
        <div class="stats-bar-container">
          <div class="stats-bar-track" aria-label="時間分配比例">
            ${barSegments}
          </div>
        </div>
      `;

      // Category Breakdown List
      let listRows = '';
      if (breakdown.length === 0 && totalScheduledMins === 0) {
        listRows = `<div class="empty-state">${statsScope === 'day' ? '今日' : statsScope === 'week' ? '本週' : '本月'}在此區間尚未安排任何活動</div>`;
      } else {
        const catRows = breakdown.map((item) => {
          const pct = totalWindowMins > 0 ? Math.round((item.minutes / totalWindowMins) * 100) : 0;
          const avgPerDayStr = isMultiDay ? `<span class="stats-sub-hrs">日均 ${formatHoursDecimal(item.minutes / numDays)}</span>` : '';
          return `
            <div class="stats-row">
              <div class="stats-row-left">
                <span class="cat-dot" style="background:${item.cat.color}"></span>
                <span class="stats-cat-icon">${escapeHtml(item.cat.icon || '')}</span>
                <span class="stats-cat-name">${escapeHtml(item.cat.name)}</span>
              </div>
              <div class="stats-row-right">
                <div class="stats-val-group">
                  <span class="stats-hrs">${formatHoursDecimal(item.minutes)}</span>
                  ${avgPerDayStr}
                </div>
                <span class="stats-pct">${pct}%</span>
              </div>
            </div>
          `;
        }).join('');

        const freeRow = statsMode === 'discretionary' ? `
          <div class="stats-row is-free-row">
            <div class="stats-row-left">
              <span class="cat-dot" style="background:#10B981"></span>
              <span class="stats-cat-icon">🌱</span>
              <span class="stats-cat-name" style="font-weight:700; color:#10B981;">可支配自由時間</span>
            </div>
            <div class="stats-row-right">
              <div class="stats-val-group">
                <span class="stats-hrs" style="color:#10B981;">${formatHoursDecimal(totalFreeMins)}</span>
                ${isMultiDay ? `<span class="stats-sub-hrs" style="color:#10B981;">日均 ${formatHoursDecimal(dailyAvgFree)}</span>` : ''}
              </div>
              <span class="stats-pct" style="color:#10B981; font-weight:700;">${totalWindowMins > 0 ? Math.round((totalFreeMins / totalWindowMins) * 100) : 0}%</span>
            </div>
          </div>
        ` : '';

        listRows = catRows + freeRow;
      }

      const listHtml = `<div class="stats-list">${listRows}</div>`;

      const scopeTitleMap = {
        day: '📅 日統計 · 時間分配',
        week: '📊 週統計 · 時間分配',
        month: '🗓️ 月統計 · 時間分配'
      };
      const scopeSubMap = {
        day: '全天 24 小時與可支配時間分析',
        week: `本週時間分配（${rangeTitle}）`,
        month: `全月時間分配（${rangeTitle}）`
      };
      if (this.statsDesktopHeading) this.statsDesktopHeading.textContent = scopeTitleMap[statsScope] || '時間分配統計';
      if (this.statsDesktopSubHeading) this.statsDesktopSubHeading.textContent = scopeSubMap[statsScope] || '';
      if (this.statsModalTitleEl) this.statsModalTitleEl.textContent = scopeTitleMap[statsScope] || '時間分配統計';

      const fullHtml = `
        ${scopeTabsHtml}
        ${modeTabsHtml}
        ${bannerHtml}
        ${discControlsHtml}
        ${summaryCardsHtml}
        ${weekChartHtml}
        ${monthChartHtml}
        ${barTrackHtml}
        ${listHtml}
      `;

      if (this.statsDesktopEl) this.statsDesktopEl.innerHTML = fullHtml;
      if (this.statsModalBodyEl) this.statsModalBodyEl.innerHTML = fullHtml;
    }

    // ==================== Modal Engine (Zero Invisible Blockers) ====================
    openModal(modalEl) {
      if (!modalEl) return;
      modalEl.removeAttribute('hidden');
      modalEl.classList.add('is-open');
    }

    closeModal(modalEl) {
      if (!modalEl) return;
      modalEl.classList.remove('is-open');
    }

    closeAllModals() {
      document.querySelectorAll('.modal-backdrop.is-open').forEach((m) => {
        m.classList.remove('is-open');
      });
      this.closeMobileDrawer();
    }

    openMobileDrawer() {
      this.mobileDrawerEl?.classList.add('is-open');
      this.mobileDrawerBackdropEl?.classList.add('is-open');
    }

    closeMobileDrawer() {
      this.mobileDrawerEl?.classList.remove('is-open');
      this.mobileDrawerBackdropEl?.classList.remove('is-open');
    }

    // --- Modal 1: Block Editor ---
    openBlockModal(blockId = null, defaults = {}) {
      this.editingBlockId = blockId;
      const block = blockId ? TF.store.getBlockById(blockId) : null;
      const categories = TF.store.getCategories();

      const title = block ? block.title : (defaults.title || '');
      const catId = block ? block.categoryId : (defaults.categoryId || categories[0]?.id);
      const start = block ? block.startMinutes : (defaults.startMinutes ?? 540);
      const duration = block ? block.durationMinutes : (defaults.durationMinutes ?? DEFAULT_DURATION);
      const end = Math.min(MINUTES_PER_DAY, start + duration);
      const note = block ? (block.note || '') : '';

      if (this.blockModalTitleEl) this.blockModalTitleEl.textContent = block ? '✏️ 編輯活動方塊' : '＋ 新增活動方塊';
      if (this.blockTitleInput) this.blockTitleInput.value = title;
      if (this.blockStartSelect) this.blockStartSelect.value = String(start);
      if (this.blockEndSelect) this.blockEndSelect.value = String(end);
      if (this.blockNoteInput) this.blockNoteInput.value = note;
      if (this.btnDeleteBlockModal) this.btnDeleteBlockModal.hidden = !block;

      if (this.blockCategoryPicker) {
        this.blockCategoryPicker.innerHTML = categories.map((cat) => `
          <button type="button" class="cat-pick-pill ${cat.id === catId ? 'is-active' : ''}" data-cat-id="${cat.id}" style="--pill-color:${cat.color}">
            <span class="cat-dot" style="background:${cat.color}"></span>
            <span>${escapeHtml(cat.icon || '')} ${escapeHtml(cat.name)}</span>
          </button>
        `).join('');
      }

      this.highlightActiveDurationChip();
      this.openModal(this.blockModalEl);
      setTimeout(() => this.blockTitleInput?.focus(), 60);
    }

    highlightActiveDurationChip() {
      if (!this.blockDurationChips || !this.blockStartSelect || !this.blockEndSelect) return;
      const dur = Number(this.blockEndSelect.value) - Number(this.blockStartSelect.value);
      this.blockDurationChips.querySelectorAll('[data-dur]').forEach((chip) => {
        chip.classList.toggle('is-active', Number(chip.dataset.dur) === dur);
      });
    }

    // --- Modal 2: Category Manager ---
    openCategoryModal() {
      this.closeMobileDrawer();
      this.resetCategoryForm();
      this.renderCategoryManagerList();
      this.openModal(this.categoryModalEl);
    }

    resetCategoryForm() {
      this.editingCategoryId = null;
      if (this.catNameInput) this.catNameInput.value = '';
      if (this.catColorInput) this.catColorInput.value = '#2563EB';
      if (this.catIconInput) this.catIconInput.value = '🏷️';
      if (this.catFormSubmitBtn) this.catFormSubmitBtn.textContent = '新增類別';
      if (this.catFormCancelEditBtn) this.catFormCancelEditBtn.hidden = true;
      this.syncCategorySwatchSelection();
    }

    syncCategorySwatchSelection() {
      if (!this.catColorSwatches || !this.catIconSwatches) return;
      const curColor = (this.catColorInput?.value || '').toLowerCase();
      const curIcon = (this.catIconInput?.value || '').trim();
      this.catColorSwatches.querySelectorAll('.color-swatch').forEach((sw) => {
        sw.classList.toggle('is-active', sw.dataset.color.toLowerCase() === curColor);
      });
      this.catIconSwatches.querySelectorAll('.icon-swatch').forEach((sw) => {
        sw.classList.toggle('is-active', sw.dataset.icon === curIcon);
      });
    }

    renderCategoryManagerList() {
      if (!this.categoryListEl) return;
      const categories = TF.store.getCategories();
      this.categoryListEl.innerHTML = categories.map((cat) => `
        <div class="cat-manager-row">
          <div class="cat-manager-info">
            <span class="cat-color-badge" style="background:${cat.color}">${escapeHtml(cat.icon || '🏷️')}</span>
            <span class="cat-manager-name">${escapeHtml(cat.name)}</span>
          </div>
          <div class="cat-manager-actions">
            <button type="button" class="btn-ghost-sm" data-cat-action="edit" data-cat-id="${cat.id}">編輯</button>
            <button type="button" class="btn-ghost-sm is-danger" data-cat-action="delete" data-cat-id="${cat.id}">刪除</button>
          </div>
        </div>
      `).join('');
    }

    // --- Modal 3: Activity Template Editor ---
    openTemplateModal(templateId = null) {
      this.closeMobileDrawer();
      this.editingTemplateId = templateId;
      const tpl = templateId ? TF.store.getTemplateById(templateId) : null;
      const categories = TF.store.getCategories();

      if (this.tplCategorySelect) {
        this.tplCategorySelect.innerHTML = categories
          .map((c) => `<option value="${c.id}">${escapeHtml(c.icon || '')} ${escapeHtml(c.name)}</option>`)
          .join('');
      }

      if (tpl) {
        if (this.templateModalTitleEl) this.templateModalTitleEl.textContent = '✏️ 編輯活動方塊';
        if (this.tplTitleInput) this.tplTitleInput.value = tpl.title;
        if (this.tplCategorySelect) this.tplCategorySelect.value = tpl.categoryId;
        if (this.tplDurationSelect) this.tplDurationSelect.value = String(tpl.defaultDuration || DEFAULT_DURATION);
        if (this.btnDeleteTemplateModal) this.btnDeleteTemplateModal.hidden = false;
      } else {
        if (this.templateModalTitleEl) this.templateModalTitleEl.textContent = '＋ 新增活動方塊';
        if (this.tplTitleInput) this.tplTitleInput.value = '';
        const defaultCat = TF.store.selectedCategoryFilter !== 'all'
          ? TF.store.selectedCategoryFilter
          : categories[0]?.id;
        if (this.tplCategorySelect && defaultCat) this.tplCategorySelect.value = defaultCat;
        if (this.tplDurationSelect) this.tplDurationSelect.value = String(DEFAULT_DURATION);
        if (this.btnDeleteTemplateModal) this.btnDeleteTemplateModal.hidden = true;
      }

      this.openModal(this.templateModalEl);
      setTimeout(() => this.tplTitleInput?.focus(), 60);
    }

    // --- Modal 4: Statistics Modal ---
    openStatsModal() {
      this.closeMobileDrawer();
      this.renderStats();
      this.openModal(this.statsModalEl);
    }

    // --- Modal 6: Calendar Picker Modal ---
    openCalendarModal() {
      this.closeMobileDrawer();
      const parsed = parseDateKey(TF.store.selectedDate);
      this.calYear = parsed.getFullYear();
      this.calMonth = parsed.getMonth();
      this.renderCalendarMonth();
      this.openModal(this.calendarModalEl);
    }

    shiftCalendarMonth(delta) {
      this.calMonth += delta;
      if (this.calMonth < 0) {
        this.calMonth = 11;
        this.calYear -= 1;
      } else if (this.calMonth > 11) {
        this.calMonth = 0;
        this.calYear += 1;
      }
      this.renderCalendarMonth();
    }

    renderCalendarMonth() {
      if (!this.calendarGridDays || !this.calendarModalMonthLabel) return;
      this.calendarModalMonthLabel.textContent = `${this.calYear} 年 ${this.calMonth + 1} 月`;

      const firstDayOfMonth = new Date(this.calYear, this.calMonth, 1).getDay();
      const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
      const daysInPrevMonth = new Date(this.calYear, this.calMonth, 0).getDate();

      const todayKey = toDateKey(new Date());
      const selectedKey = TF.store.selectedDate;
      const cells = [];

      for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        const prevMonth = this.calMonth === 0 ? 11 : this.calMonth - 1;
        const prevYear = this.calMonth === 0 ? this.calYear - 1 : this.calYear;
        const dKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasEvents = TF.store.hasEventsOnDate(dKey);
        cells.push(`
          <button type="button" class="cal-day-cell is-other-month ${dKey === selectedKey ? 'is-selected' : ''}" data-cal-date="${dKey}">
            <span class="cal-day-num">${d}</span>
            ${hasEvents ? '<span class="cal-event-dot"></span>' : ''}
          </button>
        `);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const dKey = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dKey === todayKey;
        const isSelected = dKey === selectedKey;
        const hasEvents = TF.store.hasEventsOnDate(dKey);

        const classes = ['cal-day-cell'];
        if (isToday) classes.push('is-today');
        if (isSelected) classes.push('is-selected');

        cells.push(`
          <button type="button" class="${classes.join(' ')}" data-cal-date="${dKey}">
            <span class="cal-day-num">${d}</span>
            ${hasEvents ? '<span class="cal-event-dot"></span>' : ''}
          </button>
        `);
      }

      const totalCells = cells.length;
      const needed = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
      for (let d = 1; d <= needed; d++) {
        const nextMonth = this.calMonth === 11 ? 0 : this.calMonth + 1;
        const nextYear = this.calMonth === 11 ? this.calYear + 1 : this.calYear;
        const dKey = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasEvents = TF.store.hasEventsOnDate(dKey);
        cells.push(`
          <button type="button" class="cal-day-cell is-other-month ${dKey === selectedKey ? 'is-selected' : ''}" data-cal-date="${dKey}">
            <span class="cal-day-num">${d}</span>
            ${hasEvents ? '<span class="cal-event-dot"></span>' : ''}
          </button>
        `);
      }

      this.calendarGridDays.innerHTML = cells.join('');
    }

    // --- Modal 7 & 8: Day Templates & Schedule List Editor ---
    openDayTemplateModal() {
      this.closeMobileDrawer();
      if (this.saveDayTemplatePanel) this.saveDayTemplatePanel.hidden = true;
      this.renderDayTemplatesList();
      this.openModal(this.dayTemplateModalEl);
    }

    renderDayTemplatesList() {
      if (!this.dayTemplateListEl) return;
      const templates = TF.store.getDayTemplates();

      if (!templates || templates.length === 0) {
        this.dayTemplateListEl.innerHTML = `
          <div class="empty-state">尚無一日活動模板，請點擊上方「＋ 建立空白模板」或「📋 依今日排程建立」</div>
        `;
        return;
      }

      this.dayTemplateListEl.innerHTML = templates.map((tpl) => {
        const sortedBlocks = [...(tpl.blocks || [])].sort((a, b) => a.startMinutes - b.startMinutes);
        const totalMins = sortedBlocks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);

        const blockChips = sortedBlocks.slice(0, 8).map((b) => {
          const cat = TF.store.getCategoryById(b.categoryId);
          return `
            <span class="day-tpl-chip" style="color:${cat.color}; background:${hexToRgba(cat.color, 0.12)}; border-color:${hexToRgba(cat.color, 0.3)}">
              ${formatTime(b.startMinutes)} ${escapeHtml(b.title)}
            </span>
          `;
        }).join('');
        const moreChip = sortedBlocks.length > 8
          ? `<span class="day-tpl-chip is-more">+${sortedBlocks.length - 8} 項...</span>`
          : '';

        return `
          <div class="day-tpl-card">
            <div class="day-tpl-card-header">
              <div class="day-tpl-title-row">
                <span class="day-tpl-icon">${escapeHtml(tpl.icon || '📅')}</span>
                <div>
                  <h4 class="day-tpl-name">${escapeHtml(tpl.name)}</h4>
                  <span class="day-tpl-count">${sortedBlocks.length} 個時段 · 總計 ${formatHoursDecimal(totalMins)}</span>
                </div>
              </div>
            </div>
            <div class="day-tpl-card-desc">${escapeHtml(tpl.description || '')}</div>
            <div class="day-tpl-chips-preview">${blockChips}${moreChip}</div>
            <div class="day-tpl-card-actions">
              <div class="day-tpl-actions-left">
                <button type="button" class="btn-ghost-sm is-danger" data-day-tpl-action="delete" data-tpl-id="${tpl.id}">🗑️ 刪除</button>
                <button type="button" class="btn-ghost-sm" data-day-tpl-action="edit" data-tpl-id="${tpl.id}">✏️ 編輯時間列表</button>
              </div>
              <div class="day-tpl-actions-right">
                <button type="button" class="btn-sm-secondary" data-day-tpl-action="apply-append" data-tpl-id="${tpl.id}">追加至今日</button>
                <button type="button" class="btn-sm-primary" data-day-tpl-action="apply-replace" data-tpl-id="${tpl.id}">覆蓋套用</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    openDayTemplateScheduleEditor(tplId = null, initMode = 'blank') {
      if (!this.saveDayTemplatePanel) return;

      if (tplId) {
        const tpl = TF.store.getDayTemplateById(tplId);
        if (!tpl) return;
        if (this.editingDayTplId) this.editingDayTplId.value = tpl.id;
        if (this.dayTplFormTitle) this.dayTplFormTitle.textContent = `✏️ 編輯一日模板「${tpl.name}」的時間列表`;
        if (this.newDayTplName) this.newDayTplName.value = tpl.name;
        if (this.newDayTplIcon) this.newDayTplIcon.value = tpl.icon || '📅';
        if (this.newDayTplDesc) this.newDayTplDesc.value = tpl.description || '';
        if (this.btnSubmitDayTemplate) this.btnSubmitDayTemplate.textContent = '儲存模板修改';

        this.editingTemplateSchedule = (tpl.blocks || [])
          .map((b) => ({
            title: b.title || '未命名活動',
            categoryId: b.categoryId || 'cat_work',
            startMinutes: Number(b.startMinutes) || 0,
            durationMinutes: Number(b.durationMinutes) || 60,
            note: b.note || ''
          }))
          .sort((a, b) => a.startMinutes - b.startMinutes);
      } else {
        if (this.editingDayTplId) this.editingDayTplId.value = '';
        if (this.newDayTplName) this.newDayTplName.value = '';
        if (this.newDayTplIcon) this.newDayTplIcon.value = '📅';
        if (this.newDayTplDesc) this.newDayTplDesc.value = '';
        if (this.btnSubmitDayTemplate) this.btnSubmitDayTemplate.textContent = '建立並儲存模板';

        if (initMode === 'today') {
          if (this.dayTplFormTitle) this.dayTplFormTitle.textContent = '📋 依今日排程建立新模板';
          const currentBlocks = TF.store.getBlocks();
          this.editingTemplateSchedule = currentBlocks
            .map((b) => ({
              title: b.title,
              categoryId: b.categoryId,
              startMinutes: b.startMinutes,
              durationMinutes: b.durationMinutes,
              note: b.note || ''
            }))
            .sort((a, b) => a.startMinutes - b.startMinutes);
        } else {
          if (this.dayTplFormTitle) this.dayTplFormTitle.textContent = '＋ 建立全新一日活動模板';
          this.editingTemplateSchedule = [
            { title: '上午核心工作', categoryId: 'cat_work', startMinutes: 540, durationMinutes: 180, note: '' },
            { title: '午餐與午休', categoryId: 'cat_life', startMinutes: 720, durationMinutes: 90, note: '' },
            { title: '下午專注執行', categoryId: 'cat_work', startMinutes: 810, durationMinutes: 240, note: '' }
          ];
        }
      }

      this.renderDayTemplateScheduleEditor();
      this.saveDayTemplatePanel.hidden = false;
      this.saveDayTemplatePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    renderDayTemplateScheduleEditor() {
      if (!this.dayTplScheduleList) return;
      const list = this.editingTemplateSchedule || [];

      if (list.length === 0) {
        this.dayTplScheduleList.innerHTML = `
          <div class="day-tpl-schedule-empty">
            目前時間列表尚無活動時段，請點擊下方「＋ 新增活動時段」或上方「📋 帶入今日排程」
          </div>
        `;
        this.updateDayTemplateScheduleSummary();
        return;
      }

      this.dayTplScheduleList.innerHTML = list.map((item, idx) => {
        const cat = TF.store.getCategoryById(item.categoryId);
        const startStr = formatTime(item.startMinutes);
        const endStr = formatTime(Math.min(MINUTES_PER_DAY, item.startMinutes + item.durationMinutes));

        return `
          <div class="day-tpl-item-card" data-row-idx="${idx}" style="--item-color:${cat.color}; --item-bg:${hexToRgba(cat.color, 0.1)}" title="點擊開啟標準活動方塊編輯器">
            <div class="day-tpl-item-accent" style="background:${cat.color}"></div>
            <div class="day-tpl-item-time">
              <span class="day-tpl-item-time-badge">${startStr} – ${endStr}</span>
            </div>
            <div class="day-tpl-item-main">
              <div class="day-tpl-item-title-row">
                <span class="day-tpl-item-cat-pill" style="color:${cat.color}; background:${hexToRgba(cat.color, 0.15)}">
                  ${escapeHtml(cat.icon || '')} ${escapeHtml(cat.name)}
                </span>
                <span class="day-tpl-item-title">${escapeHtml(item.title)}</span>
              </div>
              ${item.note ? `<div class="day-tpl-item-note">${escapeHtml(item.note)}</div>` : ''}
            </div>
            <div class="day-tpl-item-dur">${formatDuration(item.durationMinutes)}</div>
            <div class="day-tpl-item-actions">
              <button type="button" class="btn-xs-secondary" data-row-action="edit" data-row-idx="${idx}">✏️ 編輯</button>
              <button type="button" class="btn-row-del" data-row-action="delete" data-row-idx="${idx}" title="刪除此時段">✕</button>
            </div>
          </div>
        `;
      }).join('');

      this.updateDayTemplateScheduleSummary();
    }

    openDayTplBlockModal(itemIndex = null) {
      this.editingTplBlockIdx = itemIndex;
      const categories = TF.store.getCategories();
      const list = this.editingTemplateSchedule || [];
      const item = itemIndex !== null && itemIndex >= 0 ? list[itemIndex] : null;

      const title = item ? item.title : '';
      const catId = item ? item.categoryId : (categories[0]?.id || 'cat_work');
      let start = item ? item.startMinutes : 540;
      const duration = item ? item.durationMinutes : DEFAULT_DURATION;

      if (!item && list.length > 0) {
        const last = list[list.length - 1];
        const nextStart = last.startMinutes + last.durationMinutes;
        if (nextStart < MINUTES_PER_DAY) start = nextStart;
      }

      const end = Math.min(MINUTES_PER_DAY, start + duration);
      const note = item ? (item.note || '') : '';

      if (this.dayTplBlockModalTitle) {
        this.dayTplBlockModalTitle.textContent = item ? '✏️ 編輯模板活動時段' : '＋ 新增模板活動時段';
      }
      if (this.dayTplBlockTitleInput) this.dayTplBlockTitleInput.value = title;
      if (this.dayTplBlockStartSelect) this.dayTplBlockStartSelect.value = String(start);
      if (this.dayTplBlockEndSelect) this.dayTplBlockEndSelect.value = String(end);
      if (this.dayTplBlockNoteInput) this.dayTplBlockNoteInput.value = note;
      if (this.btnDeleteDayTplBlock) this.btnDeleteDayTplBlock.hidden = !item;

      if (this.dayTplBlockCategoryPicker) {
        this.dayTplBlockCategoryPicker.innerHTML = categories.map((cat) => `
          <button type="button" class="cat-pick-pill ${cat.id === catId ? 'is-active' : ''}" data-cat-id="${cat.id}" style="--pill-color:${cat.color}">
            <span class="cat-dot" style="background:${cat.color}"></span>
            <span>${escapeHtml(cat.icon || '')} ${escapeHtml(cat.name)}</span>
          </button>
        `).join('');
      }

      this.highlightActiveDayTplDurationChip();
      this.openModal(this.dayTplBlockModalEl);
      setTimeout(() => this.dayTplBlockTitleInput?.focus(), 60);
    }

    highlightActiveDayTplDurationChip() {
      if (!this.dayTplBlockDurationChips || !this.dayTplBlockStartSelect || !this.dayTplBlockEndSelect) return;
      const dur = Number(this.dayTplBlockEndSelect.value) - Number(this.dayTplBlockStartSelect.value);
      this.dayTplBlockDurationChips.querySelectorAll('[data-dur]').forEach((chip) => {
        chip.classList.toggle('is-active', Number(chip.dataset.dur) === dur);
      });
    }

    updateDayTemplateScheduleSummary() {
      if (!this.dayTplScheduleSummary) return;
      const list = this.editingTemplateSchedule || [];
      const totalMins = list.reduce((acc, item) => acc + (item.durationMinutes || 0), 0);
      this.dayTplScheduleSummary.textContent = `共 ${list.length} 項活動安排 · 排程總長 ${formatHoursDecimal(totalMins)}（${formatDuration(totalMins)}）`;
    }

    // --- Modal 9: Detailed Version History & Changelog ---
    openVersionModal() {
      this.closeMobileDrawer();
      this.renderVersionChangelog();
      this.openModal(this.versionModalEl);
    }

    renderVersionChangelog() {
      if (!this.versionChangelogListEl) return;
      const history = TF.VERSION_HISTORY || [];

      this.versionChangelogListEl.innerHTML = history.map((item) => `
        <div class="changelog-card ${item.isCurrent ? 'is-current' : ''}">
          <div class="changelog-card-header">
            <div class="changelog-ver-group">
              <span class="changelog-ver-code">${escapeHtml(item.version)}</span>
              <span class="changelog-ver-tag ${item.isCurrent ? 'is-current-tag' : ''}">${escapeHtml(item.tag)}</span>
            </div>
            <span class="changelog-ver-date">${escapeHtml(item.date)}</span>
          </div>
          <div class="changelog-ver-title">${escapeHtml(item.title)}</div>
          <ul class="changelog-list">
            ${(item.changes || []).map((ch) => `<li>${escapeHtml(ch)}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    }

    // --- Theme, Zoom & Toast ---
    applyTheme() {
      const theme = TF.store.state.settings.theme || 'light';
      document.documentElement.dataset.theme = theme;
      const btn = document.getElementById('btnThemeToggle');
      if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0F172A' : '#2563EB');
    }

    syncZoomButtons() {
      const cur = TF.store.state.settings.hourHeight || 60;
      document.querySelectorAll('[data-zoom]').forEach((btn) => {
        const val = btn.dataset.zoom;
        const active = (val === 'fit' && cur === 'fit') || (val !== 'fit' && Number(val) === Number(cur));
        btn.classList.toggle('is-active', active);
      });
    }

    showToast(message, showUndo = false) {
      if (!this.toastEl) return;
      clearTimeout(this.toastTimer);
      this.toastEl.innerHTML = `
        <span>${escapeHtml(message)}</span>
        ${showUndo ? '<button type="button" class="toast-undo-btn" id="btnToastUndo">復原</button>' : ''}
      `;
      this.toastEl.classList.add('is-visible');

      if (showUndo) {
        document.getElementById('btnToastUndo')?.addEventListener('click', () => {
          const undone = TF.store.undo();
          if (undone) this.showToast(`已復原：${undone}`);
        });
      }

      this.toastTimer = setTimeout(() => {
        this.toastEl.classList.remove('is-visible');
      }, 3400);
    }

    // --- Cloud Sync Helpers ---
    openSyncModal() {
      this.closeMobileDrawer();
      this.setSyncError('');
      if (this.fbConfigInput && TF.sync) {
        this.fbConfigInput.value = TF.sync.hasConfig() ? JSON.stringify(TF.sync.config, null, 2) : '';
      }
      if (this.syncConfigDetailsEl && TF.sync) {
        this.syncConfigDetailsEl.open = !TF.sync.hasConfig();
      }
      this.renderSyncStatus();
      this.openModal(this.syncModalEl);
    }

    setSyncError(msg) {
      if (!this.syncErrorBoxEl) return;
      if (msg) {
        this.syncErrorBoxEl.textContent = msg;
        this.syncErrorBoxEl.hidden = false;
      } else {
        this.syncErrorBoxEl.hidden = true;
      }
    }

    async handleEmailAuth(mode) {
      this.setSyncError('');
      const email = this.syncEmailInput?.value.trim() || '';
      const password = this.syncPasswordInput?.value || '';
      if (!email || password.length < 6) {
        this.setSyncError('請輸入有效的 Email 與至少 6 碼密碼');
        return;
      }
      const btnIn = document.getElementById('btnSyncEmailIn');
      const btnUp = document.getElementById('btnSyncEmailUp');
      if (btnIn) btnIn.disabled = true;
      if (btnUp) btnUp.disabled = true;
      try {
        if (mode === 'signup') {
          await TF.sync.signUpWithEmail(email, password);
          this.showToast('註冊並登入成功！');
        } else {
          await TF.sync.signInWithEmail(email, password);
          this.showToast('登入成功！');
        }
        this.closeModal(this.syncModalEl);
      } catch (err) {
        this.setSyncError(this.translateAuthError(err));
      } finally {
        if (btnIn) btnIn.disabled = false;
        if (btnUp) btnUp.disabled = false;
        this.renderSyncStatus();
      }
    }

    translateAuthError(err) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/popup-closed-by-user') return '登入視窗已關閉';
      if (code === 'auth/popup-blocked') return '瀏覽器阻擋了彈出視窗，請允許彈窗或改用下方 Email 登入';
      if (code === 'auth/unauthorized-domain') return `網域 (${location.hostname}) 尚未在 Firebase Console 授權`;
      return code ? `${code}：${msg}` : (msg || '操作失敗');
    }

    renderSyncStatus() {
      if (!TF.sync) return;
      const info = TF.sync.getStatusInfo();
      const dotClassMap = {
        synced: 'is-synced',
        syncing: 'is-syncing',
        connecting: 'is-syncing',
        offline: 'is-offline',
        error: 'is-error',
        disconnected: ''
      };
      const dotCls = dotClassMap[info.status] || '';

      [this.syncStatusDotEl, this.syncModalDotEl].forEach((el) => {
        if (!el) return;
        el.className = `sync-dot ${dotCls}`.trim();
      });

      const labelMap = {
        synced: '已同步',
        syncing: '同步中...',
        connecting: '連線中...',
        offline: '離線',
        error: '同步異常',
        disconnected: '雲端同步'
      };
      if (this.syncStatusTextEl) {
        this.syncStatusTextEl.textContent = labelMap[info.status] || '雲端同步';
      }

      if (info.user) {
        if (this.syncLoggedInPanelEl) this.syncLoggedInPanelEl.hidden = false;
        if (this.syncAuthPanelEl) this.syncAuthPanelEl.hidden = true;
        if (this.syncUserEmailEl) this.syncUserEmailEl.textContent = info.user.email || '已登入使用者';
      } else {
        if (this.syncLoggedInPanelEl) this.syncLoggedInPanelEl.hidden = true;
        if (this.syncAuthPanelEl) this.syncAuthPanelEl.hidden = false;
      }
    }
  }

  TF.UIController = UIController;
})(window);
