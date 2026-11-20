(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});
  const {
    MINUTES_PER_DAY,
    formatTime,
    formatDuration,
    toDateKey,
    escapeHtml,
    hexToRgba,
    computeBlockLayout
  } = TF.utils;

  class TimelineView {
    constructor() {
      this.scrollEl = document.getElementById('timelineScroll');
      this.containerEl = document.querySelector('.timeline-container');
      this.gridEl = document.getElementById('timelineGrid');
      this.hoursColEl = document.getElementById('timelineHours');
      this.slotsLayerEl = document.getElementById('timelineSlots');
      this.blocksLayerEl = document.getElementById('timelineBlocks');
      this.dropPreviewEl = document.getElementById('dropPreview');
      this.nowLineEl = document.getElementById('nowLine');
      this.nowLabelEl = document.getElementById('nowLabel');

      this.buildStaticGrid();
      this.updateNowLine();
      setInterval(() => this.updateNowLine(), 30000);

      window.addEventListener('resize', () => {
        if (TF.store.state.settings.hourHeight === 'fit') {
          this.render();
        }
      });
    }

    getHourHeight() {
      const cfg = TF.store.state.settings.hourHeight;
      if (cfg === 'fit') {
        const available = Math.max(320, (this.scrollEl?.clientHeight || window.innerHeight - 140) - 36);
        return Math.max(18, Math.floor(available / 24));
      }
      return Number(cfg) || 64;
    }

    minutesToPx(minutes) {
      return (minutes / 60) * this.getHourHeight();
    }

    pxToMinutes(px) {
      return (px / this.getHourHeight()) * 60;
    }

    buildStaticGrid() {
      this.hoursColEl.innerHTML = '';
      this.slotsLayerEl.innerHTML = '';

      for (let h = 0; h < 24; h++) {
        // Hour label on the left rail
        const label = document.createElement('div');
        label.className = 'hour-label';
        label.textContent = `${String(h).padStart(2, '0')}:00`;
        this.hoursColEl.appendChild(label);

        // Hour slot row in main grid
        const row = document.createElement('div');
        row.className = 'hour-row';
        if (h < 6 || h >= 23) row.classList.add('is-night');
        row.dataset.hour = String(h);
        row.innerHTML = `
          <div class="quarter-line q1"></div>
          <div class="half-line"></div>
          <div class="quarter-line q3"></div>
        `;
        this.slotsLayerEl.appendChild(row);
      }

      // 24:00 end label at the very bottom
      const endLabel = document.createElement('div');
      endLabel.className = 'hour-label hour-label-end';
      endLabel.textContent = '24:00';
      this.hoursColEl.appendChild(endLabel);
    }

    applyZoom() {
      const hourHeight = this.getHourHeight();
      const totalHeight = hourHeight * 24;
      const isFit = TF.store.state.settings.hourHeight === 'fit' || hourHeight <= 34;
      document.documentElement.style.setProperty('--hour-height', `${hourHeight}px`);
      this.gridEl.style.height = `${totalHeight}px`;
      this.hoursColEl.style.height = `${totalHeight}px`;
      this.gridEl.classList.toggle('is-fit-mode', isFit);
      if (this.containerEl) this.containerEl.classList.toggle('is-fit-mode', isFit);
      this.updateNowLine();
    }

    updateNowLine() {
      const todayKey = toDateKey(new Date());
      const isToday = TF.store.selectedDate === todayKey;
      if (!isToday) {
        this.nowLineEl.hidden = true;
        return;
      }
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const top = this.minutesToPx(mins);
      this.nowLineEl.hidden = false;
      this.nowLineEl.style.top = `${top}px`;
      this.nowLabelEl.textContent = formatTime(mins);
    }

    scrollToSmartPosition() {
      if (TF.store.state.settings.hourHeight === 'fit') {
        this.scrollEl.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }
      const todayKey = toDateKey(new Date());
      let targetMins = 7 * 60; // Default 07:00
      if (TF.store.selectedDate === todayKey) {
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        targetMins = Math.max(0, nowMins - 150);
      }
      const targetPx = this.minutesToPx(targetMins);
      this.scrollEl.scrollTo({ top: targetPx, behavior: 'auto' });
    }

    scrollToMinutes(minutes, smooth = true) {
      if (TF.store.state.settings.hourHeight === 'fit') return;
      const targetPx = Math.max(0, this.minutesToPx(minutes) - 100);
      this.scrollEl.scrollTo({ top: targetPx, behavior: smooth ? 'smooth' : 'auto' });
    }

    showDropPreview({ startMinutes, durationMinutes, color, title }) {
      const top = this.minutesToPx(startMinutes);
      const height = Math.max(14, this.minutesToPx(durationMinutes));
      const endMinutes = startMinutes + durationMinutes;

      this.dropPreviewEl.hidden = false;
      this.dropPreviewEl.style.top = `${top}px`;
      this.dropPreviewEl.style.height = `${height}px`;
      this.dropPreviewEl.style.setProperty('--preview-color', color || '#3B82F6');
      this.dropPreviewEl.style.backgroundColor = hexToRgba(color || '#3B82F6', 0.2);
      this.dropPreviewEl.style.borderColor = color || '#3B82F6';
      this.dropPreviewEl.innerHTML = `
        <div class="drop-preview-content">
          <span class="drop-preview-title">${escapeHtml(title)}</span>
          <span class="drop-preview-time">${formatTime(startMinutes)} – ${formatTime(endMinutes)} (${formatDuration(durationMinutes)})</span>
        </div>
      `;
    }

    hideDropPreview() {
      this.dropPreviewEl.hidden = true;
    }

    render() {
      this.applyZoom();
      this.updateNowLine();

      const blocks = TF.store.getBlocks();
      const layoutMap = computeBlockLayout(blocks);
      const selectedId = TF.store.selectedBlockId;

      const fragment = document.createDocumentFragment();

      for (const block of blocks) {
        const cat = TF.store.getCategoryById(block.categoryId);
        const pos = layoutMap.get(block.id) || { col: 0, totalCols: 1 };

        const top = this.minutesToPx(block.startMinutes);
        const height = Math.max(14, this.minutesToPx(block.durationMinutes));
        const endMinutes = block.startMinutes + block.durationMinutes;

        const widthPct = 100 / pos.totalCols;
        const leftPct = pos.col * widthPct;

        const el = document.createElement('div');
        el.className = 'time-block';
        if (block.id === selectedId) el.classList.add('is-selected');
        if (height < 26) el.classList.add('is-tiny');
        else if (height < 46) el.classList.add('is-compact');

        el.dataset.blockId = block.id;
        el.style.top = `${top}px`;
        el.style.height = `${height}px`;
        el.style.left = `calc(${leftPct}% + 3px)`;
        el.style.width = `calc(${widthPct}% - 6px)`;
        el.style.setProperty('--block-color', cat.color);
        el.style.setProperty('--block-bg', hexToRgba(cat.color, 0.14));
        el.style.setProperty('--block-bg-dark', hexToRgba(cat.color, 0.24));
        el.style.setProperty('--block-border', hexToRgba(cat.color, 0.45));

        const timeText = `${formatTime(block.startMinutes)}–${formatTime(endMinutes)}`;
        const durText = formatDuration(block.durationMinutes);

        el.innerHTML = `
          <div class="resize-handle resize-handle-top" data-resize="top" title="拖曳調整開始時間（每 15 分鐘）">
            <span class="resize-knob"></span>
          </div>
          <div class="time-block-inner">
            <div class="time-block-header">
              <span class="time-block-title">
                <span class="time-block-icon">${escapeHtml(cat.icon || '')}</span>
                <span class="time-block-name">${escapeHtml(block.title)}</span>
              </span>
              <span class="time-block-time-inline">${timeText}</span>
            </div>
            <div class="time-block-meta">
              <span class="time-block-range">${timeText} · ${durText}</span>
              <span class="time-block-cat-tag">${escapeHtml(cat.name)}</span>
            </div>
            ${block.note && height >= 68 ? `<div class="time-block-note">${escapeHtml(block.note)}</div>` : ''}
          </div>
          <div class="time-block-actions">
            <button type="button" class="block-action-btn" data-action="edit" title="編輯活動" aria-label="編輯">✎</button>
            <button type="button" class="block-action-btn" data-action="duplicate" title="複製方塊" aria-label="複製">⧉</button>
            <button type="button" class="block-action-btn is-danger" data-action="delete" title="刪除" aria-label="刪除">✕</button>
          </div>
          <div class="resize-handle resize-handle-bottom" data-resize="bottom" title="拖曳調整結束時間（每 15 分鐘）">
            <span class="resize-knob"></span>
          </div>
        `;

        fragment.appendChild(el);
      }

      this.blocksLayerEl.innerHTML = '';
      this.blocksLayerEl.appendChild(fragment);
    }

    /**
     * Converts clientY viewport coordinate to snapped minutes within [0, 1440].
     */
    clientYToMinutes(clientY) {
      const rect = this.gridEl.getBoundingClientRect();
      const offsetY = clientY - rect.top;
      const mins = this.pxToMinutes(offsetY);
      return Math.max(0, Math.min(MINUTES_PER_DAY, mins));
    }

    isPointInsideTimeline(clientX, clientY) {
      const rect = this.scrollEl.getBoundingClientRect();
      return (
        clientX >= rect.left - 48 &&
        clientX <= rect.right + 48 &&
        clientY >= rect.top - 24 &&
        clientY <= rect.bottom + 64
      );
    }
  }

  TF.TimelineView = TimelineView;
})(window);
