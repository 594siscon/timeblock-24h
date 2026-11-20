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
      this.containerEl = document.getElementById('timelineContainer') || document.querySelector('.timeline-container');
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
        const available = Math.max(300, (this.scrollEl?.clientHeight || window.innerHeight - 160) - 24);
        return Math.max(18, Math.floor(available / 24));
      }
      return Number(cfg) || 60;
    }

    minutesToPx(minutes) {
      return (minutes / 60) * this.getHourHeight();
    }

    pxToMinutes(px) {
      return (px / this.getHourHeight()) * 60;
    }

    clientYToMinutes(clientY) {
      if (!this.gridEl) return 540;
      const rect = this.gridEl.getBoundingClientRect();
      const offsetY = clientY - rect.top;
      return this.pxToMinutes(offsetY);
    }

    isPointInsideTimeline(clientX, clientY) {
      if (!this.scrollEl) return false;
      const rect = this.scrollEl.getBoundingClientRect();
      return (
        clientX >= rect.left - 24 &&
        clientX <= rect.right + 24 &&
        clientY >= rect.top - 12 &&
        clientY <= rect.bottom + 12
      );
    }

    buildStaticGrid() {
      if (!this.hoursColEl || !this.slotsLayerEl) return;
      this.hoursColEl.innerHTML = '';
      this.slotsLayerEl.innerHTML = '';

      for (let h = 0; h < 24; h++) {
        const label = document.createElement('div');
        label.className = 'hour-label';
        label.textContent = `${String(h).padStart(2, '0')}:00`;
        this.hoursColEl.appendChild(label);

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

      const endLabel = document.createElement('div');
      endLabel.className = 'hour-label hour-label-end';
      endLabel.textContent = '24:00';
      this.hoursColEl.appendChild(endLabel);
    }

    applyZoom() {
      if (!this.gridEl || !this.hoursColEl) return;
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
      if (!this.nowLineEl || !this.nowLabelEl) return;
      const todayKey = toDateKey(new Date());
      const isToday = TF.store.selectedDate === todayKey;
      if (!isToday) {
        this.nowLineEl.hidden = true;
        return;
      }

      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      this.nowLineEl.hidden = false;
      this.nowLineEl.style.top = `${this.minutesToPx(mins)}px`;
      this.nowLabelEl.textContent = formatTime(mins);
    }

    render() {
      if (!this.blocksLayerEl) return;
      this.applyZoom();

      const blocks = TF.store.getBlocks();
      const layout = computeBlockLayout(blocks);
      const selectedId = TF.store.selectedBlockId;

      const html = blocks.map((block) => {
        const cat = TF.store.getCategoryById(block.categoryId);
        const topPx = this.minutesToPx(block.startMinutes);
        const heightPx = Math.max(14, this.minutesToPx(block.durationMinutes));
        const pos = layout.get(block.id) || { col: 0, totalCols: 1 };
        const widthPct = 100 / pos.totalCols;
        const leftPct = pos.col * widthPct;

        const isTiny = heightPx < 26;
        const isCompact = heightPx >= 26 && heightPx < 48;
        const isSelected = block.id === selectedId;
        const timeRange = `${formatTime(block.startMinutes)}–${formatTime(block.startMinutes + block.durationMinutes)}`;

        const classes = ['time-block'];
        if (isTiny) classes.push('is-tiny');
        if (isCompact) classes.push('is-compact');
        if (isSelected) classes.push('is-selected');

        return `
          <div class="${classes.join(' ')}"
               data-block-id="${block.id}"
               style="top:${topPx}px; height:${heightPx}px; left:calc(${leftPct}% + 3px); width:calc(${widthPct}% - 6px); --blk-color:${cat.color}; --blk-bg:${hexToRgba(cat.color, 0.16)}; --blk-border:${hexToRgba(cat.color, 0.45)};">
            <div class="resize-handle resize-handle-top" data-resize="top" title="拖曳調整開始時間"></div>
            <div class="time-block-inner">
              <div class="time-block-header">
                <span class="time-block-icon">${escapeHtml(cat.icon || '')}</span>
                <span class="time-block-title">${escapeHtml(block.title)}</span>
                <span class="time-block-time-inline">${timeRange}</span>
              </div>
              <div class="time-block-meta">
                <span class="time-block-range">${timeRange} · ${formatDuration(block.durationMinutes)}</span>
                ${block.note ? `<span class="time-block-note">${escapeHtml(block.note)}</span>` : ''}
              </div>
            </div>
            <div class="time-block-actions">
              <button type="button" class="blk-act-btn" data-action="edit" title="編輯活動">✏️</button>
              <button type="button" class="blk-act-btn" data-action="duplicate" title="複製活動">⧉</button>
              <button type="button" class="blk-act-btn is-del" data-action="delete" title="刪除活動">✕</button>
            </div>
            <div class="resize-handle resize-handle-bottom" data-resize="bottom" title="拖曳調整結束時間"></div>
          </div>
        `;
      }).join('');

      this.blocksLayerEl.innerHTML = html;
    }

    showDropPreview({ startMinutes, durationMinutes, color, title }) {
      if (!this.dropPreviewEl) return;
      const topPx = this.minutesToPx(startMinutes);
      const heightPx = Math.max(16, this.minutesToPx(durationMinutes));
      this.dropPreviewEl.hidden = false;
      this.dropPreviewEl.style.top = `${topPx}px`;
      this.dropPreviewEl.style.height = `${heightPx}px`;
      this.dropPreviewEl.style.borderColor = color;
      this.dropPreviewEl.style.backgroundColor = hexToRgba(color, 0.2);
      this.dropPreviewEl.innerHTML = `
        <span class="drop-preview-label" style="background:${color}">
          ${escapeHtml(title)} · ${formatTime(startMinutes)} – ${formatTime(startMinutes + durationMinutes)} (${formatDuration(durationMinutes)})
        </span>
      `;
    }

    hideDropPreview() {
      if (this.dropPreviewEl) this.dropPreviewEl.hidden = true;
    }

    scrollToMinutes(minutes) {
      if (!this.scrollEl || TF.store.state.settings.hourHeight === 'fit') return;
      const targetTop = Math.max(0, this.minutesToPx(minutes) - this.scrollEl.clientHeight * 0.28);
      this.scrollEl.scrollTo({ top: targetTop, behavior: 'smooth' });
    }

    scrollToSmartPosition() {
      if (!this.scrollEl || TF.store.state.settings.hourHeight === 'fit') return;
      const blocks = TF.store.getBlocks();
      const isToday = TF.store.selectedDate === toDateKey(new Date());

      let targetMin = 7 * 60; // default 07:00
      if (isToday) {
        const now = new Date();
        targetMin = Math.max(0, now.getHours() * 60 + now.getMinutes() - 90);
      } else if (blocks.length > 0) {
        const firstNonZero = blocks.find((b) => b.startMinutes >= 360) || blocks[0];
        targetMin = Math.max(0, firstNonZero.startMinutes - 45);
      }

      this.scrollEl.scrollTop = Math.max(0, this.minutesToPx(targetMin));
    }
  }

  TF.TimelineView = TimelineView;
})(window);
