/**
 * Mục 7: Biểu đồ thống kê theo ngày/tuần/tháng/năm: done vs trễ/hủy, tỷ lệ
 * + Danh sách task trong kỳ: xem, sửa, xóa, đổi trạng thái
 */

let statsChart = null;
let statsPeriod = 'week';

function getPeriodRange(period) {
  const now = new Date();
  let start, end;
  if (period === 'day') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  } else if (period === 'week') {
    start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear() + 1, 0, 1);
  }
  return { start, end, startTime: start.getTime(), endTime: end.getTime() };
}

const Stats = {
  init() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        statsPeriod = btn.dataset.period;
        Stats.render();
      });
    });
  },

  getStats(period) {
    const { startTime, endTime } = getPeriodRange(period);
    const tasks = Data.getTasks();
    let done = 0, late = 0, cancelled = 0;
    tasks.forEach(t => {
      if (t.parentId) return;
      const completedAt = t.completedAt ? new Date(t.completedAt).getTime() : 0;
      const deadline = t.deadline ? new Date(t.deadline).getTime() : 0;
      const cancelledAt = t.cancelledAt ? new Date(t.cancelledAt).getTime() : 0;
      if (t.status === 'done' && completedAt >= startTime && completedAt < endTime) done++;
      else if (t.status === 'late' && deadline >= startTime && deadline < endTime) late++;
      else if (t.status === 'cancelled' && cancelledAt >= startTime && cancelledAt < endTime) cancelled++;
    });
    return { done, late, cancelled, total: done + late + cancelled };
  },

  /** Trả về danh sách task theo nhóm: done, late, cancelled trong kỳ */
  getStatsTasks(period) {
    const { startTime, endTime } = getPeriodRange(period);
    const tasks = Data.getTasks();
    const done = [];
    const late = [];
    const cancelled = [];
    tasks.forEach(t => {
      if (t.parentId) return;
      const completedAt = t.completedAt ? new Date(t.completedAt).getTime() : 0;
      const deadline = t.deadline ? new Date(t.deadline).getTime() : 0;
      const cancelledAt = t.cancelledAt ? new Date(t.cancelledAt).getTime() : 0;
      if (t.status === 'done' && completedAt >= startTime && completedAt < endTime) done.push(t);
      else if (t.status === 'late' && deadline >= startTime && deadline < endTime) late.push(t);
      else if (t.status === 'cancelled' && cancelledAt >= startTime && cancelledAt < endTime) cancelled.push(t);
    });
    return { done, late, cancelled };
  },

  render() {
    const stats = Stats.getStats(statsPeriod);
    const ctx = document.getElementById('stats-chart');
    if (ctx) {
      if (statsChart) statsChart.destroy();
      statsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Hoàn thành', 'Trễ deadline', 'Hủy / Hàng chờ'],
          datasets: [{
            data: [stats.done, stats.late, stats.cancelled],
            backgroundColor: ['#22c55e', '#f59e0b', '#dc2626'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (item) => {
                  const total = item.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total ? ((item.raw / total) * 100).toFixed(1) : 0;
                  return `${item.label}: ${item.raw} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }
    Stats.renderTaskList();
  },

  renderTaskList() {
    const container = document.getElementById('stats-task-list');
    if (!container) return;
    const { done, late, cancelled } = Stats.getStatsTasks(statsPeriod);

    function metaText(t, type) {
      const deadlineStr = t.deadline ? new Date(t.deadline).toLocaleString('vi-VN') : '-';
      if (type === 'done' && t.completedAt) return 'Deadline: ' + deadlineStr + ' · Hoàn thành: ' + new Date(t.completedAt).toLocaleString('vi-VN');
      if (type === 'late') return 'Deadline: ' + deadlineStr;
      if (type === 'cancelled' && t.cancelledAt) return 'Deadline: ' + deadlineStr + ' · Hủy lúc: ' + new Date(t.cancelledAt).toLocaleString('vi-VN');
      return 'Deadline: ' + deadlineStr;
    }

    function renderGroup(title, tasks, type, statusClass) {
      const wrap = document.createElement('div');
      wrap.className = 'stats-task-group';
      wrap.innerHTML = '<h5 class="' + statusClass + '">' + title + ' (' + tasks.length + ')</h5>';
      const list = document.createElement('div');
      list.className = 'stats-task-group-list';
      tasks.forEach(t => {
        const row = document.createElement('div');
        row.className = 'stats-task-row';
        row.innerHTML = '<div class="stats-task-info"><span class="stats-task-name">' + escapeHtml(t.name) + '</span><span class="stats-task-meta">' + metaText(t, type) + '</span></div><div class="stats-task-actions"></div>';
        const actions = row.querySelector('.stats-task-actions');
        const btnSua = document.createElement('button');
        btnSua.type = 'button';
        btnSua.className = 'stats-action-btn stats-action-edit';
        btnSua.innerHTML = '<span class="stats-action-icon">✎</span><span class="stats-action-label">Sửa</span>';
        btnSua.title = 'Sửa';
        btnSua.addEventListener('click', () => App.openTaskModal({ editId: t.id }));
        const btnXoa = document.createElement('button');
        btnXoa.type = 'button';
        btnXoa.className = 'stats-action-btn stats-action-delete';
        btnXoa.innerHTML = '<span class="stats-action-icon">🗑</span><span class="stats-action-label">Xóa</span>';
        btnXoa.title = 'Xóa';
        btnXoa.addEventListener('click', () => {
          if (confirm('Xóa task “‘ + t.name +’”?')) {
            Data.deleteTask(t.id);
            Stats.render();
            Dashboard.render();
            KPI.render();
            App.renderDayTimeline();
            App.renderTodayPanel();
          }
        });
        actions.appendChild(btnSua);
        actions.appendChild(btnXoa);
        if (type === 'done') {
          const btnPending = document.createElement('button');
          btnPending.type = 'button';
          btnPending.className = 'stats-action-btn stats-action-pending';
          btnPending.innerHTML = '<span class="stats-action-icon">↩</span><span class="stats-action-label">Đặt lại pending</span>';
          btnPending.title = 'Đặt lại pending';
          btnPending.addEventListener('click', () => {
            Data.updateTask(t.id, { status: 'pending', completedAt: null, completedMinutes: 0 });
            Stats.render();
            Dashboard.render();
            KPI.render();
            App.renderDayTimeline();
            App.renderTodayPanel();
          });
          actions.appendChild(btnPending);
        }
        if (type === 'late') {
          const btnPending = document.createElement('button');
          btnPending.type = 'button';
          btnPending.className = 'stats-action-btn stats-action-pending';
          btnPending.innerHTML = '<span class="stats-action-icon">⏳</span><span class="stats-action-label">Đặt pending</span>';
          btnPending.title = 'Đặt pending';
          btnPending.addEventListener('click', () => {
            Data.updateTask(t.id, { status: 'pending' });
            Stats.render();
            Dashboard.render();
            KPI.render();
            App.renderDayTimeline();
            App.renderTodayPanel();
          });
          actions.appendChild(btnPending);
          const btnHuy = document.createElement('button');
          btnHuy.type = 'button';
          btnHuy.className = 'stats-action-btn stats-action-cancel';
          btnHuy.innerHTML = '<span class="stats-action-icon">⊘</span><span class="stats-action-label">Đặt hủy</span>';
          btnHuy.title = 'Đặt hủy';
          btnHuy.addEventListener('click', () => {
            Data.setTaskCancelledAt(t.id, new Date().toISOString());
            Stats.render();
            Dashboard.render();
            KPI.render();
            App.renderDayTimeline();
            App.renderTodayPanel();
          });
          actions.appendChild(btnHuy);
        }
        if (type === 'cancelled') {
          const btnPending = document.createElement('button');
          btnPending.type = 'button';
          btnPending.className = 'stats-action-btn stats-action-pending';
          btnPending.innerHTML = '<span class="stats-action-icon">↩</span><span class="stats-action-label">Đặt lại pending</span>';
          btnPending.title = 'Đặt lại pending';
          btnPending.addEventListener('click', () => {
            Data.updateTask(t.id, { status: 'pending', cancelledAt: null });
            Stats.render();
            Dashboard.render();
            KPI.render();
            App.renderDayTimeline();
            App.renderTodayPanel();
          });
          actions.appendChild(btnPending);
        }
        list.appendChild(row);
      });
      wrap.appendChild(list);
      return wrap;
    }

    container.innerHTML = '';
    container.appendChild(renderGroup('Hoàn thành', done, 'done', 'stats-label-done'));
    container.appendChild(renderGroup('Trễ deadline', late, 'late', 'stats-label-late'));
    container.appendChild(renderGroup('Hủy', cancelled, 'cancelled', 'stats-label-cancelled'));
  },
};

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
