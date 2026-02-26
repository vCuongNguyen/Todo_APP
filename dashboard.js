/**
 * Mục 6: Dashboard - thẻ thống kê, filter, tìm kiếm, sort theo thời gian & ưu tiên, thanh bar gradient
 */

const Dashboard = {
  filterMode: 'all',
  init() {
    var pillsWrap = document.getElementById('dashboard-filter-pills');
    if (pillsWrap) {
      ['all', 'active', 'done', 'late'].forEach(function(key) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-pill';
        btn.dataset.filter = key;
        btn.textContent = { all: 'Tất cả', active: 'Đang', done: 'Done', late: 'Trễ' }[key];
        btn.addEventListener('click', function() {
          Dashboard.filterMode = key;
          document.querySelectorAll('.filter-pill').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          Dashboard.render();
        });
        pillsWrap.appendChild(btn);
      });
      document.querySelector('.filter-pill[data-filter="all"]').classList.add('active');
    }
    var searchEl = document.getElementById('dashboard-search');
    if (searchEl) searchEl.addEventListener('input', function() { Dashboard.render(); });
    var priorityEl = document.getElementById('filter-priority');
    if (priorityEl) priorityEl.addEventListener('change', function() { Dashboard.render(); });
    var dateEl = document.getElementById('filter-date');
    if (dateEl) dateEl.addEventListener('change', function() { Dashboard.render(); });
    var monthEl = document.getElementById('filter-month');
    if (monthEl) monthEl.addEventListener('change', function() { Dashboard.render(); });
  },

  getStats() {
    var roots = Data.getRootTasks();
    var vn = Calendar.getVietnamNow();
    var todayStr = vn.dateStr;
    var fixedSchedule = Data.getFixedSchedule();
    var tasks = Data.getTasks();
    var queueResult = Scheduler.getCurrentScheduleForDay(todayStr, tasks, fixedSchedule, vn.minutesFromMidnight);
    var late = roots.filter(function(t) { return t.status === 'late'; }).length;
    var done = roots.filter(function(t) { return t.status === 'done'; }).length;
    var total = roots.length;
    var kpi = Data.getKPI();
    var kpiRate = total ? (kpi.type === 'done_ratio' ? (done / total) * 100 : (roots.reduce(function(s, t) { return s + Data.getTaskCompletionByTime(t, tasks); }, 0) / total)) : 0;
    var rewards = Data.getRewardsState();
    return {
      total: total,
      done: done,
      late: late,
      queueCount: queueResult.queue.length,
      kpiRate: Math.round(kpiRate),
      kpiTarget: kpi.target || 80,
      pts: (rewards && rewards.points) || 0,
    };
  },

  renderStatsCards() {
    var container = document.getElementById('dashboard-stats-cards');
    if (!container) return;
    var s = Dashboard.getStats();
    container.innerHTML = '<div class="stats-card">' +
      '<div class="stats-card-label">Tổng task</div>' +
      '<div class="stats-card-value">' + s.total + '</div>' +
      '<div class="stats-card-sub">' + s.done + ' done</div>' +
      '</div>' +
      '<div class="stats-card">' +
      '<div class="stats-card-label">Trễ deadline</div>' +
      '<div class="stats-card-value stats-card-danger">' + s.late + '</div>' +
      '<div class="stats-card-sub">Cần xử lý</div>' +
      '</div>' +
      '<div class="stats-card">' +
      '<div class="stats-card-label">Hàng chờ</div>' +
      '<div class="stats-card-value stats-card-warning">' + s.queueCount + '</div>' +
      '<div class="stats-card-sub">Hôm nay</div>' +
      '</div>' +
      '<div class="stats-card stats-card-clickable" id="stats-card-kpi" title="Mở cài đặt KPI">' +
      '<div class="stats-card-label">KPI ' + (s.kpiTarget || 80) + '%</div>' +
      '<div class="stats-card-value ' + (s.kpiRate >= (s.kpiTarget || 80) ? 'stats-card-success' : 'stats-card-warning') + '">' + s.kpiRate + '%</div>' +
      '<div class="stats-card-sub">⭐ ' + (s.pts || 0) + ' pts</div>' +
      '</div>';
    var kpiCard = document.getElementById('stats-card-kpi');
    if (kpiCard) kpiCard.addEventListener('click', function() {
      KPI.loadIntoSettings();
      App.openModal('modal-kpi');
    });
  },

  render() {
    Dashboard.renderStatsCards();
    var container = document.getElementById('dashboard-tasks');
    if (!container) return;
    var roots = Data.getRootTasks();
    var searchQ = (document.getElementById('dashboard-search') && document.getElementById('dashboard-search').value.trim().toLowerCase()) || '';
    var filterPriority = (document.getElementById('filter-priority') && document.getElementById('filter-priority').value) || '';
    var filterDate = (document.getElementById('filter-date') && document.getElementById('filter-date').value) || '';
    var filterMonth = (document.getElementById('filter-month') && document.getElementById('filter-month').value) || '';

    var list = roots.filter(function(t) {
      if (Dashboard.filterMode === 'active' && t.status !== 'pending') return false;
      if (Dashboard.filterMode === 'done' && t.status !== 'done') return false;
      if (Dashboard.filterMode === 'late' && t.status !== 'late') return false;
      if (searchQ && !((t.name || '').toLowerCase().includes(searchQ))) return false;
      if (filterPriority && Data.getPriority(t.important, t.urgent) !== filterPriority) return false;
      if (filterDate && t.deadline) {
        var d = t.deadline.slice(0, 10);
        if (d !== filterDate) return false;
      }
      if (filterMonth && t.deadline) {
        var m = t.deadline.slice(0, 7);
        if (m !== filterMonth) return false;
      }
      return true;
    });

    var priorityOrder = [
      Data.Priority.IMPORTANT_URGENT,
      Data.Priority.IMPORTANT_NOT_URGENT,
      Data.Priority.NOT_IMPORTANT_URGENT,
      Data.Priority.NOT_IMPORTANT_NOT_URGENT,
    ];
    var sorted = list.slice().sort(function(a, b) {
      var pa = priorityOrder.indexOf(Data.getPriority(a.important, a.urgent));
      var pb = priorityOrder.indexOf(Data.getPriority(b.important, b.urgent));
      if (pa !== pb) return pa - pb;
      return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime();
    });

    container.innerHTML = '';
    sorted.forEach(function(task) { Dashboard.renderTaskBar(container, task, false); });
  },

  getAlertClass(important, urgent) {
    if (important && urgent) return 'alert-high';
    if (important && !urgent) return 'alert-mid-high';
    if (!important && urgent) return 'alert-mid-low';
    return 'alert-low';
  },

  renderTaskBar(container, task, isSubtask) {
    var allTasks = Data.getTasks();
    var totalMin = Data.getTaskTotalMinutes(task, allTasks);
    var pctCount = Data.getTaskCompletionByCount(task, allTasks);
    var pctTime = Data.getTaskCompletionByTime(task, allTasks);
    var pct = (task.childIds && task.childIds.length) ? (pctCount + pctTime) / 2 : (task.status === 'done' ? 100 : ((task.completedMinutes || 0) / (task.estimatedMinutes || 1) * 100));
    var alertClass = Dashboard.getAlertClass(task.important, task.urgent);
    var gradientClass = 'task-bar-' + alertClass.replace('alert-', '');

    var bar = document.createElement('div');
    bar.className = 'task-bar task-bar-gradient ' + gradientClass + (isSubtask ? ' subtask' : '');
    bar.dataset.id = task.id;
    if (task.status === 'done') { bar.style.opacity = '0.55'; bar.classList.add('task-done'); }
    var deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : '-';
    var subInfo = (task.childIds && task.childIds.length)
      ? ' (' + (pctCount).toFixed(0) + '% theo số task, ' + (pctTime).toFixed(0) + '% theo thời gian)'
      : '';
    var isLate = task.status === 'late';
    var badgeLate = isLate ? '<span class="task-bar-badge task-bar-badge-late">Trễ</span>' : '';
    var badgeDone = task.status === 'done' ? '<span class="task-bar-badge task-bar-badge-done">✓</span>' : '';
    var urgentLabel = task.urgent ? '<span class="task-bar-urgent task-bar-urgent-yes" title="Gấp">⚡ Gấp</span>' : '<span class="task-bar-urgent task-bar-urgent-no" title="Không gấp">○ Không gấp</span>';
    var progressHtml = (task.childIds && task.childIds.length) ? '<div class="task-bar-progress-wrap"><div class="task-bar-progress"><div class="task-bar-progress-fill" style="width:' + Math.min(100, pct) + '%"></div></div><div class="task-bar-progress-labels"><span>' + (pctCount).toFixed(0) + '%</span> <span>' + (pctTime).toFixed(0) + '% (giờ)</span></div></div>' : '';
    bar.innerHTML = '<span class="task-bar-dot"></span>' +
      '<div class="task-bar-main">' +
        '<div class="task-bar-head">' +
          '<span class="task-bar-name">' + escapeHtml(task.name) + '</span>' + badgeLate + badgeDone +
        '</div>' +
        (progressHtml || '') +
        '<div class="task-bar-meta">Deadline: ' + deadlineStr + ' · ' + totalMin + ' phút' + subInfo + '</div>' +
      '</div>' +
      '<div class="task-bar-right">' +
        '<span class="task-bar-time">~' + totalMin + 'p</span>' +
        '<span class="task-bar-date">' + deadlineStr + '</span>' +
        '<span class="task-bar-priority-badge">' + urgentLabel + '</span>' +
      '</div>' +
      '<div class="task-bar-actions">' +
        '<button type="button" class="task-bar-btn task-bar-btn-done" title="Done" aria-label="Đánh dấu xong">✓</button>' +
        '<button type="button" class="task-bar-btn task-bar-btn-edit" title="Sửa" aria-label="Sửa task">✎</button>' +
        '<button type="button" class="task-bar-btn task-bar-btn-delete" title="Xóa" aria-label="Xóa task">🗑</button>' +
      '</div>';
    bar.querySelector('.task-bar-dot').style.background = Dashboard.getPriorityColor(task.important, task.urgent);
    container.appendChild(bar);

    bar.querySelector('.task-bar-btn-done').addEventListener('click', function(e) {
      e.stopPropagation();
      App.markTaskDone(task.id);
    });
    bar.querySelector('.task-bar-btn-edit').addEventListener('click', function(e) {
      e.stopPropagation();
      App.openTaskModal({ editId: task.id });
    });
    bar.querySelector('.task-bar-btn-delete').addEventListener('click', function(e) {
      e.stopPropagation();
      App.deleteTask(task.id);
    });
    bar.addEventListener('click', function(e) {
      if (e.target.closest('.task-bar-btn')) return;
      App.openTaskModal({ editId: task.id });
    });

    if (task.childIds && task.childIds.length) {
      var children = task.childIds.map(function(id) { return allTasks.find(function(t) { return t.id === id; }); }).filter(Boolean);
      children.forEach(function(c) { Dashboard.renderTaskBar(container, c, true); });
    }
  },

  getPriorityColor(important, urgent) {
    if (important && urgent) return '#ff4f70';
    if (important && !urgent) return '#fb923c';
    if (!important && urgent) return '#38bdf8';
    return '#20d9a0';
  },
};

function escapeHtml(s) {
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
