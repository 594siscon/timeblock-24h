(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  const { toDateKey } = TF.utils;

  function initApp() {
    TF.timeline = new TF.TimelineView();
    TF.ui = new TF.UIController();
    TF.dnd = new TF.DragDropController(TF.timeline);

    // ==================== 1. Global Event Delegation (100% Reliable) ====================
    // 透過全域事件委派處理所有核心按鈕，不論電腦或手機、不論 DOM 何時重繪皆 100% 響應
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;

      // 1) 開啟日曆 (Header, Quickbar, Mobile Dock, Mobile Drawer)
      if (target.closest('[data-open-calendar]')) {
        e.preventDefault();
        TF.ui.openCalendarModal();
        return;
      }

      // 2) 開啟一日活動模板庫
      if (target.closest('[data-open-day-templates]')) {
        e.preventDefault();
        TF.ui.openDayTemplateModal();
        return;
      }

      // 3) 開啟類別管理
      if (target.closest('[data-open-categories]')) {
        e.preventDefault();
        TF.ui.openCategoryModal();
        return;
      }

      // 4) 新增活動方塊模板
      if (target.closest('[data-add-template]')) {
        e.preventDefault();
        TF.ui.openTemplateModal(null);
        return;
      }

      // 5) 開啟統計報表視窗
      if (target.closest('[data-open-stats]')) {
        e.preventDefault();
        TF.ui.openStatsModal();
        return;
      }

      // 6) 開啟版本紀錄與系統資訊視窗
      if (target.closest('[data-open-version]')) {
        e.preventDefault();
        TF.ui.openVersionModal();
        return;
      }

      // 7) 展開/關閉手機版底部活動抽屜
      if (target.closest('[data-open-drawer]')) {
        e.preventDefault();
        TF.ui.openMobileDrawer();
        return;
      }
      if (target.closest('[data-close-drawer]')) {
        e.preventDefault();
        TF.ui.closeMobileDrawer();
        return;
      }

      // 8) 關閉任何 Modal
      const closeBtn = target.closest('[data-close-modal]');
      if (closeBtn) {
        e.preventDefault();
        const modalId = closeBtn.dataset.closeModal;
        TF.ui.closeModal(document.getElementById(modalId));
        return;
      }
    });

    // ==================== 2. Toolbar & Action Controls ====================
    document.getElementById('btnPrevDay')?.addEventListener('click', () => TF.store.shiftDate(-1));
    document.getElementById('btnNextDay')?.addEventListener('click', () => TF.store.shiftDate(1));
    document.getElementById('btnToday')?.addEventListener('click', () => {
      TF.store.setDate(toDateKey(new Date()));
      TF.timeline.scrollToSmartPosition();
    });

    document.getElementById('datePickerInput')?.addEventListener('change', (e) => {
      if (e.target.value) TF.store.setDate(e.target.value);
    });

    document.getElementById('btnQuickNewBlock')?.addEventListener('click', () => {
      TF.ui.openBlockModal(null, { startMinutes: 540, durationMinutes: 60 });
    });

    document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
      const next = TF.store.state.settings.theme === 'dark' ? 'light' : 'dark';
      TF.store.setTheme(next);
    });

    document.querySelectorAll('[data-zoom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.zoom;
        TF.store.setHourHeight(val === 'fit' ? 'fit' : Number(val));
      });
    });

    document.querySelectorAll('[data-mobile-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.mobileTool;
        TF.ui.closeModal(document.getElementById('statsModal'));
        document.getElementById(targetId)?.click();
      });
    });

    document.getElementById('btnCopyYesterday')?.addEventListener('click', () => {
      const count = TF.store.copyYesterdayToCurrent();
      if (count > 0) {
        TF.ui.showToast(`已從昨日複製 ${count} 項活動排程`, true);
      } else {
        TF.ui.showToast('昨日沒有排程可供複製');
      }
    });

    document.getElementById('btnClearDay')?.addEventListener('click', () => {
      const blocks = TF.store.getBlocks();
      if (blocks.length === 0) {
        TF.ui.showToast('當日目前沒有活動方塊');
        return;
      }
      if (confirm(`確定要清空當日全部 ${blocks.length} 項活動排程嗎？`)) {
        const count = TF.store.clearCurrentDay();
        TF.ui.showToast(`已清空當日 ${count} 項活動方塊`, true);
      }
    });

    // Export / Import JSON backup
    document.getElementById('btnExportData')?.addEventListener('click', () => {
      const json = TF.store.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeblock-${TF.VERSION}-backup-${toDateKey(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      TF.ui.showToast('已匯出 JSON 備份檔');
    });

    const importInput = document.getElementById('importFileInput');
    document.getElementById('btnImportData')?.addEventListener('click', () => importInput?.click());
    importInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          TF.store.importJSON(String(reader.result));
          TF.ui.showToast('已成功匯入備份資料！', true);
        } catch (err) {
          TF.ui.showToast(`匯入失敗：${err.message}`);
        }
        importInput.value = '';
      };
      reader.readAsText(file);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      const isEditingInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        TF.ui.closeAllModals();
        TF.store.setSelectedBlock(null);
        return;
      }

      if (isEditingInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const undone = TF.store.undo();
        if (undone) TF.ui.showToast(`已復原：${undone}`);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && TF.store.selectedBlockId) {
        e.preventDefault();
        TF.store.deleteBlock(TF.store.selectedBlockId);
        TF.ui.showToast('已刪除活動方塊', true);
      }
    });

    // ==================== 3. Store Subscription & Initial Render ====================
    TF.store.subscribe((reason) => {
      TF.timeline.render();
      TF.ui.renderAll();
      if (reason === 'date') {
        TF.timeline.updateNowLine();
      }
    });

    TF.timeline.render();
    TF.ui.renderAll();
    TF.timeline.scrollToSmartPosition();

    // Initialize Cloud Sync if available
    if (TF.sync) {
      try {
        TF.sync.subscribe(() => TF.ui.renderSyncStatus());
        TF.sync.init();
      } catch (e) {
        console.warn('Cloud sync init skipped:', e);
      }
    }

    // Register Service Worker (v2.0.0)
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
      navigator.serviceWorker.register('./sw.js?v=2.0.0').then((reg) => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.update().catch(() => {});
      }).catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})(window);
