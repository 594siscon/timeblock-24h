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
      this.lastTouchTime = 0;

      this.bindEvents();
    }

    bindEvents() {
      // Desktop mouse events
      document.addEventListener('mousedown', (e) => {
        if (Date.now() - this.lastTouchTime < 600) return;
        if (e.button !== 0) return;
        this.handleStart({
          target: e.target,
          clientX: e.clientX,
          clientY: e.clientY,
          id: 'mouse',
          isTouch: false,
          rawEvent: e
        });
      });

      document.addEventListener('mousemove', (e) => {
        if (!this.activeOp || this.activeOp.isTouch) return;
        this.handleMove({
          clientX: e.clientX,
          clientY: e.clientY,
          id: 'mouse',
          rawEvent: e
        });
      });

      document.addEventListener('mouseup', () => {
        if (!this.activeOp || this.activeOp.isTouch) return;
        this.handleEnd('mouse');
      });

      // Native Touch events with { passive: false } so iOS Safari never cancels drags with native scroll
      document.addEventListener(
        'touchstart',
        (e) => {
          this.lastTouchTime = Date.now();
          if (e.touches.length !== 1) return;
          const t = e.touches[0];
          this.handleStart({
            target: e.target,
            clientX: t.clientX,
            clientY: t.clientY,
            id: t.identifier,
            isTouch: true,
            rawEvent: e
          });
        },
        { passive: false }
      );

      document.addEventListener(
        'touchmove',
        (e) => {
          if (!this.activeOp || !this.activeOp.isTouch) return;
          const t = this.findTouch(e.touches, this.activeOp.id);
          if (!t) return;
          this.handleMove({
            clientX: t.clientX,
            clientY: t.clientY,
            id: t.identifier,
            rawEvent: e
          });
        },
        { passive: false }
      );

      document.addEventListener(
        'touchend',
        (e) => {
          this.lastTouchTime = Date.now();
          if (!this.activeOp || !this.activeOp.isTouch) return;
          const t = this.findTouch(e.changedTouches, this.activeOp.id);
          if (!t) return;
          this.handleEnd(t.identifier);
        },
        { passive: false }
      );

      document.addEventListener('touchcancel', () => {
        if (!this.activeOp || !this.activeOp.isTouch) return;
        this.cancelActive();
      });

      // Clicking/double-clicking on timeline empty space
      this.timeline.slotsLayerEl.addEventListener('click', () => {
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

    findTouch(touchList, identifier) {
      for (let i = 0; i < touchList.length; i++) {
        if (touchList[i].identifier === identifier) return touchList[i];
      }
      return null;
    }

    handleStart({ target, clientX, clientY, id, isTouch, rawEvent }) {
      // 1. Resize handle on an existing time block (immediate capture on both mouse & iOS touch)
      const resizeHandle = target.closest('.resize-handle');
      if (resizeHandle) {
        const blockEl = resizeHandle.closest('.time-block');
        if (!blockEl) return;
        const block = TF.store.getBlockById(blockEl.dataset.blockId);
        if (!block) return;

        rawEvent.preventDefault();
        rawEvent.stopPropagation();
        TF.store.setSelectedBlock(block.id);

        const liveBlockEl =
          this.timeline.blocksLayerEl.querySelector(`[data-block-id="${block.id}"]`) || blockEl;

        this.activeOp = {
          type: 'resize',
          edge: resizeHandle.dataset.resize, // 'top' | 'bottom'
          id,
          isTouch,
          blockId: block.id,
          blockEl: liveBlockEl,
          origStart: block.startMinutes,
          origDuration: block.durationMinutes,
          curStart: block.startMinutes,
          curDuration: block.durationMinutes,
          startY: clientY,
          activated: true
        };
        liveBlockEl.classList.add('is-resizing');
        document.body.classList.add('is-interacting');
        this.lastPointer = { x: clientX, y: clientY };
        this.startAutoScroll();
        return;
      }

      // 2. Existing time block body -> move or select
      const blockEl = target.closest('.time-block');
      if (blockEl && !target.closest('[data-action]')) {
        const block = TF.store.getBlockById(blockEl.dataset.blockId);
        if (!block) return;

        const op = {
          type: 'move',
          id,
          isTouch,
          blockId: block.id,
          blockEl,
          origStart: block.startMinutes,
          origDuration: block.durationMinutes,
          curStart: block.startMinutes,
          startX: clientX,
          startY: clientY,
          activated: false,
          longPressTimer: null
        };

        if (isTouch) {
          // On iOS touch: brief hold (220ms) lifts the block so normal vertical swiping scrolls the 24h grid
          op.longPressTimer = setTimeout(() => {
            if (this.activeOp !== op) return;
            this.activateBlockMove(op);
          }, 220);
        }

        this.activeOp = op;
        this.lastPointer = { x: clientX, y: clientY };
        return;
      }

      // 3. Draggable template card (desktop sidebar, mobile bottom dock, or mobile drawer)
      const tplEl = target.closest('[data-template-id]');
      if (tplEl && !target.closest('[data-tpl-action]')) {
        const tpl = TF.store.getTemplateById(tplEl.dataset.templateId);
        if (!tpl) return;

        const inMobileDock = Boolean(tplEl.closest('.mobile-dock-scroll'));

        const op = {
          type: 'template',
          id,
          isTouch,
          inMobileDock,
          template: tpl,
          category: TF.store.getCategoryById(tpl.categoryId),
          startX: clientX,
          startY: clientY,
          activated: false,
          longPressTimer: null,
          dropStartMinutes: null
        };

        if (isTouch) {
          // Hold 240ms OR drag upward immediately lifts the block onto the 24h timeline
          op.longPressTimer = setTimeout(() => {
            if (this.activeOp !== op || op.activated) return;
            this.activateTemplateDrag(op, this.lastPointer.x, this.lastPointer.y);
          }, 240);
        }

        this.activeOp = op;
        this.lastPointer = { x: clientX, y: clientY };
      }
    }

    activateBlockMove(op) {
      op.activated = true;
      TF.store.setSelectedBlock(op.blockId);
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

      // Close mobile drawer if open so the 24h timeline is fully visible for dropping
      TF.ui.closeMobileDrawer();

      const cat = op.category;
      const dur = op.template.defaultDuration || DEFAULT_DURATION;
      this.ghostEl.hidden = false;
      this.ghostEl.style.setProperty('--ghost-color', cat.color);
      this.ghostEl.style.backgroundColor = hexToRgba(cat.color, 0.95);
      this.ghostEl.innerHTML = `
        <span class="drag-ghost-icon">${escapeHtml(cat.icon || '')}</span>
        <span class="drag-ghost-title">${escapeHtml(op.template.title)}</span>
        <span class="drag-ghost-dur">${formatDuration(dur)}</span>
      `;
      this.positionGhost(clientX, clientY, op.isTouch);
      this.updateTemplateDropPreview(op, clientX, clientY);
      this.startAutoScroll();
    }

    handleMove({ clientX, clientY, id, rawEvent }) {
      if (!this.activeOp || id !== this.activeOp.id) return;
      this.lastPointer = { x: clientX, y: clientY };

      const op = this.activeOp;
      const dx = clientX - op.startX;
      const dy = clientY - op.startY;
      const dist = Math.hypot(dx, dy);

      // --- 1. Handle Resize ---
      if (op.type === 'resize') {
        rawEvent.preventDefault();
        this.updateResize(op, clientY);
        return;
      }

      // --- 2. Handle Placed Block Move ---
      if (op.type === 'move') {
        if (!op.activated) {
          if (op.isTouch) {
            // Finger moved before hold fired -> user is scrolling the 24h timeline
            if (dist > 9) {
              clearTimeout(op.longPressTimer);
              this.activeOp = null;
            }
            return;
          } else {
            if (dist >= 5) {
              this.activateBlockMove(op);
            } else {
              return;
            }
          }
        }

        rawEvent.preventDefault();
        this.updateBlockMove(op, clientY);
        return;
      }

      // --- 3. Handle Template Drag ---
      if (op.type === 'template') {
        if (!op.activated) {
          if (op.isTouch) {
            if (op.inMobileDock) {
              // Upward drag immediately locks onto the card and lifts into the timeline
              if (dy < -6) {
                rawEvent.preventDefault();
                clearTimeout(op.longPressTimer);
                this.activateTemplateDrag(op, clientX, clientY);
                return;
              }
              // Horizontal swipe inside dock
              if (Math.abs(dx) > 16 && Math.abs(dy) < 10) {
                clearTimeout(op.longPressTimer);
                op.isSwiping = true;
              }
              return;
            } else {
              // Inside vertical drawer list: vertical scroll vs horizontal/hold drag
              if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.4) {
                clearTimeout(op.longPressTimer);
                op.isSwiping = true;
                return;
              }
              if (Math.abs(dx) > 8 || dy < -6) {
                rawEvent.preventDefault();
                clearTimeout(op.longPressTimer);
                this.activateTemplateDrag(op, clientX, clientY);
                return;
              }
              return;
            }
          } else {
            if (dist >= 5) {
              rawEvent.preventDefault();
              this.activateTemplateDrag(op, clientX, clientY);
            } else {
              return;
            }
          }
        }

        rawEvent.preventDefault();
        this.positionGhost(clientX, clientY, op.isTouch);
        this.updateTemplateDropPreview(op, clientX, clientY);
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
        const origEnd = op.origStart + op.origDuration;
        newStart = clamp(op.origStart + deltaMins, 0, origEnd - SNAP_MINUTES);
        newDur = origEnd - newStart;
      }

      if (newStart !== op.curStart || newDur !== op.curDuration) {
        op.curStart = newStart;
        op.curDuration = newDur;

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

    positionGhost(x, y, isTouch) {
      // Lift ghost slightly above the thumb on mobile so finger never covers it
      const yOffset = isTouch ? '-130%' : '-65%';
      this.ghostEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, ${yOffset})`;
    }

    updateTemplateDropPreview(op, clientX, clientY) {
      // On touch, target the visible point just above the thumb
      const targetY = op.isTouch ? clientY - 36 : clientY;

      if (!this.timeline.isPointInsideTimeline(clientX, targetY)) {
        op.dropStartMinutes = null;
        this.timeline.hideDropPreview();
        this.hideTooltip();
        return;
      }

      const dur = op.template.defaultDuration || DEFAULT_DURATION;
      const rawMins = this.timeline.clientYToMinutes(targetY);
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
        targetY - 34,
        `${formatTime(snapped)} – ${formatTime(snapped + dur)} · ${formatDuration(dur)}`
      );
    }

    handleEnd(id) {
      if (!this.activeOp || id !== this.activeOp.id) return;
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
        } else if (!op.isSwiping) {
          // User clicked, tapped, or lifted without dragging into timeline -> Smart Click-to-Add!
          const cardEl = document.querySelector(`[data-template-id="${op.template.id}"]`);
          if (cardEl) cardEl._lastQuickAdd = Date.now();
          TF.ui?.quickAddTemplateToTimeline?.(op.template.id);
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
        const edgeZone = 68;
        const pointerY = this.activeOp.isTouch && this.activeOp.type === 'template'
          ? this.lastPointer.y - 36
          : this.lastPointer.y;
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
