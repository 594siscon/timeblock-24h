(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  const {
    MINUTES_PER_DAY,
    SNAP_MINUTES,
    DEFAULT_DURATION,
    formatTime,
    formatDuration,
    formatHoursDecimal,
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

      this.cacheElements();
      this.populateTimeOptions();
      this.bindModalEvents();
    }

    cacheElements() {
      // Header date
      this.dateLabelEl = document.getElementById('currentDateLabel');
      this.dateSubLabelEl = document.getElementById('currentDateSub');
      this.dateInputEl = document.getElementById('datePickerInput');
      this.todayBtnEl = document.getElementById('btnToday');

      // Sidebar & Mobile Dock/Drawer
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

      // Modals
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

      this.templateModalEl = document.getElementById('templateModal');
      this.templateFormEl = document.getElementById('templateForm');
      this.templateModalTitleEl = document.getElementById('templateModalTitle');
      this.tplTitleInput = document.getElementById('tplTitleInput');
      this.tplCategorySelect = document.getElementById('tplCategorySelect');
      this.tplDurationSelect = document.getElementById('tplDurationSelect');
      this.btnDeleteTemplateModal = document.getElementById('btnDeleteTemplateModal');

      this.statsModalEl = document.getElementById('statsModal');
      this.syncModalEl = document.getElementById('syncModal');
      this.toastEl = document.getElementById('toast');

      // Sync modal controls
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

      // Calendar Modal
      this.calendarModalEl = document.getElementById('calendarModal');
      this.calendarModalMonthLabel = document.getElementById('calendarModalMonthLabel');
      this.calendarGridDays = document.getElementById('calendarGridDays');
      this.calPrevMonthBtn = document.getElementById('calPrevMonth');
      this.calNextMonthBtn = document.getElementById('calNextMonth');
      this.calJumpTodayBtn = document.getElementById('calJumpToday');
      this.calYear = new Date().getFullYear();
      this.calMonth = new Date().getMonth();

      // Day Templates Modal
      this.dayTemplateModalEl = document.getElementById('dayTemplateModal');
      this.dayTemplateListEl = document.getElementById('dayTemplateList');
      this.btnSaveCurrentAsDayTemplate = document.getElementById('btnSaveCurrentAsDayTemplate');
      this.saveDayTemplatePanel = document.getElementById('saveDayTemplatePanel');
      this.saveDayTemplateForm = document.getElementById('saveDayTemplateForm');
      this.dayTplFormTitle = document.getElementById('dayTplFormTitle');
      this.editingDayTplId = document.getElementById('editingDayTplId');
      this.newDayTplName = document.getElementById('newDayTplName');
      this.newDayTplIcon = document.getElementById('newDayTplIcon');
      this.newDayTplDesc = document.getElementById('newDayTplDesc');
      this.btnSubmitDayTemplate = document.getElementById('btnSubmitDayTemplate');
      this.btnCancelSaveDayTemplate = document.getElementById('btnCancelSaveDayTemplate');
      this.btnCreateBlankDayTemplate = document.getElementById('btnCreateBlankDayTemplate');
      this.dayTplScheduleList = document.getElementById('dayTplScheduleList');
      this.btnAddScheduleRow = document.getElementById('btnAddScheduleRow');
      this.btnLoadCurrentDayIntoEditor = document.getElementById('btnLoadCurrentDayIntoEditor');
      this.btnClearEditorSchedule = document.getElementById('btnClearEditorSchedule');
      this.dayTplScheduleSummary = document.getElementById('dayTplScheduleSummary');
      this.btnCloseDayTplEditor = document.getElementById('btnCloseDayTplEditor');
      this.statsDesktopHeading = document.getElementById('statsDesktopHeading');
      this.statsDesktopSubHeading = document.getElementById('statsDesktopSubHeading');
      this.statsModalTitleEl = document.getElementById('statsModalTitle');
      this.btnExpandStats = document.getElementById('btnExpandStats');
      this.btnOpenStatsModalDesktop = document.getElementById('btnOpenStatsModalDesktop');
    }

    populateTimeOptions() {
      const startOpts = [];
      for (let m = 0; m < MINUTES_PER_DAY; m += SNAP_MINUTES) {
        startOpts.push(`<option value="${m}">${formatTime(m)}</option>`);
      }
      this.blockStartSelect.innerHTML = startOpts.join('');

      const endOpts = [];
      for (let m = SNAP_MINUTES; m <= MINUTES_PER_DAY; m += SNAP_MINUTES) {
        endOpts.push(`<option value="${m}">${formatTime(m)}</option>`);
      }
      this.blockEndSelect.innerHTML = endOpts.join('');

      const durOpts = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];
      this.tplDurationSelect.innerHTML = durOpts
        .map((m) => `<option value="${m}" ${m === DEFAULT_DURATION ? 'selected' : ''}>${formatDuration(m)}${m === 60 ? '（預設）' : ''}</option>`)
        .join('');

      // Swatches in category modal
      this.catColorSwatches.innerHTML = TF.PRESET_COLORS
        .map((c) => `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`)
        .join('');

      this.catIconSwatches.innerHTML = PRESET_ICONS
        .map((ic) => `<button type="button" class="icon-swatch" data-icon="${ic}">${ic}</button>`)
        .join('');
    }

    bindModalEvents() {
      // Close modals on backdrop or close button
      document.querySelectorAll('[data-close-modal]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.closeModal;
          this.closeModal(document.getElementById(id));
        });
      });

      document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.closeModal(backdrop);
        });
      });

      // Block modal start/end sync & duration chips
      this.blockStartSelect.addEventListener('change', () => {
        const start = Number(this.blockStartSelect.value);
        const end = Number(this.blockEndSelect.value);
        if (end <= start) {
          this.blockEndSelect.value = String(Math.min(MINUTES_PER_DAY, start + DEFAULT_DURATION));
        }
        this.highlightActiveDurationChip();
      });

      this.blockEndSelect.addEventListener('change', () => {
        const start = Number(this.blockStartSelect.value);
        const end = Number(this.blockEndSelect.value);
        if (end <= start) {
          this.blockStartSelect.value = String(Math.max(0, end - SNAP_MINUTES));
        }
        this.highlightActiveDurationChip();
      });

      this.blockDurationChips.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-dur]');
        if (!chip) return;
        const dur = Number(chip.dataset.dur);
        const start = Number(this.blockStartSelect.value);
        const end = Math.min(MINUTES_PER_DAY, start + dur);
        this.blockEndSelect.value = String(end);
        this.highlightActiveDurationChip();
      });

      this.blockCategoryPicker.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-cat-id]');
        if (!pill) return;
        this.blockCategoryPicker.querySelectorAll('.cat-pick-pill').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
      });

      this.blockFormEl.addEventListener('submit', (e) => {
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
        } else {
          TF.store.addBlock({ title, categoryId, startMinutes, durationMinutes, note });
        }
        this.closeModal(this.blockModalEl);
      });

      this.btnDeleteBlockModal.addEventListener('click', () => {
        if (!this.editingBlockId) return;
        TF.store.deleteBlock(this.editingBlockId);
        this.closeModal(this.blockModalEl);
        this.showToast('已刪除活動方塊', true);
      });

      // Category swatches & form
      this.catColorSwatches.addEventListener('click', (e) => {
        const sw = e.target.closest('[data-color]');
        if (!sw) return;
        this.catColorInput.value = sw.dataset.color;
        this.syncCategorySwatchSelection();
      });

      this.catColorInput.addEventListener('input', () => this.syncCategorySwatchSelection());

      this.catIconSwatches.addEventListener('click', (e) => {
        const sw = e.target.closest('[data-icon]');
        if (!sw) return;
        this.catIconInput.value = sw.dataset.icon;
        this.syncCategorySwatchSelection();
      });

      this.catFormCancelEditBtn.addEventListener('click', () => this.resetCategoryForm());

      this.categoryFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.catNameInput.value.trim();
        if (!name) return;
        const color = this.catColorInput.value || '#3B82F6';
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

      this.categoryListEl.addEventListener('click', (e) => {
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
          this.catFormSubmitBtn.textContent = '儲存修改';
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
          this.showToast('已刪除類別（相關活動已移至預設類別）', true);
        }
      });

      // Template modal form
      this.templateFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = this.tplTitleInput.value.trim();
        if (!title) return;
        const categoryId = this.tplCategorySelect.value;
        const defaultDuration = Number(this.tplDurationSelect.value) || DEFAULT_DURATION;

        if (this.editingTemplateId) {
          TF.store.updateTemplate(this.editingTemplateId, { title, categoryId, defaultDuration });
          this.showToast('已更新活動方塊');
        } else {
          TF.store.addTemplate({ title, categoryId, defaultDuration });
          this.showToast('已新增活動方塊，可直接拖曳至 24 小時表');
        }
        this.closeModal(this.templateModalEl);
      });

      this.btnDeleteTemplateModal.addEventListener('click', () => {
        if (!this.editingTemplateId) return;
        const tpl = TF.store.getTemplateById(this.editingTemplateId);
        const name = tpl ? `「${tpl.title}」` : '';
        if (confirm(`確定要刪除活動方塊模板${name}嗎？此操作無法復原。`)) {
          TF.store.deleteTemplate(this.editingTemplateId);
          this.closeModal(this.templateModalEl);
          this.showToast('已刪除活動方塊模板', true);
        }
      });

      // Mobile drawer open/close
      document.getElementById('btnOpenMobileDrawer')?.addEventListener('click', () => this.openMobileDrawer());
      document.getElementById('btnCloseMobileDrawer')?.addEventListener('click', () => this.closeMobileDrawer());
      this.mobileDrawerBackdropEl?.addEventListener('click', () => this.closeMobileDrawer());

      // Sync modal events
      document.getElementById('btnSyncModal')?.addEventListener('click', () => this.openSyncModal());

      document.getElementById('btnSyncGoogle')?.addEventListener('click', async () => {
        this.setSyncError('');
        if (!TF.sync.hasConfig()) {
          this.syncConfigDetailsEl.open = true;
          this.setSyncError('請先於下方貼上 Firebase 的 firebaseConfig 並儲存');
          return;
        }
        const btn = document.getElementById('btnSyncGoogle');
        btn.disabled = true;
        try {
          await TF.sync.signInWithGoogle();
          if (TF.sync.user) {
            this.showToast('Google 登入成功！已啟用電腦 ↔ iPhone 即時同步');
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
        const parsed = TF.parseFirebaseConfigInput(this.fbConfigInput.value);
        if (!parsed) {
          this.setSyncError('無法解析 firebaseConfig，請確認有包含 apiKey 與 projectId');
          return;
        }
        TF.sync.saveConfig(parsed);
        const ok = await TF.sync.connectClient();
        if (ok) {
          this.syncConfigDetailsEl.open = false;
          this.showToast('已儲存 Firebase 設定，現在可點擊 Google 帳號登入！');
        } else {
          this.setSyncError(TF.sync.lastError || '無法連線，請確認 firebaseConfig 是否正確');
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
        const res = await TF.sync.pullFromCloud({ initialLogin: true });
        if (res === 'updated') this.showToast('已從雲端拉取最新排程');
        else if (res === 'empty') this.showToast('雲端尚無資料');
        else if (res === 'error') this.setSyncError(TF.sync.lastError);
      });

      document.getElementById('btnSyncPushNow')?.addEventListener('click', async () => {
        const ok = await TF.sync.pushToCloud();
        if (ok) this.showToast('已將本機排程上傳至雲端');
        else this.setSyncError(TF.sync.lastError);
      });

      document.getElementById('btnCopySyncLink')?.addEventListener('click', async () => {
        const link = TF.sync.getQuickShareLink();
        if (!link) return;
        try {
          await navigator.clipboard.writeText(link);
          this.showToast('已複製快速設定連結！傳到 iPhone 開啟即可自動帶入 Firebase 設定');
        } catch (_) {
          prompt('請複製以下連結並在 iPhone Safari 開啟：', link);
        }
      });

      document.getElementById('btnSyncSignOut')?.addEventListener('click', async () => {
        await TF.sync.signOut();
        this.showToast('已登出 Google 同步帳號');
      });

      // Calendar navigation & day cell clicks
      this.calPrevMonthBtn?.addEventListener('click', () => this.shiftCalendarMonth(-1));
      this.calNextMonthBtn?.addEventListener('click', () => this.shiftCalendarMonth(1));
      this.calJumpTodayBtn?.addEventListener('click', () => {
        TF.store.setDate(TF.utils.toDateKey(new Date()));
        this.closeModal(this.calendarModalEl);
        TF.timeline.scrollToSmartPosition();
      });

      this.calendarGridDays?.addEventListener('click', (e) => {
        const cell = e.target.closest('[data-cal-date]');
        if (!cell) return;
        const dateKey = cell.dataset.calDate;
        TF.store.setDate(dateKey);
        this.closeModal(this.calendarModalEl);
        TF.timeline.scrollToSmartPosition();
      });

      // Day template modal openers & actions
      document.getElementById('btnOpenDayTemplates')?.addEventListener('click', () => this.openDayTemplateModal());
      document.getElementById('btnDockDayTemplates')?.addEventListener('click', () => this.openDayTemplateModal());
      document.getElementById('btnDrawerDayTemplates')?.addEventListener('click', () => {
        this.closeMobileDrawer();
        this.openDayTemplateModal();
      });

      // Open stats modal from desktop buttons
      this.btnOpenStatsModalDesktop?.addEventListener('click', () => this.openStatsModal());
      this.btnExpandStats?.addEventListener('click', () => this.openStatsModal());

      // Day template schedule editor openers
      this.btnCreateBlankDayTemplate?.addEventListener('click', () => {
        this.openDayTemplateScheduleEditor(null, 'blank');
      });

      this.btnSaveCurrentAsDayTemplate?.addEventListener('click', () => {
        const currentBlocks = TF.store.getBlocks();
        if (!currentBlocks || currentBlocks.length === 0) {
          this.showToast('今日尚無任何活動排程，已為您建立空白模板時間列表');
          this.openDayTemplateScheduleEditor(null, 'blank');
          return;
        }
        this.openDayTemplateScheduleEditor(null, 'today');
      });

      this.btnCancelSaveDayTemplate?.addEventListener('click', () => {
        this.saveDayTemplatePanel.hidden = true;
      });

      this.btnCloseDayTplEditor?.addEventListener('click', () => {
        this.saveDayTemplatePanel.hidden = true;
      });

      // Schedule editor row actions (add, clear, load today)
      this.btnAddScheduleRow?.addEventListener('click', () => {
        let nextStart = 540; // 09:00 default
        const list = this.editingTemplateSchedule;
        if (list.length > 0) {
          const last = list[list.length - 1];
          nextStart = Math.min(1380, last.startMinutes + last.durationMinutes);
        }
        list.push({
          title: '新時段活動',
          categoryId: 'cat_work',
          startMinutes: nextStart,
          durationMinutes: 60,
          note: ''
        });
        this.renderDayTemplateScheduleEditor();
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
        this.showToast(`已載入今日 ${currentBlocks.length} 項活動至時間列表`);
      });

      this.btnClearEditorSchedule?.addEventListener('click', () => {
        if (this.editingTemplateSchedule.length === 0) return;
        if (confirm('確定要清空時間列表中的所有時段嗎？')) {
          this.editingTemplateSchedule = [];
          this.renderDayTemplateScheduleEditor();
        }
      });

      // Delegated events for schedule rows in editor
      this.dayTplScheduleList?.addEventListener('change', (e) => {
        const row = e.target.closest('[data-row-idx]');
        if (!row) return;
        const idx = Number(row.dataset.rowIdx);
        const item = this.editingTemplateSchedule[idx];
        if (!item) return;

        const field = e.target.dataset.rowField;
        if (field === 'start') {
          const newStart = Number(e.target.value);
          let end = item.startMinutes + item.durationMinutes;
          if (end <= newStart) end = Math.min(1440, newStart + 60);
          item.startMinutes = newStart;
          item.durationMinutes = Math.max(15, end - newStart);
          this.renderDayTemplateScheduleEditor();
        } else if (field === 'end') {
          let newEnd = Number(e.target.value);
          if (newEnd <= item.startMinutes) {
            newEnd = Math.min(1440, item.startMinutes + 30);
          }
          item.durationMinutes = Math.max(15, newEnd - item.startMinutes);
          this.renderDayTemplateScheduleEditor();
        } else if (field === 'category') {
          item.categoryId = e.target.value;
          this.renderDayTemplateScheduleEditor();
        }
      });

      this.dayTplScheduleList?.addEventListener('input', (e) => {
        const row = e.target.closest('[data-row-idx]');
        if (!row) return;
        const idx = Number(row.dataset.rowIdx);
        const item = this.editingTemplateSchedule[idx];
        if (!item) return;

        const field = e.target.dataset.rowField;
        if (field === 'title') {
          item.title = e.target.value;
        }
      });

      this.dayTplScheduleList?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-row-action="delete"]');
        if (!btn) return;
        const row = btn.closest('[data-row-idx]');
        if (!row) return;
        const idx = Number(row.dataset.rowIdx);
        this.editingTemplateSchedule.splice(idx, 1);
        this.renderDayTemplateScheduleEditor();
      });

      // Submit day template form (saves both metadata and schedule list)
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
            this.showToast(`已儲存一日模板「${updated.name}」（${cleanBlocks.length} 項排程）！`, true);
            this.saveDayTemplatePanel.hidden = true;
            this.renderDayTemplatesList();
          } else {
            this.showToast('更新失敗：找不到該模板');
          }
        } else {
          const created = TF.store.createDayTemplate({
            name,
            icon,
            description: desc || `包含 ${cleanBlocks.length} 項活動安排`,
            blocks: cleanBlocks
          });
          if (created) {
            this.showToast(`已建立一日模板「${created.name}」（${cleanBlocks.length} 項排程）！`, true);
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
          this.showToast(`已套用模板「${tpl.name}」（覆蓋 ${count} 項活動）`, true);
          TF.timeline.scrollToSmartPosition();
        } else if (action === 'apply-append') {
          const count = TF.store.applyDayTemplate(tplId, { overwrite: false });
          this.closeModal(this.dayTemplateModalEl);
          this.showToast(`已追加模板「${tpl.name}」（新增 ${count} 項活動）`, true);
          TF.timeline.scrollToSmartPosition();
        } else if (action === 'delete') {
          if (confirm(`確定要刪除一日模板「${tpl.name}」嗎？此操作無法復原。`)) {
            TF.store.deleteDayTemplate(tplId);
            this.renderDayTemplatesList();
            this.showToast('已刪除一日模板', true);
          }
        }
      });

      // Stats event delegation for Desktop & Mobile
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
            TF.timeline.scrollToSmartPosition();
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
              if (sel === startSel) end = Math.min(TF.utils.MINUTES_PER_DAY, start + 60);
              else start = Math.max(0, end - 60);
            }
            TF.store.setDiscretionaryWindow(start, end);
          }
        });
      });

      // Corner version badge click: show version info & check PWA cache update
      document.getElementById('cornerVersionBadge')?.addEventListener('click', async () => {
        const ver = TF.VERSION || 'v1.2.0';
        this.showToast(`時間方塊 ${ver} · 已是最新版本`);
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.update();
            }
          } catch (_) {}
        }
      });
    }

    async handleEmailAuth(mode) {
      this.setSyncError('');
      const email = this.syncEmailInput.value.trim();
      const password = this.syncPasswordInput.value;
      if (!email || password.length < 6) {
        this.setSyncError('請輸入有效的電子郵件與至少 6 碼密碼');
        return;
      }
      const btnIn = document.getElementById('btnSyncEmailIn');
      const btnUp = document.getElementById('btnSyncEmailUp');
      btnIn.disabled = true;
      btnUp.disabled = true;
      try {
        if (mode === 'signup') {
          await TF.sync.signUpWithEmail(email, password);
          this.showToast('註冊並登入成功！已啟用電腦 ↔ iPhone 即時同步');
        } else {
          await TF.sync.signInWithEmail(email, password);
          this.showToast('登入成功！已啟用電腦 ↔ iPhone 即時同步');
        }
        this.closeModal(this.syncModalEl);
      } catch (err) {
        this.setSyncError(this.translateAuthError(err));
      } finally {
        btnIn.disabled = false;
        btnUp.disabled = false;
        this.renderSyncStatus();
      }
    }

    translateAuthError(err) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/popup-closed-by-user') return 'Google 登入視窗已關閉（未完成登入）';
      if (code === 'auth/popup-blocked') {
        return '瀏覽器阻擋了 Google 登入視窗！請到 iPhone「設定 → Safari → 關閉阻擋彈出式視窗」後再點一次，或改用下方 Email 登入。';
      }
      if (code === 'auth/unauthorized-domain') {
        return `此網域（${location.hostname}）尚未授權！請到 Firebase Console → Authentication → Settings → Authorized domains 新增 ${location.hostname}`;
      }
      if (code === 'auth/operation-not-allowed') {
        return '此登入方式尚未啟用！請到 Firebase Console → Authentication → Sign-in method 開啟對應登入方式。';
      }
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return 'Email 或密碼不正確，請重新確認';
      }
      if (code === 'auth/email-already-in-use') {
        return '此 Email 已註冊過，請直接點「Email 登入」';
      }
      return code ? `${code}：${msg}` : (msg || '操作失敗，請稍後再試');
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

    openSyncModal() {
      this.setSyncError('');
      this.fbConfigInput.value = TF.sync.hasConfig() ? JSON.stringify(TF.sync.config, null, 2) : '';
      this.syncConfigDetailsEl.open = !TF.sync.hasConfig();
      this.renderSyncStatus();
      this.openModal(this.syncModalEl);
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
        this.syncLoggedInPanelEl.hidden = false;
        this.syncAuthPanelEl.hidden = true;
        if (info.user.photoURL) {
          this.syncUserAvatarEl.src = info.user.photoURL;
          this.syncUserAvatarEl.hidden = false;
        } else {
          this.syncUserAvatarEl.hidden = true;
        }
        if (info.user.displayName) {
          this.syncUserNameEl.textContent = info.user.displayName;
          this.syncUserNameEl.hidden = false;
        } else {
          this.syncUserNameEl.hidden = true;
        }
        this.syncUserEmailEl.textContent = info.user.email || '已登入使用者';
        const timeStr = info.lastSyncedAt
          ? info.lastSyncedAt.toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '剛剛';
        this.syncLastTimeEl.textContent =
          info.status === 'syncing'
            ? '正在即時同步...'
            : `最後同步時間：${timeStr}（電腦與 iPhone 自動雙向同步）`;
        this.syncBannerTitleEl.textContent = info.status === 'offline' ? '目前處於離線狀態' : '☁️ Firebase 即時同步運行中';
        this.syncBannerSubEl.textContent =
          info.status === 'offline'
            ? '離線修改會暫存在本機，恢復網路後自動同步'
            : '任意裝置拖曳或調整方塊時，另一台裝置會即時更新';
      } else {
        this.syncLoggedInPanelEl.hidden = true;
        this.syncAuthPanelEl.hidden = false;
        this.syncBannerTitleEl.textContent = info.hasConfig ? '尚未登入 Google 帳號' : '尚未設定 Firebase 連線';
        this.syncBannerSubEl.textContent = info.hasConfig
          ? '點下方「使用 Google 帳號登入」即可在電腦與 iPhone 即時自動同步'
          : '展開下方「Firebase 連線設定」貼上免費專案的 firebaseConfig 即可啟用';
      }

      if (info.status === 'error' && info.lastError) {
        this.setSyncError(info.lastError);
      }
    }

    renderAll() {
      this.renderDateHeader();
      this.renderCategoryFilters();
      this.renderTemplates();
      this.renderStats();
      this.applyTheme();
      this.syncZoomButtons();
    }

    renderDateHeader() {
      const info = formatDateDisplay(TF.store.selectedDate);
      this.dateLabelEl.textContent = info.short;
      this.dateSubLabelEl.textContent = info.isToday ? '今天' : TF.store.selectedDate;
      this.dateInputEl.value = TF.store.selectedDate;
      this.todayBtnEl.classList.toggle('is-today', info.isToday);
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

      this.catFilterDesktopEl.innerHTML = html;
      this.catFilterMobileEl.innerHTML = html;

      [this.catFilterDesktopEl, this.catFilterMobileEl].forEach((container) => {
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
            <div class="dock-card" data-template-id="${tpl.id}" style="--tpl-color:${cat.color}; --tpl-bg:${hexToRgba(cat.color, 0.14)}">
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
          <div class="template-card" data-template-id="${tpl.id}" style="--tpl-color:${cat.color}; --tpl-bg:${hexToRgba(cat.color, 0.12)}">
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
            <button type="button" class="template-edit-btn" data-tpl-action="edit" data-tpl-id="${tpl.id}" title="編輯活動方塊" aria-label="編輯">⋯</button>
          </div>
        `;
      };

      const emptyHtml = `<div class="empty-state">此類別尚無活動方塊，點擊上方「＋ 新增」建立</div>`;
      const listHtml = templates.length ? templates.map((t) => buildCardHtml(t, false)).join('') : emptyHtml;

      this.templateListDesktopEl.innerHTML = listHtml;
      this.templateListMobileEl.innerHTML = listHtml;

      // Mobile bottom dock shows filtered (or all if filtered is empty)
      const dockSource = templates.length ? templates : allTemplates;
      this.mobileDockEl.innerHTML = dockSource.map((t) => buildCardHtml(t, true)).join('');

      [this.templateListDesktopEl, this.templateListMobileEl].forEach((container) => {
        container.querySelectorAll('[data-tpl-action="edit"]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openTemplateModal(btn.dataset.tplId);
          });
        });
      });
    }

    renderStats() {
      const selectedDate = TF.store.state.selectedDate;
      const categories = TF.store.getCategories();
      const settings = TF.store.state.settings;
      const statsScope = settings.statsScope || 'day'; // 'day' | 'week' | 'month'
      const statsMode = settings.statsMode || 'daily'; // 'daily' | 'discretionary'

      const discStart = settings.discretionaryStart ?? 1140; // 19:00
      const discEnd = settings.discretionaryEnd ?? 1380; // 23:00
      const discDurationPerDay = Math.max(SNAP_MINUTES, discEnd - discStart);

      // Determine target dates and header
      let targetDates = [];
      let rangeTitle = '';
      let scopeBadge = '';

      if (statsScope === 'week') {
        targetDates = getWeekDates ? getWeekDates(selectedDate) : TF.utils.getWeekDates(selectedDate);
        rangeTitle = formatWeekRangeDisplay ? formatWeekRangeDisplay(selectedDate) : TF.utils.formatWeekRangeDisplay(selectedDate);
        scopeBadge = '本週（7 天）';
      } else if (statsScope === 'month') {
        targetDates = getMonthDates ? getMonthDates(selectedDate) : TF.utils.getMonthDates(selectedDate);
        rangeTitle = formatMonthRangeDisplay ? formatMonthRangeDisplay(selectedDate) : TF.utils.formatMonthRangeDisplay(selectedDate);
        scopeBadge = `本月（${targetDates.length} 天）`;
      } else {
        targetDates = [selectedDate];
        rangeTitle = formatDateDisplay(selectedDate);
        scopeBadge = '今日';
      }

      const numDays = targetDates.length;
      const totalWindowMins = statsMode === 'daily'
        ? numDays * MINUTES_PER_DAY
        : numDays * discDurationPerDay;

      // Aggregations
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
            // Discretionary window intersection
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

      // --- Scope Tabs HTML ---
      const scopeTabsHtml = `
        <div class="stats-scope-tabs" role="tablist" aria-label="統計週期切換">
          <button type="button" class="stats-scope-btn ${statsScope === 'day' ? 'is-active' : ''}" data-stats-scope="day">📅 日統計</button>
          <button type="button" class="stats-scope-btn ${statsScope === 'week' ? 'is-active' : ''}" data-stats-scope="week">📊 週統計</button>
          <button type="button" class="stats-scope-btn ${statsScope === 'month' ? 'is-active' : ''}" data-stats-scope="month">🗓️ 月統計</button>
        </div>
      `;

      // --- Mode Tabs HTML ---
      const modeTabsHtml = `
        <div class="stats-mode-tabs" role="tablist" aria-label="統計時間維度">
          <button type="button" class="stats-tab-btn ${statsMode === 'daily' ? 'is-active' : ''}" data-stats-mode="daily">全天（24 小時）</button>
          <button type="button" class="stats-tab-btn ${statsMode === 'discretionary' ? 'is-active' : ''}" data-stats-mode="discretionary">可支配時間</button>
        </div>
      `;

      // --- Scope Range Banner ---
      const bannerHtml = `
        <div class="stats-scope-banner">
          <div class="stats-scope-info">
            <span class="stats-scope-range">${escapeHtml(rangeTitle)}</span>
            <span class="stats-scope-badge">${escapeHtml(scopeBadge)}</span>
          </div>
        </div>
      `;

      // --- Discretionary Controls (if in discretionary mode) ---
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
          { label: '全日 08:00-24:00', start: 480, end: 1440 }
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
              <span class="disc-label">自訂每日可支配區間：</span>
              <span class="disc-cur-duration">（每日 ${formatDuration(discDurationPerDay)}）</span>
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

      // --- Summary Metrics ---
      const isMultiDay = numDays > 1;
      const dailyAvgScheduled = isMultiDay ? totalScheduledMins / numDays : null;
      const dailyAvgFree = isMultiDay ? totalFreeMins / numDays : null;

      const summaryCardsHtml = `
        <div class="stats-summary-cards ${isMultiDay ? 'has-averages' : ''}">
          <div class="stats-metric">
            <span class="stats-metric-label">${isMultiDay ? '期間總長' : '時段總長'}</span>
            <span class="stats-metric-val is-muted">${formatHoursDecimal(totalWindowMins)}</span>
          </div>
          <div class="stats-metric">
            <span class="stats-metric-label">已排程</span>
            <span class="stats-metric-val">${formatHoursDecimal(totalScheduledMins)}</span>
            ${isMultiDay ? `<span class="stats-metric-sub">日均 ${formatHoursDecimal(dailyAvgScheduled)}</span>` : ''}
          </div>
          <div class="stats-metric">
            <span class="stats-metric-label">${statsMode === 'discretionary' ? '自由時間' : '剩餘可用'}</span>
            <span class="stats-metric-val is-free">${formatHoursDecimal(totalFreeMins)}</span>
            ${isMultiDay ? `<span class="stats-metric-sub is-free">日均 ${formatHoursDecimal(dailyAvgFree)}</span>` : ''}
          </div>
        </div>
      `;

      // --- Week Sparkline/Bar Chart (Only for Week Scope) ---
      let weekChartHtml = '';
      if (statsScope === 'week' && dailySummaries.length === 7) {
        const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
        const barCols = dailySummaries.map((ds, idx) => {
          const dayNumber = parseInt(ds.dateKey.slice(8), 10);
          const pct = Math.min(100, (ds.scheduledMins / ds.windowMins) * 100);
          const isSelected = ds.isCurrentSelected;
          return `
            <div class="week-chart-col ${isSelected ? 'is-selected' : ''}" data-jump-date="${ds.dateKey}" title="${ds.dateKey} (週${dayNames[idx]}): 已排程 ${formatDuration(ds.scheduledMins)} / 自由 ${formatDuration(ds.freeMins)} (點擊跳轉)">
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
              <span class="week-chart-title">週七日排程趨勢</span>
              <span class="week-chart-hint">點擊任一日可直接切換</span>
            </div>
            <div class="week-chart-bars">
              ${barCols}
            </div>
          </div>
        `;
      }

      // --- Progress Bar Track ---
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
          ? `<div class="stats-bar-seg is-free-seg" style="width:${((totalFreeMins / totalWindowMins) * 100).toFixed(2)}%" title="${statsMode === 'discretionary' ? '完全自由時間' : '未排程時間'}: ${formatDuration(totalFreeMins)}"></div>`
          : ''
      ].join('');

      const barTrackHtml = `
        <div class="stats-bar-container">
          <div class="stats-bar-track" aria-label="時間分配比例">
            ${barSegments}
          </div>
        </div>
      `;

      // --- Breakdown List ---
      let listRows = '';
      if (breakdown.length === 0 && totalScheduledMins === 0) {
        listRows = `<div class="empty-state">${statsScope === 'day' ? '今日' : statsScope === 'week' ? '本週' : '本月'}尚未安排任何活動方塊</div>`;
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
              <span class="stats-cat-name" style="font-weight:700; color:#10B981;">完全自由時間</span>
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

      const listHtml = `
        <div class="stats-list">
          ${listRows}
        </div>
      `;

      // Dynamic headings for sidebar and modal
      const scopeTitleMap = {
        day: '📅 日統計 · 時間分配',
        week: '📊 週統計 · 時間分配',
        month: '🗓️ 月統計 · 時間分配'
      };
      const scopeSubMap = {
        day: '當天全天 24 小時與可支配時間分析',
        week: `本週時間分配（${rangeTitle}）`,
        month: `全月時間分配（${rangeTitle}）`
      };
      if (this.statsDesktopHeading) this.statsDesktopHeading.textContent = scopeTitleMap[statsScope] || '時間分配統計';
      if (this.statsDesktopSubHeading) this.statsDesktopSubHeading.textContent = scopeSubMap[statsScope] || '';
      if (this.statsModalTitleEl) this.statsModalTitleEl.textContent = scopeTitleMap[statsScope] || '時間分配統計';

      // Month Trend Chart (Weekly overview for Month Scope)
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
            label: `第 ${weekChunks.length + 1} 週 (${startDom}-${endDom}日)`,
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
              <span class="week-chart-title">月度各週時間投入走勢</span>
              <span class="week-chart-hint">共 ${weekChunks.length} 週進度</span>
            </div>
            <div class="week-chart-bars month-chart-bars">
              ${weekBars}
            </div>
          </div>
        `;
      }

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

    // --- Modals ---
    openModal(modalEl) {
      if (!modalEl) return;
      modalEl.hidden = false;
      requestAnimationFrame(() => modalEl.classList.add('is-open'));
    }

    closeModal(modalEl) {
      if (!modalEl) return;
      modalEl.classList.remove('is-open');
      setTimeout(() => {
        if (!modalEl.classList.contains('is-open')) modalEl.hidden = true;
      }, 180);
    }

    closeAllModals() {
      [
        this.blockModalEl,
        this.categoryModalEl,
        this.templateModalEl,
        this.statsModalEl,
        this.syncModalEl,
        this.calendarModalEl,
        this.dayTemplateModalEl
      ].forEach((m) => this.closeModal(m));
      this.closeMobileDrawer();
    }

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

      this.blockModalTitleEl.textContent = block ? '編輯活動方塊' : '新增活動方塊';
      this.blockTitleInput.value = title;
      this.blockStartSelect.value = String(start);
      this.blockEndSelect.value = String(end);
      this.blockNoteInput.value = note;
      this.btnDeleteBlockModal.hidden = !block;

      this.blockCategoryPicker.innerHTML = categories.map((cat) => `
        <button type="button" class="cat-pick-pill ${cat.id === catId ? 'is-active' : ''}" data-cat-id="${cat.id}" style="--pill-color:${cat.color}">
          <span class="cat-dot" style="background:${cat.color}"></span>
          <span>${escapeHtml(cat.icon || '')} ${escapeHtml(cat.name)}</span>
        </button>
      `).join('');

      this.highlightActiveDurationChip();
      this.openModal(this.blockModalEl);
      setTimeout(() => this.blockTitleInput.focus(), 60);
    }

    highlightActiveDurationChip() {
      const dur = Number(this.blockEndSelect.value) - Number(this.blockStartSelect.value);
      this.blockDurationChips.querySelectorAll('[data-dur]').forEach((chip) => {
        chip.classList.toggle('is-active', Number(chip.dataset.dur) === dur);
      });
    }

    openCategoryModal() {
      this.resetCategoryForm();
      this.renderCategoryManagerList();
      this.openModal(this.categoryModalEl);
    }

    resetCategoryForm() {
      this.editingCategoryId = null;
      this.catNameInput.value = '';
      this.catColorInput.value = TF.PRESET_COLORS[0];
      this.catIconInput.value = '🏷️';
      this.catFormSubmitBtn.textContent = '新增類別';
      this.catFormCancelEditBtn.hidden = true;
      this.syncCategorySwatchSelection();
    }

    syncCategorySwatchSelection() {
      const curColor = (this.catColorInput.value || '').toLowerCase();
      const curIcon = this.catIconInput.value.trim();
      this.catColorSwatches.querySelectorAll('.color-swatch').forEach((sw) => {
        sw.classList.toggle('is-active', sw.dataset.color.toLowerCase() === curColor);
      });
      this.catIconSwatches.querySelectorAll('.icon-swatch').forEach((sw) => {
        sw.classList.toggle('is-active', sw.dataset.icon === curIcon);
      });
    }

    renderCategoryManagerList() {
      const categories = TF.store.getCategories();
      this.categoryListEl.innerHTML = categories.map((cat) => `
        <div class="cat-manager-item">
          <div class="cat-manager-left">
            <span class="cat-manager-swatch" style="background:${cat.color}">${escapeHtml(cat.icon || '')}</span>
            <span class="cat-manager-name">${escapeHtml(cat.name)}</span>
          </div>
          <div class="cat-manager-actions">
            <button type="button" class="btn-ghost-sm" data-cat-action="edit" data-cat-id="${cat.id}">編輯</button>
            <button type="button" class="btn-ghost-sm is-danger" data-cat-action="delete" data-cat-id="${cat.id}">刪除</button>
          </div>
        </div>
      `).join('');
    }

    openTemplateModal(templateId = null) {
      this.editingTemplateId = templateId;
      const tpl = templateId ? TF.store.getTemplateById(templateId) : null;
      const categories = TF.store.getCategories();

      this.tplCategorySelect.innerHTML = categories
        .map((c) => `<option value="${c.id}">${escapeHtml(c.icon || '')} ${escapeHtml(c.name)}</option>`)
        .join('');

      if (tpl) {
        this.templateModalTitleEl.textContent = '編輯活動方塊模板';
        this.tplTitleInput.value = tpl.title;
        this.tplCategorySelect.value = tpl.categoryId;
        this.tplDurationSelect.value = String(tpl.defaultDuration || DEFAULT_DURATION);
        this.btnDeleteTemplateModal.hidden = false;
      } else {
        this.templateModalTitleEl.textContent = '新增活動方塊';
        this.tplTitleInput.value = '';
        const defaultCat = TF.store.selectedCategoryFilter !== 'all'
          ? TF.store.selectedCategoryFilter
          : categories[0]?.id;
        if (defaultCat) this.tplCategorySelect.value = defaultCat;
        this.tplDurationSelect.value = String(DEFAULT_DURATION);
        this.btnDeleteTemplateModal.hidden = true;
      }

      this.openModal(this.templateModalEl);
      setTimeout(() => this.tplTitleInput.focus(), 60);
    }

    openStatsModal() {
      this.renderStats();
      this.openModal(this.statsModalEl);
    }

    // --- Calendar Month Picker Modal ---
    openCalendarModal() {
      const parsed = TF.utils.parseDateKey(TF.store.selectedDate);
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

      const todayKey = TF.utils.toDateKey(new Date());
      const selectedKey = TF.store.selectedDate;

      const cells = [];

      // Prev month trailing days
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

      // Current month days
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

      // Next month leading days (up to 35 or 42 cells)
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

    // --- Day Templates Modal ---
    openDayTemplateModal() {
      if (this.saveDayTemplatePanel) this.saveDayTemplatePanel.hidden = true;
      this.renderDayTemplatesList();
      this.openModal(this.dayTemplateModalEl);
    }

    renderDayTemplatesList() {
      if (!this.dayTemplateListEl) return;
      const templates = TF.store.getDayTemplates();

      if (!templates || templates.length === 0) {
        this.dayTemplateListEl.innerHTML = `
          <div class="empty-state">尚無一日活動模板，點擊上方「＋ 將今日儲存為模板」</div>
        `;
        return;
      }

      this.dayTemplateListEl.innerHTML = templates.map((tpl) => {
        const blockChips = (tpl.blocks || []).map((b) => {
          const cat = TF.store.getCategoryById(b.categoryId);
          const time = TF.utils.formatTime(b.startMinutes);
          return `
            <span class="day-tpl-mini-chip" style="--chip-color:${cat.color}; --chip-bg:${TF.utils.hexToRgba(cat.color, 0.12)}; --chip-border:${TF.utils.hexToRgba(cat.color, 0.35)}">
              ${escapeHtml(cat.icon || '')} ${time} ${escapeHtml(b.title)}
            </span>
          `;
        }).join('');

        const isBuiltin = tpl.id.startsWith('dtpl_workday') || tpl.id.startsWith('dtpl_weekend');

        return `
          <div class="day-tpl-card">
            <div class="day-tpl-card-header">
              <span class="day-tpl-card-title">${escapeHtml(tpl.icon || '📅')} ${escapeHtml(tpl.name)}</span>
              <div class="day-tpl-badges" style="display:flex; align-items:center; gap:6px;">
                ${isBuiltin ? `<span class="badge-sm is-muted" style="opacity:0.75;">預設</span>` : ''}
                <span class="badge-sm">${(tpl.blocks || []).length} 項安排</span>
              </div>
            </div>
            <div class="day-tpl-card-desc">${escapeHtml(tpl.description || '')}</div>
            <div class="day-tpl-chips-preview">${blockChips}</div>
            <div class="day-tpl-card-actions">
              <div class="day-tpl-actions-left">
                <button type="button" class="btn-ghost-sm is-danger" data-day-tpl-action="delete" data-tpl-id="${tpl.id}" title="刪除此模板（包含預設模板）">刪除</button>
                <button type="button" class="btn-ghost-sm" data-day-tpl-action="edit" data-tpl-id="${tpl.id}" title="編輯模板名稱、圖示或更新排程內容">✏️ 編輯</button>
              </div>
              <div class="day-tpl-actions-right">
                <button type="button" class="btn-sm-secondary" data-day-tpl-action="apply-append" data-tpl-id="${tpl.id}" title="保留今日既有活動，追加模板內的項目">追加排程</button>
                <button type="button" class="btn-sm-primary" data-day-tpl-action="apply-replace" data-tpl-id="${tpl.id}" title="清空今日現有活動，直接套用模板">覆蓋套用</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    openDayTemplateScheduleEditor(templateId = null, source = 'blank') {
      if (templateId) {
        const tpl = TF.store.getDayTemplateById(templateId);
        if (!tpl) return;
        this.editingDayTplId.value = tpl.id;
        this.dayTplFormTitle.textContent = `✏️ 編輯一日模板排程：${tpl.name}`;
        this.btnSubmitDayTemplate.textContent = '儲存模板與時間列表';
        this.newDayTplName.value = tpl.name;
        this.newDayTplIcon.value = tpl.icon || '📅';
        this.newDayTplDesc.value = tpl.description || '';
        this.editingTemplateSchedule = (tpl.blocks || []).map((b) => ({ ...b }));
      } else {
        this.editingDayTplId.value = '';
        this.dayTplFormTitle.textContent = source === 'today' ? '建立一日模板（以今日排程為基底）' : '建立一日模板（手動編寫時間列表）';
        this.btnSubmitDayTemplate.textContent = '建立一日模板';
        this.newDayTplName.value = source === 'today' ? '我的例行一日' : '新的一日模板';
        this.newDayTplIcon.value = '📅';
        this.newDayTplDesc.value = '';
        if (source === 'today') {
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
          this.editingTemplateSchedule = [
            { title: '早晨晨讀與準備', categoryId: 'cat_study', startMinutes: 420, durationMinutes: 60, note: '' },
            { title: '核心專注工作', categoryId: 'cat_work', startMinutes: 540, durationMinutes: 180, note: '' },
            { title: '午餐休息', categoryId: 'cat_life', startMinutes: 720, durationMinutes: 60, note: '' },
            { title: '午後協同與處理', categoryId: 'cat_work', startMinutes: 840, durationMinutes: 120, note: '' },
            { title: '運動健身', categoryId: 'cat_sport', startMinutes: 1080, durationMinutes: 60, note: '' },
            { title: '晚餐放鬆', categoryId: 'cat_life', startMinutes: 1170, durationMinutes: 90, note: '' }
          ];
        }
      }

      this.saveDayTemplatePanel.hidden = false;
      this.renderDayTemplateScheduleEditor();
      this.saveDayTemplatePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.newDayTplName.focus();
    }

    renderDayTemplateScheduleEditor() {
      if (!this.dayTplScheduleList) return;
      const categories = TF.store.getCategories();
      const list = this.editingTemplateSchedule || [];

      if (list.length === 0) {
        this.dayTplScheduleList.innerHTML = `
          <div class="empty-state py-3">時間列表中尚無時段活動，點擊下方「＋ 新增活動時段」或「📋 帶入今日排程」</div>
        `;
        this.updateDayTemplateScheduleSummary();
        return;
      }

      const timeOptions = (selectedMinutes, isEnd = false) => {
        const opts = [];
        const startMin = isEnd ? 15 : 0;
        const endMin = isEnd ? 1440 : 1425;
        for (let m = startMin; m <= endMin; m += 15) {
          const isSel = m === selectedMinutes;
          opts.push(`<option value="${m}" ${isSel ? 'selected' : ''}>${TF.utils.formatTime(m)}</option>`);
        }
        return opts.join('');
      };

      const categoryOptions = (selectedCatId) => {
        return categories.map((c) => {
          const isSel = c.id === selectedCatId;
          return `<option value="${c.id}" ${isSel ? 'selected' : ''}>${escapeHtml(c.icon || '')} ${escapeHtml(c.name)}</option>`;
        }).join('');
      };

      const rowsHtml = list.map((item, idx) => {
        const cat = TF.store.getCategoryById(item.categoryId) || categories[0] || { color: '#3B82F6', icon: '📌', name: '未分類' };
        const endMinutes = Math.min(1440, item.startMinutes + item.durationMinutes);
        return `
          <div class="day-tpl-schedule-row" data-row-idx="${idx}">
            <div class="schedule-row-color-bar" style="background:${cat.color}"></div>
            <div class="schedule-row-time-group">
              <select class="schedule-select schedule-start" data-row-field="start" data-row-idx="${idx}" aria-label="開始時間">
                ${timeOptions(item.startMinutes, false)}
              </select>
              <span class="schedule-to-sep">至</span>
              <select class="schedule-select schedule-end" data-row-field="end" data-row-idx="${idx}" aria-label="結束時間">
                ${timeOptions(endMinutes, true)}
              </select>
              <span class="schedule-dur-badge">${formatDuration(item.durationMinutes)}</span>
            </div>
            <div class="schedule-row-detail-group">
              <select class="schedule-select schedule-cat" data-row-field="category" data-row-idx="${idx}" aria-label="活動分類">
                ${categoryOptions(item.categoryId)}
              </select>
              <input type="text" class="schedule-input-title" data-row-field="title" data-row-idx="${idx}" value="${escapeHtml(item.title)}" placeholder="活動名稱..." required />
            </div>
            <button type="button" class="btn-row-del" data-row-action="delete" data-row-idx="${idx}" title="刪除此時段">✕</button>
          </div>
        `;
      }).join('');

      this.dayTplScheduleList.innerHTML = rowsHtml;
      this.updateDayTemplateScheduleSummary();
    }

    updateDayTemplateScheduleSummary() {
      if (!this.dayTplScheduleSummary) return;
      const list = this.editingTemplateSchedule || [];
      let totalMins = 0;
      for (const item of list) totalMins += item.durationMinutes;
      this.dayTplScheduleSummary.textContent = `共 ${list.length} 項活動安排 · 排程總長 ${formatHoursDecimal(totalMins)}（${formatDuration(totalMins)}）`;
    }

    openMobileDrawer() {
      this.mobileDrawerEl.classList.add('is-open');
      this.mobileDrawerBackdropEl.hidden = false;
    }

    closeMobileDrawer() {
      this.mobileDrawerEl.classList.remove('is-open');
      this.mobileDrawerBackdropEl.hidden = true;
    }

    applyTheme() {
      const theme = TF.store.state.settings.theme || 'light';
      document.documentElement.dataset.theme = theme;
      const btn = document.getElementById('btnThemeToggle');
      if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0F172A' : '#2563EB');
    }

    syncZoomButtons() {
      const cur = TF.store.state.settings.hourHeight || 64;
      document.querySelectorAll('[data-zoom]').forEach((btn) => {
        const val = btn.dataset.zoom;
        const active = (val === 'fit' && cur === 'fit') || (val !== 'fit' && Number(val) === Number(cur));
        btn.classList.toggle('is-active', active);
      });
    }

    showToast(message, showUndo = false) {
      clearTimeout(this.toastTimer);
      this.toastEl.innerHTML = `
        <span>${escapeHtml(message)}</span>
        ${showUndo ? '<button type="button" class="toast-undo-btn" id="btnToastUndo">復原</button>' : ''}
      `;
      this.toastEl.hidden = false;
      requestAnimationFrame(() => this.toastEl.classList.add('is-visible'));

      if (showUndo) {
        document.getElementById('btnToastUndo')?.addEventListener('click', () => {
          const undone = TF.store.undo();
          if (undone) this.showToast(`已復原：${undone}`);
        });
      }

      this.toastTimer = setTimeout(() => {
        this.toastEl.classList.remove('is-visible');
        setTimeout(() => {
          if (!this.toastEl.classList.contains('is-visible')) this.toastEl.hidden = true;
        }, 200);
      }, 3600);
    }
  }

  TF.UIController = UIController;
})(window);
