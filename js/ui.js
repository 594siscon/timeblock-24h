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
        TF.store.deleteTemplate(this.editingTemplateId);
        this.closeModal(this.templateModalEl);
        this.showToast('已刪除活動方塊模板', true);
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
    }

    translateAuthError(err) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/popup-closed-by-user') return '已取消 Google 登入視窗';
      if (code === 'auth/unauthorized-domain') {
        return '此網域尚未授權！請到 Firebase Console → Authentication → Settings → Authorized domains 新增目前網域（例如 594siscon.github.io）';
      }
      if (code === 'auth/operation-not-allowed') {
        return '尚未啟用 Google 登入！請到 Firebase Console → Authentication → Sign-in method 開啟 Google';
      }
      return msg || '操作失敗，請稍後再試';
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
      const blocks = TF.store.getBlocks();
      const categories = TF.store.getCategories();

      const totalsByCat = new Map();
      let totalMinutes = 0;

      for (const b of blocks) {
        totalMinutes += b.durationMinutes;
        totalsByCat.set(b.categoryId, (totalsByCat.get(b.categoryId) || 0) + b.durationMinutes);
      }

      const unscheduledMinutes = Math.max(0, MINUTES_PER_DAY - totalMinutes);
      const breakdown = categories
        .map((cat) => ({
          cat,
          minutes: totalsByCat.get(cat.id) || 0
        }))
        .filter((item) => item.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);

      const barSegments = breakdown.map((item) => {
        const pct = Math.min(100, (item.minutes / MINUTES_PER_DAY) * 100);
        return `<div class="stats-bar-seg" style="width:${pct.toFixed(2)}%; background:${item.cat.color}" title="${escapeHtml(item.cat.name)}: ${formatDuration(item.minutes)}"></div>`;
      }).join('');

      const listRows = breakdown.length
        ? breakdown.map((item) => {
            const pctOfDay = Math.round((item.minutes / MINUTES_PER_DAY) * 100);
            return `
              <div class="stats-row">
                <div class="stats-row-left">
                  <span class="cat-dot" style="background:${item.cat.color}"></span>
                  <span class="stats-cat-icon">${escapeHtml(item.cat.icon || '')}</span>
                  <span class="stats-cat-name">${escapeHtml(item.cat.name)}</span>
                </div>
                <div class="stats-row-right">
                  <span class="stats-hrs">${formatHoursDecimal(item.minutes)}</span>
                  <span class="stats-pct">${pctOfDay}%</span>
                </div>
              </div>
            `;
          }).join('')
        : `<div class="empty-state">今日尚未安排任何活動方塊</div>`;

      const html = `
        <div class="stats-summary-cards">
          <div class="stats-metric">
            <span class="stats-metric-label">已排程</span>
            <span class="stats-metric-val">${formatHoursDecimal(totalMinutes)}</span>
          </div>
          <div class="stats-metric">
            <span class="stats-metric-label">剩餘可用</span>
            <span class="stats-metric-val is-muted">${formatHoursDecimal(unscheduledMinutes)}</span>
          </div>
        </div>
        <div class="stats-bar-track" aria-label="24 小時分配比例">
          ${barSegments}
        </div>
        <div class="stats-list">
          ${listRows}
        </div>
      `;

      this.statsDesktopEl.innerHTML = html;
      this.statsModalBodyEl.innerHTML = html;
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
      [this.blockModalEl, this.categoryModalEl, this.templateModalEl, this.statsModalEl, this.syncModalEl].forEach((m) => this.closeModal(m));
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
        btn.classList.toggle('is-active', Number(btn.dataset.zoom) === cur);
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
