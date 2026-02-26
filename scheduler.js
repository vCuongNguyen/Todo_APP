/**
 * Mục 4: Tự động sắp xếp task theo thời gian rảnh, hàng chờ
 * Lịch cố định hỗ trợ: daily | once | weekly | every_n_days | monthly
 */

const Scheduler = {
  /**
   * Kiểm tra một mục lịch cố định có áp dụng cho ngày dateStr (YYYY-MM-DD) không.
   */
  fixedAppliesToDate(item, dateStr) {
    const type = (item.type || 'daily').toLowerCase();
    if (type === 'daily') return true;
    if (type === 'once') return (item.onceDate || '') === dateStr;
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const dayOfMonth = d.getDate();
    if (type === 'weekly') return Number(item.dayOfWeek) === dayOfWeek;
    if (type === 'every_n_days') {
      const n = Math.max(1, parseInt(item.everyN, 10) || 1);
      const start = (item.everyNStartDate || dateStr).replace(/-/g, '');
      const current = dateStr.replace(/-/g, '');
      const startD = new Date(item.everyNStartDate || dateStr);
      const currD = new Date(dateStr);
      const diffDays = Math.floor((currD - startD) / (24 * 60 * 60 * 1000));
      return diffDays >= 0 && diffDays % n === 0;
    }
    if (type === 'monthly') return Number(item.dayOfMonth) === dayOfMonth;
    return true;
  },

  /**
   * Lấy danh sách khung bận (fixed) trong ngày dateStr từ raw fixed schedule (có thể có recurrence).
   * Trả về: [{ startMin, endMin, label }, ...]
   */
  getFixedBlocksForDay(dateStr, fixedSchedule) {
    const list = fixedSchedule || [];
    const blocks = [];
    list.forEach(f => {
      if (!Scheduler.fixedAppliesToDate(f, dateStr)) return;
      const start = Scheduler.timeToMinutes(f.start);
      const end = Scheduler.timeToMinutes(f.end);
      if (start < end) blocks.push({ startMin: start, endMin: end, label: f.label || '' });
    });
    return blocks.sort((a, b) => a.startMin - b.startMin);
  },

  /**
   * Lấy các khung giờ rảnh trong ngày (phút từ 0h).
   * fixedSchedule có thể có type: daily | once | weekly | every_n_days | monthly
   */
  getFreeSlotsForDay(dateStr, fixedSchedule) {
    const dayStart = 0;
    const dayEnd = 24 * 60;
    const fixed = Scheduler.getFixedBlocksForDay(dateStr, fixedSchedule);

    const slots = [];
    let lastEnd = dayStart;
    for (const block of fixed) {
      if (block.startMin > lastEnd) {
        slots.push({ startMin: lastEnd, endMin: block.startMin });
      }
      lastEnd = Math.max(lastEnd, block.endMin);
    }
    if (lastEnd < dayEnd) {
      slots.push({ startMin: lastEnd, endMin: dayEnd });
    }
    return slots;
  },

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = String(timeStr).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  },

  minutesToTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  /**
   * Sắp xếp task trong ngày: chọn ngày (YYYY-MM-DD), lấy task có deadline trong ngày hoặc span ngày,
   * sort theo ưu tiên (important+urgent > important > urgent > low), xếp vào free slots.
   * Nếu truyền nowMinutesInDay (phút từ 0h đến giờ hiện tại), chỉ xếp vào khung rảnh TỪ THỜI ĐIỂM NÀY TRỞ ĐI (không dùng slot đã qua).
   * Trả về: { scheduled: [{ task, startMin, endMin, slotIndex }], queue: [task] }
   */
  scheduleForDay(dateStr, tasks, fixedSchedule, nowMinutesInDay) {
    let freeSlots = Scheduler.getFreeSlotsForDay(dateStr, fixedSchedule);
    const totalFree = freeSlots.reduce((s, slot) => s + (slot.endMin - slot.startMin), 0);

    if (nowMinutesInDay != null && nowMinutesInDay > 0) {
      freeSlots = freeSlots.map(s => ({
        startMin: Math.max(s.startMin, nowMinutesInDay),
        endMin: s.endMin,
      })).filter(s => s.startMin < s.endMin);
    }

    const priorityOrder = [
      Data.Priority.IMPORTANT_URGENT,
      Data.Priority.IMPORTANT_NOT_URGENT,
      Data.Priority.NOT_IMPORTANT_URGENT,
      Data.Priority.NOT_IMPORTANT_NOT_URGENT,
    ];

    const date = new Date(dateStr + 'T00:00:00');
    const dayStart = date.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const eligible = tasks.filter(t => {
      if (t.status !== 'pending') return false;
      if (t.parentId) return false;
      const deadline = new Date(t.deadline).getTime();
      if (deadline < dayStart) return false;
      const taskMin = Data.getTaskTotalMinutes(t, tasks);
      if (t.singleDay && deadline <= dayEnd) return true;
      if (!t.singleDay && deadline >= dayStart) return true;
      return false;
    }).map(t => ({
      task: t,
      minutes: Data.getTaskTotalMinutes(t, tasks),
      priority: getPriority(t.important, t.urgent),
    }));

    eligible.sort((a, b) => {
      const pa = priorityOrder.indexOf(a.priority);
      const pb = priorityOrder.indexOf(b.priority);
      if (pa !== pb) return pa - pb;
      return new Date(a.task.deadline).getTime() - new Date(b.task.deadline).getTime();
    });

    const slotCopies = freeSlots.map(s => ({ startMin: s.startMin, endMin: s.endMin }));
    const scheduled = [];
    const queue = [];

    for (const { task, minutes } of eligible) {
      let placed = false;
      for (let i = 0; i < slotCopies.length; i++) {
        const slot = slotCopies[i];
        const available = slot.endMin - slot.startMin;
        if (available >= minutes) {
          scheduled.push({
            task,
            startMin: slot.startMin,
            endMin: slot.startMin + minutes,
            slotIndex: i,
          });
          slot.startMin += minutes;
          placed = true;
          break;
        }
      }
      if (!placed) queue.push(task);
    }

    return { scheduled, queue, freeSlots, totalFreeMinutes: totalFree };
  },

  /**
   * Cập nhật theo thời gian hiện tại: chỉ xếp task vào khung rảnh TỪ nowMinutesInDay TRỞ ĐI (không đẩy task đã xếp vào quá khứ ra hàng chờ).
   */
  getCurrentScheduleForDay(dateStr, tasks, fixedSchedule, nowMinutesInDay) {
    const { scheduled, queue } = Scheduler.scheduleForDay(dateStr, tasks, fixedSchedule, nowMinutesInDay);
    return {
      scheduled,
      queue,
    };
  },
};

function getPriority(important, urgent) {
  return Data.getPriority(important, urgent);
}
