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
    escapeHtml,
    hexToRgba
  } = TF.utils;

  class DragDropController {
    constructor(timeline) {
      this.timeline = timeline;
      this.ghostEl = document.getElementById('dragGhost');
      this.tooltipEl = document.getElementById('liveTimeTooltip');

      this.activeOp = null; // { type: 'template' | 'move' | 'resize', ... }
      this.autoScrollRaf = null;
      this.lastPointer = { x: 0, y: 0 };

      this.bindEvents();
    }

    bindEvents() {
      document.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
      document.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
      document.addEventListener('pointerup', (e) => this.onPointerUp(e));
      document.addEventListener('pointercancel', () => this.cancelActive());

      // Clicking/double-clicking on timeline empty space
      this.timeline.slotsLayerEl.addEventListener('click', (e) => {
        if (this.activeOp) return;
        TF.store.setSelectedBlock(null);
      });

      this.timeline.slotsLayerEl.addEventListener('dblclick', (e) => {
        const mins = this.timeline.clientYToMinutes(e.clientY);
        const start = clamp(snapMinutes(mins - 15), 0, MINUTES_PER_DAY - DEFAULT_DURATION);
        TF.ui.openBlockModal(null, { startMinutes: start, durationMinutes: DEFAULT_DURATION });
      });

      // Block action buttons & double click to edit
      this.timeline.blocksLayerEl.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        e.stopPropagation();
        const blockEl = actionBtn.closest('.time-block');
        if (!blockEl) return;
        const id = blockEl.dataset.blockId;
        const action = actionBtn.dataset.action;

        if (action === 'edit') {
          TF.ui.openBlockModal(id);
        } else if (action === 'duplicate') {
          const dup = TF.store.duplicateBlock(id);
          if (dup) TF.ui.showToast('已複製活動方塊', true);
        } else if (action === 'delete') {
          TF.store.deleteBlock(id);
          TF.ui.showToast('已刪除活動方塊', true);
        }
      });

      this.timeline.blocksLayerEl.addEventListener('dblclick', (e) => {
        if (e.target.closest('[data-action]') || e.target.closest('.resize-handle')) return;
        const blockEl = e.target.closest('.time-block');
        if (!blockEl) return;
        TF.ui.openBlockModal(blockEl.dataset.blockId);
      });
    }

    onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;

      // 1. Resize handle on an existing time block
      const resizeHandle = e.target.closest('.resize-handle');
      if (resizeHandle) {
        const blockEl = resizeHandle.closest('.time-block');
        if (!blockEl) return;
        const block = TF.store.getBlockById(blockEl.dataset.blockId);
        if (!block) return;

        e.preventDefault();
        e.stopPropagation();
        TF.store.setSelectedBlock(block.id);

        // Re-query DOM node because setSelectedBlock may re-render timeline blocks
        const liveBlockEl =
          this.timeline.blocksLayerEl.querySelector(`[data-block-id="${block.id}"]`) || blockEl;

        this.activeOp = {
          type: 'resize',
          edge: resizeHandle.dataset.resize, // 'top' | 'bottom'
          pointerId: e.pointerId,
          blockId: block.id,
          blockEl: liveBlockEl,
          origStart: block.startMinutes,
          origDuration: block.durationMinutes,
          curStart: block.startMinutes,
          curDuration: block.durationMinutes,
          startY: e.clientY,
          hasMoved: false
        };
        liveBlockEl.classList.add('is-resizing');
        document.body.classList.add('is-interacting');
        this.lastPointer = { x: e.clientX, y: e.clientY };
        this.startAutoScroll();
        return;
      }

      // 2. Existing time block body -> move or select
      const blockEl = e.target.closest('.time-block');
      if (blockEl && !e.target.closest('[data-action]')) {
        const block = TF.store.getBlockById(blockEl.dataset.blockId);
        if (!block) return;

        const isTouch = e.pointerType === 'touch';
        const op = {
          type: 'move',
          pointerId: e.pointerId,
          isTouch,
          blockId: block.id,
          blockEl,
          origStart: block.startMinutes,
          origDuration: block.durationMinutes,
          curStart: block.startMinutes,
          startX: e.clientX,
          startY: e.clientY,
          activated: false,
          longPressTimer: null
        };

        if (isTouch) {
          // On touch (iOS), require short hold (200ms) so vertical scrolling works naturally
          op.longPressTimer = setTimeout(() => {
            if (this.activeOp !== op) return;
            this.activateBlockMove(op);
          }, 200);
        }

        this.activeOp = op;
        this.lastPointer = { x: e.clientX, y: e.clientY };
        return;
      }

      // 3. Draggable template card (sidebar or mobile bottom dock)
      const tplEl = e.target.closest('[data-template-id]');
      if (tplEl && !e.target.closest('[data-tpl-action]')) {
        const tpl = TF.store.getTemplateById(tplEl.dataset.templateId);
        if (!tpl) return;

        const isTouch = e.pointerType === 'touch';
        const inMobileDock = Boolean(tplEl.closest('.mobile-dock-scroll'));

        const op = {
          type: 'template',
          pointerId: e.pointerId,
          isTouch,
          inMobileDock,
          template: tpl,
          category: TF.store.getCategoryById(tpl.categoryId),
          startX: e.clientX,
          startY: e.clientY,
          activated: false,
          longPressTimer: null,
          dropStartMinutes: null
        };

        if (isTouch) {
          op.longPressTimer = setTimeout(() => {
            if (this.activeOp !== op || op.activated) return;
            this.activateTemplateDrag(op, e.clientX, e.clientY);
          }, 180);
        }

        this.activeOp = op;
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
    }

    activateBlockMove(op) {
      op.activated = true;
      TF.store.setSelectedBlock(op.blockId);
      // Re-query element in case selection re-render replaced DOM node
      const freshEl = this.timeline.blocksLayerEl.querySelector(`[data-block-id="${op.blockId}"]`);
      if (freshEl) op.blockEl = freshEl;
      if (op.blockEl) op.blockEl.classList.add('is-dragging');
      document.body.classList.add('is-interacting');
      this.showTooltip(
        this.lastPointer.x,
        this.lastPointer.y,
        `${formatTime(op.curStart)} – ${formatTime(op.curStart + op.origDuration)} · ${formatDuration(op.origDuration)}`
      );
      this.startAutoScroll();
    }

    activateTemplateDrag(op, clientX, clientY) {
      op.activated = true;
      document.body.classList.add('is-interacting');

      // Close mobile drawer if open so user sees the 24h timeline immediately
      TF.ui.closeMobileDrawer();

      const cat = op.category;
      const dur = op.template.defaultDuration || DEFAULT_DURATION;
      this.ghostEl.hidden = false;
      this.ghostEl.style.setProperty('--ghost-color', cat.color);
      this.ghostEl.style.backgroundColor = hexToRgba(cat.color, 0.94);
      this.ghostEl.innerHTML = `
        <span class="drag-ghost-icon">${escapeHtml(cat.icon || '')}</span>
        <span class="drag-ghost-title">${escapeHtml(op.template.title)}</span>
        <span class="drag-ghost-dur">${formatDuration(dur)}</span>
      `;
      this.positionGhost(clientX, clientY);
      this.updateTemplateDropPreview(op, clientX, clientY);
      this.startAutoScroll();
    }

    onPointerMove(e) {
      if (!this.activeOp || e.pointerId !== this.activeOp.pointerId) return;
      this.lastPointer = { x: e.clientX, y: e.clientY };

      const op = this.activeOp;
      const dx = e.clientX - op.startX;
      const dy = e.clientY - op.startY;
      const dist = Math.hypot(dx, dy);

      // --- Handle Resize ---
      if (op.type === 'resize') {
        e.preventDefault();
        this.updateResize(op, e.clientY);
        return;
      }

      // --- Handle Placed Block Move ---
      if (op.type === 'move') {
        if (!op.activated) {
          if (op.isTouch) {
            // If finger moved before long-press fired, user is scrolling the timeline -> cancel drag
            if (dist > 8) {
              clearTimeout(op.longPressTimer);
              this.activeOp = null;
            }
            return;
          } else {
            // Mouse: activate after 5px movement
            if (dist >= 5) {
              this.activateBlockMove(op);
            } else {
              return;
            }
          }
        }

        e.preventDefault();
        this.updateBlockMove(op, e.clientY);
        return;
      }

      // --- Handle Template Drag ---
      if (op.type === 'template') {
        if (!op.activated) {
          if (op.isTouch) {
            // In horizontal dock, let horizontal swipes scroll smoothly; upward drag lifts card immediately!
            if (op.inMobileDock && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
              clearTimeout(op.longPressTimer);
              this.activeOp = null;
              return;
            }
            if (dy < -10 && Math.abs(dy) > Math.abs(dx) * 1.1) {
              clearTimeout(op.longPressTimer);
              this.activateTemplateDrag(op, e.clientX, e.clientY);
            } else if (!op.inMobileDock && dist > 10) {
              clearTimeout(op.longPressTimer);
              this.activeOp = null;
            }
            return;
          } else {
            if (dist >= 6) {
              this.activateTemplateDrag(op, e.clientX, e.clientY);
            } else {
              return;
            }
          }
        }

        e.preventDefault();
        this.positionGhost(e.clientX, e.clientY);
        this.updateTemplateDropPreview(op, e.clientX, e.clientY);
      }
    }

    updateResize(op, clientY) {
      const deltaPx = clientY - op.startY;
      const deltaMins = snapMinutes(this.timeline.pxToMinutes(deltaPx), SNAP_MINUTES);

      let newStart = op.origStart;
      let newDur = op.origDuration;

      if (op.edge === 'bottom') {
        newDur = clamp(op.origDuration + deltaMins, SNAP_MINUTES, MINUTES_PER_DAY - op.origStart);
      } else {
        // Top edge: keep end time anchored
        const origEnd = op.origStart + op.origDuration;
        newStart = clamp(op.origStart + deltaMins, 0, origEnd - SNAP_MINUTES);
        newDur = origEnd - newStart;
      }

      if (newStart !== op.curStart || newDur !== op.curDuration) {
        op.curStart = newStart;
        op.curDuration = newDur;
        op.hasMoved = true;

        const topPx = this.timeline.minutesToPx(newStart);
        const heightPx = Math.max(14, this.timeline.minutesToPx(newDur));
        op.blockEl.style.top = `${topPx}px`;
        op.blockEl.style.height = `${heightPx}px`;

        op.blockEl.classList.toggle('is-tiny', heightPx < 26);
        op.blockEl.classList.toggle('is-compact', heightPx >= 26 && heightPx < 46);

        const timeText = `${formatTime(newStart)}–${formatTime(newStart + newDur)}`;
        const inlineEl = op.blockEl.querySelector('.time-block-time-inline');
        const rangeEl = op.blockEl.querySelector('.time-block-range');
        if (inlineEl) inlineEl.textContent = timeText;
        if (rangeEl) rangeEl.textContent = `${timeText} · ${formatDuration(newDur)}`;
      }

      this.showTooltip(
        this.lastPointer.x,
        this.lastPointer.y,
        `${formatTime(op.curStart)} – ${formatTime(op.curStart + op.curDuration)} · ${formatDuration(op.curDuration)}`
      );
    }

    updateBlockMove(op, clientY) {
      const deltaPx = clientY - op.startY;
      const deltaMins = snapMinutes(this.timeline.pxToMinutes(deltaPx), SNAP_MINUTES);
      const newStart = clamp(op.origStart + deltaMins, 0, MINUTES_PER_DAY - op.origDuration);

      if (newStart !== op.curStart) {
        op.curStart = newStart;
        const topPx = this.timeline.minutesToPx(newStart);
        op.blockEl.style.top = `${topPx}px`;

        const timeText = `${formatTime(newStart)}–${formatTime(newStart + op.origDuration)}`;
        const inlineEl = op.blockEl.querySelector('.time-block-time-inline');
        const rangeEl = op.blockEl.querySelector('.time-block-range');
        if (inlineEl) inlineEl.textContent = timeText;
        if (rangeEl) rangeEl.textContent = `${timeText} · ${formatDuration(op.origDuration)}`;
      }

      this.showTooltip(
        this.lastPointer.x,
        this.lastPointer.y,
        `${formatTime(op.curStart)} – ${formatTime(op.curStart + op.origDuration)} · ${formatDuration(op.origDuration)}`
      );
    }

    positionGhost(x, y) {
      this.ghostEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -65%)`;
    }

    updateTemplateDropPreview(op, clientX, clientY) {
      if (!this.timeline.isPointInsideTimeline(clientX, clientY)) {
        op.dropStartMinutes = null;
        this.timeline.hideDropPreview();
        this.hideTooltip();
        return;
      }

      const dur = op.template.defaultDuration || DEFAULT_DURATION;
      const rawMins = this.timeline.clientYToMinutes(clientY);
      // Center block slightly around cursor or align top nicely
      const snapped = clamp(snapMinutes(rawMins - 15, SNAP_MINUTES), 0, MINUTES_PER_DAY - dur);
      op.dropStartMinutes = snapped;

      this.timeline.showDropPreview({
        startMinutes: snapped,
        durationMinutes: dur,
        color: op.category.color,
        title: op.template.title
      });
      this.showTooltip(
        clientX,
        clientY - 36,
        `${formatTime(snapped)} – ${formatTime(snapped + dur)} · ${formatDuration(dur)}`
      );
    }

    onPointerUp(e) {
      if (!this.activeOp || e.pointerId !== this.activeOp.pointerId) return;
      const op = this.activeOp;
      clearTimeout(op.longPressTimer);
      this.stopAutoScroll();
      this.hideTooltip();
      document.body.classList.remove('is-interacting');

      if (op.type === 'resize') {
        op.blockEl.classList.remove('is-resizing');
        if (op.curStart !== op.origStart || op.curDuration !== op.origDuration) {
          TF.store.updateBlock(op.blockId, {
            startMinutes: op.curStart,
            durationMinutes: op.curDuration
          });
        } else {
          this.timeline.render();
        }
      } else if (op.type === 'move') {
        if (op.activated) {
          if (op.blockEl) op.blockEl.classList.remove('is-dragging');
          if (op.curStart !== op.origStart) {
            TF.store.updateBlock(op.blockId, { startMinutes: op.curStart });
          } else {
            this.timeline.render();
          }
        } else {
          // Simple tap/click on block -> select it (shows resize knobs & quick action buttons)
          TF.store.setSelectedBlock(op.blockId);
        }
      } else if (op.type === 'template') {
        this.ghostEl.hidden = true;
        this.timeline.hideDropPreview();
        if (op.activated && op.dropStartMinutes !== null) {
          TF.store.addBlock({
            title: op.template.title,
            categoryId: op.template.categoryId,
            startMinutes: op.dropStartMinutes,
            durationMinutes: op.template.defaultDuration || DEFAULT_DURATION
          });
        }
      }

      this.activeOp = null;
    }

    cancelActive() {
      if (!this.activeOp) return;
      clearTimeout(this.activeOp.longPressTimer);
      this.stopAutoScroll();
      this.ghostEl.hidden = true;
      this.timeline.hideDropPreview();
      this.hideTooltip();
      document.body.classList.remove('is-interacting');
      this.activeOp = null;
      this.timeline.render();
    }

    showTooltip(x, y, text) {
      this.tooltipEl.hidden = false;
      this.tooltipEl.textContent = text;
      const clampedX = clamp(x, 90, window.innerWidth - 90);
      const clampedY = clamp(y - 38, 16, window.innerHeight - 40);
      this.tooltipEl.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) translate(-50%, 0)`;
    }

    hideTooltip() {
      this.tooltipEl.hidden = true;
    }

    startAutoScroll() {
      if (this.autoScrollRaf) return;
      const tick = () => {
        if (!this.activeOp) {
          this.autoScrollRaf = null;
          return;
        }
        const scrollEl = this.timeline.scrollEl;
        const rect = scrollEl.getBoundingClientRect();
        const edgeZone = 64;
        const pointerY = this.lastPointer.y;
        let speed = 0;

        if (pointerY < rect.top + edgeZone) {
          const ratio = clamp((rect.top + edgeZone - pointerY) / edgeZone, 0, 1.5);
          speed = -Math.round(4 + ratio * 10);
        } else if (pointerY > rect.bottom - edgeZone) {
          const ratio = clamp((pointerY - (rect.bottom - edgeZone)) / edgeZone, 0, 1.5);
          speed = Math.round(4 + ratio * 10);
        }

        if (speed !== 0) {
          const prevScroll = scrollEl.scrollTop;
          scrollEl.scrollTop += speed;
          const actualDelta = scrollEl.scrollTop - prevScroll;

          if (actualDelta !== 0) {
            if (this.activeOp.type === 'template' && this.activeOp.activated) {
              this.updateTemplateDropPreview(this.activeOp, this.lastPointer.x, this.lastPointer.y);
            } else if (this.activeOp.type === 'move' && this.activeOp.activated) {
              this.activeOp.startY -= actualDelta;
              this.updateBlockMove(this.activeOp, this.lastPointer.y);
            } else if (this.activeOp.type === 'resize') {
              this.activeOp.startY -= actualDelta;
              this.updateResize(this.activeOp, this.lastPointer.y);
            }
          }
        }

        this.autoScrollRaf = requestAnimationFrame(tick);
      };
      this.autoScrollRaf = requestAnimationFrame(tick);
    }

    stopAutoScroll() {
      if (this.autoScrollRaf) {
        cancelAnimationFrame(this.autoScrollRaf);
        this.autoScrollRaf = null;
      }
    }
  }

  TF.DragDropController = DragDropController;
})(window);
