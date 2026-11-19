(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  const { toDateKey } = TF.utils;

  function initApp() {
    TF.timeline = new TF.TimelineView();
    TF.ui = new TF.UIController();
    TF.dnd = new TF.DragDropController(TF.timeline);

    // Subscribe UI & Timeline to Store changes
    TF.store.subscribe((reason) => {
      TF.timeline.render();
      TF.ui.renderAll();
      if (reason === 'date') {
        TF.timeline.updateNowLine();
      }
    });

    // Initial render
    TF.timeline.render();
    TF.ui.renderAll();
    TF.timeline.scrollToSmartPosition();

    // Initialize Phase 3 Cloud Realtime Sync
    if (TF.sync) {
      TF.sync.subscribe(() => TF.ui.renderSyncStatus());
      TF.sync.init();
    }

    // --- Header & Toolbar Controls ---
    document.getElementById('btnPrevDay').addEventListener('click', () => TF.store.shiftDate(-1));
    document.getElementById('btnNextDay').addEventListener('click', () => TF.store.shiftDate(1));
    document.getElementById('btnToday').addEventListener('click', () => {
      TF.store.setDate(toDateKey(new Date()));
      TF.timeline.scrollToSmartPosition();
    });

    document.getElementById('datePickerInput').addEventListener('change', (e) => {
      if (e.target.value) TF.store.setDate(e.target.value);
    });

    document.getElementById('btnDateDisplay').addEventListener('click', () => {
      TF.ui.openCalendarModal();
    });

    // Theme toggle
    document.getElementById('btnThemeToggle').addEventListener('click', () => {
      const next = TF.store.state.settings.theme === 'dark' ? 'light' : 'dark';
      TF.store.setTheme(next);
    });

    // Zoom density buttons (including 'fit' for full 24H view)
    document.querySelectorAll('[data-zoom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.zoom;
        TF.store.setHourHeight(val === 'fit' ? 'fit' : Number(val));
      });
    });

    // Manage categories & Add template buttons (Desktop & Mobile)
    document.querySelectorAll('[data-open-categories]').forEach((btn) => {
      btn.addEventListener('click', () => TF.ui.openCategoryModal());
    });
    document.querySelectorAll('[data-add-template]').forEach((btn) => {
      btn.addEventListener('click', () => TF.ui.openTemplateModal(null));
    });

    // Mobile stats button & modal tool actions
    document.getElementById('btnMobileStats')?.addEventListener('click', () => TF.ui.openStatsModal());
    document.querySelectorAll('[data-mobile-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.mobileTool;
        TF.ui.closeModal(document.getElementById('statsModal'));
        document.getElementById(targetId)?.click();
      });
    });

    // Quick schedule actions
    document.getElementById('btnCopyYesterday')?.addEventListener('click', () => {
      const count = TF.store.copyYesterdayToCurrent();
      if (count > 0) {
        TF.ui.showToast(`已從昨日複製 ${count} 個活動方塊`, true);
      } else {
        TF.ui.showToast('昨日沒有排程可複製');
      }
    });

    document.getElementById('btnClearDay')?.addEventListener('click', () => {
      const count = TF.store.clearCurrentDay();
      if (count > 0) {
        TF.ui.showToast(`已清空當日 ${count} 個活動方塊`, true);
      } else {
        TF.ui.showToast('當日目前沒有活動方塊');
      }
    });

    // Export / Import JSON backup
    document.getElementById('btnExportData')?.addEventListener('click', () => {
      const json = TF.store.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeblock-backup-${toDateKey(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      TF.ui.showToast('已匯出備份檔（可用於電腦與手機間轉移資料）');
    });

    const importInput = document.getElementById('importFileInput');
    document.getElementById('btnImportData')?.addEventListener('click', () => importInput.click());
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

    // Keyboard shortcuts (Desktop)
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

    // Register Service Worker for PWA offline capability (only on http/https)
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})(window);
