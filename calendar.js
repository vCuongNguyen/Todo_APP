/**
 * Mục 1: Calendar tab, modes (ngày/tuần/tháng/năm), click calendar hoặc nút thêm để tạo task
 */

let calDate = new Date();
let calMode = 'day';

const Calendar = {
  daySlotMinutes: 60,

  init() {
    document.getElementById('cal-prev').addEventListener('click', () => Calendar.nav(-1));
    document.getElementById('cal-next').addEventListener('click', () => Calendar.nav(1));
    var todayBtn = document.getElementById('cal-today');
    if (todayBtn) todayBtn.addEventListener('click', () => {
      const t = new Date();
      calDate = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      Calendar.render();
      App.renderDayTimeline();
    });
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        calMode = btn.dataset.mode;
        Calendar.render();
      });
    });
    var intervalEl = document.getElementById('day-slot-interval');
    if (intervalEl) intervalEl.addEventListener('change', function() {
      Calendar.daySlotMinutes = parseInt(this.value, 10) || 60;
      Calendar.render();
    });
  },

  nav(delta) {
    if (calMode === 'day') calDate.setDate(calDate.getDate() + delta);
    else if (calMode === 'week') calDate.setDate(calDate.getDate() + delta * 7);
    else if (calMode === 'month') calDate.setMonth(calDate.getMonth() + delta);
    else calDate.setFullYear(calDate.getFullYear() + delta);
    Calendar.render();
  },

  setDate(d) {
    calDate = new Date(d);
    Calendar.render();
  },

  render() {
    const titleEl = document.getElementById('cal-title');
    const container = document.getElementById('calendar-container');
    const infoEl = document.getElementById('calendar-day-info');
    container.innerHTML = '';

    if (calMode === 'day') {
      titleEl.textContent = calDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      var daySlotWrap = document.getElementById('day-slot-wrap');
      if (daySlotWrap) daySlotWrap.style.display = '';
      var intervalSelect = document.getElementById('day-slot-interval');
      if (intervalSelect) intervalSelect.value = String(Calendar.daySlotMinutes);
      Calendar.renderDayView(container);
    } else {
      var daySlotWrap = document.getElementById('day-slot-wrap');
      if (daySlotWrap) daySlotWrap.style.display = 'none';
      if (infoEl) infoEl.textContent = '';
      if (calMode === 'week') {
        const start = new Date(calDate);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        titleEl.textContent = `${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`;
        Calendar.renderWeekView(container, start);
      } else if (calMode === 'month') {
        titleEl.textContent = calDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
        Calendar.renderMonthView(container);
      } else {
        titleEl.textContent = calDate.getFullYear().toString();
        Calendar.renderYearView(container);
      }
    }
    var daySection = document.getElementById('day-schedule-section');
    if (daySection) daySection.style.display = calMode === 'day' ? '' : 'none';
    if (calMode === 'day') App.renderDayTimeline();
  },

  /** Giờ VN (Asia/Ho_Chi_Minh): trả về { hours, minutes, minutesFromMidnight, dateStr } */
  getVietnamNow() {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const parts = formatter.formatToParts(new Date());
    const get = (type) => (parts.find(p => p.type === type) || {}).value;
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hours = parseInt(get('hour') || '0', 10);
    const minutes = parseInt(get('minute') || '0', 10);
    const dateStr = `${year}-${month}-${day}`;
    return { hours, minutes, minutesFromMidnight: hours * 60 + minutes, dateStr };
  },

  /** Số phút rảnh còn lại trong ngày (từ thời điểm VN hiện tại, không tính lịch cố định) */
  getRemainingFreeMinutesToday() {
    const fixedSchedule = Data.getFixedSchedule();
    const freeSlots = Scheduler.getFreeSlotsForDay(Calendar.dateToStr(calDate), fixedSchedule);
    const vn = Calendar.getVietnamNow();
    const nowMin = vn.minutesFromMidnight;
    const dayEnd = 24 * 60;
    let remaining = 0;
    freeSlots.forEach(slot => {
      if (slot.endMin <= nowMin) return;
      const start = Math.max(slot.startMin, nowMin);
      remaining += Math.min(slot.endMin, dayEnd) - start;
    });
    return remaining;
  },

  renderDayView(container) {
    const dateStr = Calendar.dateToStr(calDate);
    const vn = Calendar.getVietnamNow();
    const isTodayVN = dateStr === vn.dateStr;
    const allTasks = Data.getTasks();
    const fixedSchedule = Data.getFixedSchedule();
    const { scheduled } = isTodayVN
      ? Scheduler.getCurrentScheduleForDay(dateStr, allTasks, fixedSchedule, vn.minutesFromMidnight)
      : Scheduler.scheduleForDay(dateStr, allTasks, fixedSchedule);
    const fixedBlocks = Scheduler.getFixedBlocksForDay(dateStr, fixedSchedule);

    const slotMinutes = Calendar.daySlotMinutes || 60;
    const numSlots = 1440 / slotMinutes;
    const SLOT_HEIGHT = 40;
    const TOTAL_HEIGHT = numSlots * SLOT_HEIGHT;
    const MINUTES_PER_DAY = 24 * 60;

    const wrap = document.createElement('div');
    wrap.className = 'calendar-day-view';
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = '60px 1fr';
    wrap.style.gridTemplateRows = 'repeat(' + numSlots + ', ' + SLOT_HEIGHT + 'px)';
    wrap.style.position = 'relative';

    for (let i = 0; i < numSlots; i++) {
      const startMin = i * slotMinutes;
      const label = document.createElement('div');
      label.className = 'calendar-day-hour-label';
      label.textContent = Scheduler.minutesToTime(startMin);
      wrap.appendChild(label);
    }

    const contentArea = document.createElement('div');
    contentArea.className = 'calendar-day-content';
    contentArea.style.gridColumn = '2';
    contentArea.style.gridRow = '1 / -1';
    contentArea.style.position = 'relative';
    contentArea.style.height = TOTAL_HEIGHT + 'px';
    contentArea.style.minHeight = TOTAL_HEIGHT + 'px';

    const slotsLayer = document.createElement('div');
    slotsLayer.className = 'calendar-day-slots';
    slotsLayer.style.position = 'absolute';
    slotsLayer.style.inset = '0';
    slotsLayer.style.display = 'flex';
    slotsLayer.style.flexDirection = 'column';
    for (let i = 0; i < numSlots; i++) {
      const startMin = i * slotMinutes;
      const slot = document.createElement('div');
      slot.className = 'calendar-day-slot';
      if (isTodayVN && vn.minutesFromMidnight >= startMin && vn.minutesFromMidnight < startMin + slotMinutes) slot.classList.add('slot-current');
      slot.dataset.date = dateStr;
      slot.dataset.startMin = String(startMin);
      slot.style.height = SLOT_HEIGHT + 'px';
      slot.style.flexShrink = '0';
      slot.addEventListener('click', function(e) {
        if (!e.target.closest('.calendar-day-event')) App.openTaskModal({ presetDate: dateStr, presetHour: Math.floor(startMin / 60), presetMinute: startMin % 60 });
      });
      slotsLayer.appendChild(slot);
    }
    contentArea.appendChild(slotsLayer);

    const eventsLayer = document.createElement('div');
    eventsLayer.className = 'calendar-day-events';
    eventsLayer.style.position = 'absolute';
    eventsLayer.style.inset = '0';
    eventsLayer.style.pointerEvents = 'none';
    fixedBlocks.forEach(block => {
      const duration = block.endMin - block.startMin;
      const topPct = (block.startMin / MINUTES_PER_DAY) * 100;
      const heightPct = (duration / MINUTES_PER_DAY) * 100;
      const el = document.createElement('div');
      el.className = 'calendar-day-event calendar-day-event-fixed';
      el.style.pointerEvents = 'auto';
      el.style.top = topPct + '%';
      el.style.height = heightPct + '%';
      el.textContent = '🔒 ' + (block.label || 'Lịch cố định');
      el.title = (block.label || '') + ' ' + Scheduler.minutesToTime(block.startMin) + ' - ' + Scheduler.minutesToTime(block.endMin);
      eventsLayer.appendChild(el);
    });
    scheduled.forEach(s => {
      const duration = s.endMin - s.startMin;
      const topPct = (s.startMin / MINUTES_PER_DAY) * 100;
      const heightPct = (duration / MINUTES_PER_DAY) * 100;
      const el = document.createElement('div');
      el.className = 'calendar-day-event calendar-day-event-task ' + Dashboard.getAlertClass(s.task.important, s.task.urgent);
      el.style.pointerEvents = 'auto';
      el.style.top = topPct + '%';
      el.style.height = heightPct + '%';
      const project = s.task.projectId ? Data.getProject(s.task.projectId) : null;
      el.innerHTML = '<span class="calendar-day-event-name">' + (s.task.name || '') + '</span>' +
        (project ? '<span class="calendar-day-event-project-tag" style="background:' + (project.color || '#7c6fff') + '">' + (project.name || '') + '</span>' : '');
      el.title = s.task.name + (project ? ' · ' + (project.name || '') : '') + ' · ' + duration + ' phút';
      el.dataset.taskId = s.task.id;
      el.addEventListener('click', (e) => { e.stopPropagation(); App.openTaskModal({ editId: s.task.id }); });
      eventsLayer.appendChild(el);
    });
    contentArea.appendChild(eventsLayer);

    wrap.appendChild(contentArea);

    if (isTodayVN) {
      const topPx = (vn.minutesFromMidnight / MINUTES_PER_DAY) * TOTAL_HEIGHT;
      const nowLine = document.createElement('div');
      nowLine.className = 'calendar-now-line';
      nowLine.style.top = topPx + 'px';
      nowLine.style.left = '60px';
      nowLine.style.right = '0';
      nowLine.title = 'Hiện tại (giờ VN) ' + String(vn.hours).padStart(2, '0') + ':' + String(vn.minutes).padStart(2, '0');
      wrap.appendChild(nowLine);
    }
    container.appendChild(wrap);

    var infoEl = document.getElementById('calendar-day-info');
    if (infoEl) {
      var text = 'Giờ VN: ' + String(vn.hours).padStart(2, '0') + ':' + String(vn.minutes).padStart(2, '0') + ' · Khoảng: ' + slotMinutes + ' phút';
      if (isTodayVN) {
        var remainingMin = Calendar.getRemainingFreeMinutesToday();
        var h = Math.floor(remainingMin / 60);
        var m = remainingMin % 60;
        text += ' · Còn lại: ' + (h ? h + 'h ' : '') + m + 'm (không tính lịch cố định)';
      } else {
        text += ' · Chọn ngày hôm nay để xem thời gian còn lại';
      }
      infoEl.textContent = text;
    }
  },

  renderWeekView(container, weekStart) {
    const tasks = Data.getTasks();
    const fixedSchedule = Data.getFixedSchedule();
    const vn = Calendar.getVietnamNow();
    const todayStr = vn.dateStr;
    const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const wrap = document.createElement('div');
    wrap.className = 'calendar-week-view-wrap';
    // Header row (Giờ + 7 ngày)
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-week-grid calendar-week-header';
    const hourLabel = document.createElement('div');
    hourLabel.className = 'calendar-week-ts';
    hourLabel.textContent = 'Giờ';
    headerRow.appendChild(hourLabel);
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      const dateStr = Calendar.dateToStr(day);
      const th = document.createElement('div');
      th.className = 'calendar-week-thdr';
      if (dateStr === todayStr) th.classList.add('today');
      th.textContent = WEEKDAY_LABELS[day.getDay()] + ' ' + day.getDate();
      headerRow.appendChild(th);
    }
    wrap.appendChild(headerRow);
    // Body (scrollable)
    const body = document.createElement('div');
    body.className = 'calendar-week-body';
    for (let h = 0; h < 24; h++) {
      const startMin = h * 60;
      const endMin = (h + 1) * 60;
      const row = document.createElement('div');
      row.className = 'calendar-week-grid';
      const timeCell = document.createElement('div');
      timeCell.className = 'calendar-week-ts';
      timeCell.textContent = Scheduler.minutesToTime(startMin);
      row.appendChild(timeCell);
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        const dateStr = Calendar.dateToStr(day);
        const cell = document.createElement('div');
        cell.className = 'calendar-week-wc';
        cell.dataset.date = dateStr;
        cell.dataset.hour = String(h);
        const fixedBlocks = Scheduler.getFixedBlocksForDay(dateStr, fixedSchedule);
        const scheduled = Scheduler.scheduleForDay(dateStr, tasks, fixedSchedule).scheduled;
        const fixedInHour = fixedBlocks.filter(b => b.startMin < endMin && b.endMin > startMin);
        const taskInHour = scheduled.filter(s => s.startMin < endMin && s.endMin > startMin);
        fixedInHour.forEach(block => {
          const el = document.createElement('div');
          el.className = 'calendar-week-fb';
          el.textContent = (block.label || 'Lịch cố định').slice(0, 14);
          el.title = (block.label || '') + ' ' + Scheduler.minutesToTime(block.startMin) + '-' + Scheduler.minutesToTime(block.endMin);
          cell.appendChild(el);
        });
        taskInHour.forEach((s, idx) => {
          const el = document.createElement('div');
          el.className = 'calendar-week-wev';
          el.textContent = (s.task.name || '').slice(0, 14);
          el.title = s.task.name + ' · ' + (s.endMin - s.startMin) + ' phút';
          el.dataset.taskId = s.task.id;
          const priorityColor = Dashboard.getAlertClass(s.task.important, s.task.urgent);
          el.classList.add(priorityColor);
          if (taskInHour.length > 1) {
            el.style.top = (idx * (100 / taskInHour.length)) + '%';
            el.style.height = (100 / taskInHour.length) + '%';
          }
          el.addEventListener('click', (e) => { e.stopPropagation(); App.openTaskModal({ editId: s.task.id }); });
          cell.appendChild(el);
        });
        cell.addEventListener('click', (e) => {
          if (!e.target.closest('.calendar-week-fb') && !e.target.closest('.calendar-week-wev')) App.openTaskModal({ presetDate: dateStr, presetHour: h });
        });
        row.appendChild(cell);
      }
      body.appendChild(row);
    }
    wrap.appendChild(body);
    container.appendChild(wrap);
  },

  renderMonthView(container) {
    const wrap = document.createElement('div');
    wrap.className = 'calendar-month-view';
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    weekdays.forEach(wd => {
      const h = document.createElement('div');
      h.className = 'weekday';
      h.textContent = wd;
      wrap.appendChild(h);
    });

const first = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const tasks = Data.getTasks();
    const deadlineDateStr = (t) => (t.deadline || '').toString().slice(0, 10);
    const getChipPriorityClass = (important, urgent) => 'chip-' + (Dashboard.getAlertClass(important, urgent).replace('alert-', ''));
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      if (d.getMonth() !== calDate.getMonth()) cell.classList.add('other-month');
      const today = new Date();
      if (d.toDateString() === today.toDateString()) cell.classList.add('today');
      const numSpan = document.createElement('span');
      numSpan.className = 'day-cell-num';
      numSpan.textContent = d.getDate();
      cell.appendChild(numSpan);
      cell.dataset.date = Calendar.dateToStr(d);
      const dateStr = Calendar.dateToStr(d);
      const dayTasks = tasks.filter(t => !t.parentId && deadlineDateStr(t) === dateStr);
      if (dayTasks.length) cell.classList.add('has-event');
      if (dayTasks.length) {
        const chipWrap = document.createElement('div');
        chipWrap.className = 'day-cell-chips';
        dayTasks.slice(0, 3).forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'day-cell-chip ' + getChipPriorityClass(t.important, t.urgent);
          chip.textContent = (t.name || '').slice(0, 10);
          chip.title = t.name || '';
          chip.addEventListener('click', (e) => { e.stopPropagation(); App.openTaskModal({ editId: t.id }); });
          chipWrap.appendChild(chip);
        });
        if (dayTasks.length > 3) {
          const more = document.createElement('span');
          more.className = 'day-cell-chip day-cell-more';
          more.textContent = '+' + (dayTasks.length - 3);
          chipWrap.appendChild(more);
        }
        cell.appendChild(chipWrap);
      }
      cell.addEventListener('click', (e) => {
        if (!e.target.closest('.day-cell-chip')) App.openTaskModal({ presetDate: dateStr });
      });
      wrap.appendChild(cell);
    }
    container.appendChild(wrap);
  },

  renderYearView(container) {
    const wrap = document.createElement('div');
    wrap.className = 'calendar-year-view';
    const tasks = Data.getTasks();
    const roots = tasks.filter(t => !t.parentId);
    const deadlineDateStr = (t) => (t.deadline || '').toString().slice(0, 10);
    const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    for (let m = 0; m < 12; m++) {
      const year = calDate.getFullYear();
      const prefix = year + '-' + String(m + 1).padStart(2, '0');
      const monthTasks = roots.filter(t => deadlineDateStr(t).startsWith(prefix));
      const doneCount = monthTasks.filter(t => t.status === 'done').length;
      const total = monthTasks.length;
      const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
      const block = document.createElement('div');
      block.className = 'month-block';
      block.dataset.month = String(m);
      block.dataset.year = String(year);
      block.innerHTML = '<h4>' + MONTH_NAMES[m] + ' ' + year + '</h4>';
      if (total > 0) {
        const stats = document.createElement('div');
        stats.className = 'month-stats';
        stats.textContent = '📋 ' + total + ' · ✓ ' + doneCount;
        block.appendChild(stats);
        const progressWrap = document.createElement('div');
        progressWrap.className = 'month-progress';
        progressWrap.innerHTML = '<div class="month-progress-fill" style="width:' + pct + '%"></div>';
        block.appendChild(progressWrap);
        const pctEl = document.createElement('div');
        pctEl.className = 'month-pct';
        pctEl.textContent = pct + '%';
        block.appendChild(pctEl);
      } else {
        const empty = document.createElement('div');
        empty.className = 'month-empty';
        empty.textContent = 'Trống';
        block.appendChild(empty);
      }
      block.addEventListener('click', () => {
        calDate = new Date(year, m, 1);
        calMode = 'month';
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        const monthBtn = document.querySelector('.mode-btn[data-mode="month"]');
        if (monthBtn) monthBtn.classList.add('active');
        Calendar.render();
      });
      wrap.appendChild(block);
    }
    container.appendChild(wrap);
  },

  dateToStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  getCalendarDate() {
    return calDate;
  },
};
