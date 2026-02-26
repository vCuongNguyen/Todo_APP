/**
 * App: Tab, Modal, Task CRUD, Fixed schedule, Day timeline + Queue, Export/Import
 */

const App = {
  presetTaskDate: null,
  presetTaskHour: null,
  editTaskId: null,

  init() {
    Auth.onStateChange = function(user) {
      App.updateAuthUI();
      Calendar.render();
      Dashboard.render();
      Stats.render();
      KPI.render();
      App.renderDayTimeline();
    };
    Auth.init().then(function() {
      if (Data.getFixedSchedule().length === 0) {
        Data.setFixedSchedule([
          { label: 'Ngủ', start: '00:00', end: '06:00', type: 'daily' },
          { label: 'Ăn sáng', start: '07:00', end: '07:30', type: 'daily' },
          { label: 'Ăn trưa', start: '12:00', end: '13:00', type: 'daily' },
          { label: 'Ăn tối', start: '18:00', end: '18:45', type: 'daily' },
          { label: 'Ngủ đêm', start: '22:30', end: '23:59', type: 'daily' },
        ]);
      }
      App.bindTabs();
      App.bindModals();
      App.bindTaskForm();
      App.bindScheduleModal();
      App.bindSettings();
      App.bindAuth();
      App.bindTaskDetailModal();
      App.bindProjects();
      App.bindEditProjectModal();
      Calendar.init();
      Dashboard.init();
      Stats.init();
      KPI.init();
      App.updateAuthUI();
      App.updateHeaderPoints();
      Calendar.render();
      Dashboard.render();
      Stats.render();
      KPI.render();
      App.renderDayTimeline();
      setInterval(function() {
        App.checkLateTasks();
        App.renderDayTimeline();
        if (document.getElementById('panel-calendar').classList.contains('active')) Calendar.render();
        if (document.getElementById('panel-today').classList.contains('active')) App.renderTodayPanel();
      }, 60000);
      document.getElementById('btn-add-task').addEventListener('click', function() { App.openTaskModal({}); });
      document.getElementById('btn-settings').addEventListener('click', function() { App.openModal('modal-settings'); });
      document.getElementById('btn-kpi').addEventListener('click', function() {
        KPI.loadIntoSettings();
        App.openModal('modal-kpi');
      });
    });
  },

  bindAuth() {
    var btnLogin = document.getElementById('btn-login');
    var btnLogout = document.getElementById('btn-logout');
    if (btnLogin) btnLogin.addEventListener('click', function() {
      Auth.signInWithGoogle().catch(function(e) { alert('Đăng nhập lỗi: ' + (e.message || e)); });
    });
    if (btnLogout) btnLogout.addEventListener('click', function() { Auth.signOut(); });
  },

  updateAuthUI() {
    var authUser = document.getElementById('auth-user');
    var btnLogin = document.getElementById('btn-login');
    var btnLogout = document.getElementById('btn-logout');
    if (!Auth.isEnabled()) {
      if (authUser) authUser.textContent = '';
      if (btnLogin) btnLogin.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'none';
      return;
    }
    var user = Auth.getUser();
    if (user) {
      if (authUser) authUser.textContent = user.email || 'Đã đăng nhập';
      if (btnLogin) btnLogin.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'inline-block';
    } else {
      if (authUser) authUser.textContent = '';
      if (btnLogin) btnLogin.style.display = 'inline-block';
      if (btnLogout) btnLogout.style.display = 'none';
    }
  },

  bindTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const id = 'panel-' + tab.dataset.tab;
        document.getElementById(id).classList.add('active');
        if (tab.dataset.tab === 'dashboard') {
          Dashboard.render();
          Stats.render();
          KPI.render();
          App.updateHeaderPoints();
        } else if (tab.dataset.tab === 'tasks') {
          Dashboard.render();
          App.updateHeaderPoints();
        } else if (tab.dataset.tab === 'projects') {
          App.renderProjectsPanel();
        } else if (tab.dataset.tab === 'today') {
          App.renderTodayPanel();
        } else {
          Calendar.render();
          App.renderDayTimeline();
        }
      });
    });
  },

  openModal(id) {
    document.getElementById(id).classList.add('active');
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
  },

  updateHeaderPoints() {
    const el = document.getElementById('header-points-value');
    if (el) el.textContent = (Data.getRewardsState().points || 0);
  },

  fillProjectOptions() {
    const projects = Data.getProjects();
    const opts = ['<option value="">— Không có project —</option>'];
    projects.forEach(p => {
      opts.push('<option value="' + (p.id || '') + '">' + escapeHtml(p.name || '') + '</option>');
    });
    const html = opts.join('');
    const selTask = document.getElementById('task-project');
    const selDetail = document.getElementById('detail-task-project');
    const selFilter = document.getElementById('filter-project');
    if (selTask) selTask.innerHTML = html;
    if (selDetail) selDetail.innerHTML = html;
    if (selFilter) {
      selFilter.innerHTML = '<option value="">Project</option>' + projects.map(p => '<option value="' + (p.id || '') + '">' + escapeHtml(p.name || '') + '</option>').join('');
    }
  },

  renderProjectsPanel() {
    const container = document.getElementById('projects-list');
    if (!container) return;
    const projects = Data.getProjects();
    const tasks = Data.getTasks();
    const roots = Data.getRootTasks();
    const getStats = (projectId) => {
      const list = projectId ? roots.filter(t => t.projectId === projectId) : roots.filter(t => !t.projectId);
      const total = list.length;
      const done = list.filter(t => t.status === 'done').length;
      const late = list.filter(t => t.status === 'late').length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      return { total, done, late, pct };
    };
    let html = '';
    projects.forEach(p => {
      const s = getStats(p.id);
      const projectTasks = roots.filter(t => t.projectId === p.id);
      let taskListHtml = '';
      projectTasks.slice(0, 15).forEach(t => {
        const statusIcon = t.status === 'done' ? '✓' : (t.status === 'late' ? '⚠' : '○');
        taskListHtml += '<div class="project-card-task-item" data-task-id="' + t.id + '">' +
          '<span class="project-card-task-name">' + escapeHtml(t.name || '') + '</span> ' +
          '<span class="project-card-task-status">' + statusIcon + '</span> ' +
          '<button type="button" class="btn btn-small btn-open-task" data-task-id="' + t.id + '" title="Mở task">✎</button>' +
          '</div>';
      });
      if (projectTasks.length > 15) taskListHtml += '<div class="project-card-task-more">+' + (projectTasks.length - 15) + ' task khác</div>';
      html += '<div class="project-card" data-project-id="' + (p.id || '') + '">' +
        '<div class="project-card-head" style="border-left-color:' + (p.color || '#7c6fff') + '">' +
        '<span class="project-card-name">' + escapeHtml(p.name || '') + '</span>' +
        '<span class="project-card-color" style="background:' + (p.color || '#7c6fff') + '" title="' + (p.color || '') + '"></span>' +
        '<button type="button" class="btn btn-small btn-edit-project" data-project-id="' + (p.id || '') + '" title="Sửa project">Sửa</button>' +
        '</div>' +
        '<div class="project-card-stats">' +
        '<span>📋 ' + s.total + ' task</span> <span>✓ ' + s.done + '</span> <span class="' + (s.late ? 'text-danger' : '') + '">Trễ ' + s.late + '</span>' +
        '</div>' +
        '<div class="project-card-progress"><div class="project-card-progress-fill" style="width:' + s.pct + '%;background:' + (p.color || '#7c6fff') + '"></div></div>' +
        '<div class="project-card-pct">' + s.pct + '% hoàn thành</div>' +
        '<div class="project-card-task-list">' + (taskListHtml || '<div class="project-card-task-empty">Chưa có task</div>') + '</div>' +
        '</div>';
    });
    const noProject = getStats(null);
    const noProjectTasks = roots.filter(t => !t.projectId);
    let noProjectListHtml = '';
    noProjectTasks.slice(0, 15).forEach(t => {
      const statusIcon = t.status === 'done' ? '✓' : (t.status === 'late' ? '⚠' : '○');
      noProjectListHtml += '<div class="project-card-task-item">' +
        '<span class="project-card-task-name">' + escapeHtml(t.name || '') + '</span> ' +
        '<span class="project-card-task-status">' + statusIcon + '</span> ' +
        '<button type="button" class="btn btn-small btn-open-task" data-task-id="' + t.id + '" title="Mở task">✎</button>' +
        '</div>';
    });
    if (noProjectTasks.length > 15) noProjectListHtml += '<div class="project-card-task-more">+' + (noProjectTasks.length - 15) + ' task khác</div>';
    html += '<div class="project-card project-card-none" data-project-id="">' +
      '<div class="project-card-head" style="border-left-color:var(--text-dim)">' +
      '<span class="project-card-name">Không có project</span>' +
      '</div>' +
      '<div class="project-card-stats">' +
      '<span>📋 ' + noProject.total + ' task</span> <span>✓ ' + noProject.done + '</span>' +
      '</div>' +
      '<div class="project-card-progress"><div class="project-card-progress-fill" style="width:' + noProject.pct + '%"></div></div>' +
      '<div class="project-card-pct">' + noProject.pct + '%</div>' +
      '<div class="project-card-task-list">' + (noProjectListHtml || '<div class="project-card-task-empty">Chưa có task</div>') + '</div>' +
      '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.btn-edit-project').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        App.openEditProjectModal(this.dataset.projectId);
      });
    });
    container.querySelectorAll('.btn-open-task').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        App.openTaskModal({ editId: this.dataset.taskId });
      });
    });
    var colorInput = document.getElementById('project-color-input');
    if (colorInput) colorInput.value = Data.getNextProjectColor();
  },

  bindProjects() {
    App.fillProjectOptions();
    var colorEl = document.getElementById('project-color-input');
    if (colorEl) colorEl.value = Data.getNextProjectColor();
    var btnAdd = document.getElementById('btn-add-project');
    if (btnAdd) btnAdd.addEventListener('click', function() {
      var nameEl = document.getElementById('project-name-input');
      var colorEl = document.getElementById('project-color-input');
      var name = (nameEl && nameEl.value.trim()) || '';
      if (!name) {
        alert('Nhập tên project.');
        return;
      }
      var nextAuto = Data.getNextProjectColor();
      var color = (colorEl && colorEl.value);
      if (!color || color === nextAuto) color = undefined;
      Data.addProject({ name, color });
      if (nameEl) nameEl.value = '';
      if (colorEl) colorEl.value = Data.getNextProjectColor();
      App.fillProjectOptions();
      App.renderProjectsPanel();
      Dashboard.render();
    });
  },

  openEditProjectModal(projectId) {
    const p = Data.getProject(projectId);
    if (!p) return;
    App._editProjectId = projectId;
    document.getElementById('edit-project-id').value = projectId;
    document.getElementById('edit-project-name').value = p.name || '';
    document.getElementById('edit-project-color').value = p.color || '#7c6fff';
    const roots = Data.getRootTasks();
    const tasks = roots.filter(t => t.projectId === projectId);
    const listEl = document.getElementById('edit-project-tasks');
    listEl.innerHTML = '';
    if (!tasks.length) {
      listEl.innerHTML = '<p class="edit-project-no-tasks">Chưa có task nào trong project này.</p>';
    } else {
      tasks.forEach(t => {
        const row = document.createElement('div');
        row.className = 'edit-project-task-row';
        const statusIcon = t.status === 'done' ? '✓' : (t.status === 'late' ? '⚠' : '○');
        row.innerHTML = '<span class="edit-project-task-name">' + escapeHtml(t.name || '') + '</span> ' +
          '<span class="edit-project-task-status">' + statusIcon + '</span> ' +
          '<button type="button" class="btn btn-small btn-open-task-edit" data-task-id="' + t.id + '">Mở</button> ' +
          '<button type="button" class="btn btn-small btn-remove-from-project" data-task-id="' + t.id + '" title="Gỡ task khỏi project">Gỡ khỏi project</button>';
        row.querySelector('.btn-open-task-edit').addEventListener('click', () => {
          App.closeModal('modal-edit-project');
          App.openTaskModal({ editId: t.id });
        });
        row.querySelector('.btn-remove-from-project').addEventListener('click', () => {
          Data.updateTask(t.id, { projectId: null });
          App.openEditProjectModal(projectId);
          App.renderProjectsPanel();
          Dashboard.render();
        });
        listEl.appendChild(row);
      });
    }
    App.openModal('modal-edit-project');
  },

  bindEditProjectModal() {
    var saveBtn = document.getElementById('edit-project-save');
    if (saveBtn) saveBtn.addEventListener('click', function() {
      var id = document.getElementById('edit-project-id').value;
      var name = (document.getElementById('edit-project-name') && document.getElementById('edit-project-name').value.trim()) || '';
      var color = (document.getElementById('edit-project-color') && document.getElementById('edit-project-color').value) || '';
      if (!id || !name) return;
      Data.updateProject(id, { name, color });
      App.closeModal('modal-edit-project');
      App.fillProjectOptions();
      App.renderProjectsPanel();
      Dashboard.render();
    });
    var deleteBtn = document.getElementById('edit-project-delete');
    if (deleteBtn) deleteBtn.addEventListener('click', function() {
      var id = document.getElementById('edit-project-id').value;
      if (!id) return;
      var p = Data.getProject(id);
      var name = (p && p.name) ? p.name : 'project này';
      if (!confirm('Xóa project "' + name + '"? Các task sẽ được gỡ khỏi project (không xóa task).')) return;
      Data.deleteProject(id);
      App.closeModal('modal-edit-project');
      App.fillProjectOptions();
      App.renderProjectsPanel();
      Dashboard.render();
    });
  },

  bindModals() {
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) {
          const id = modal.id;
          modal.classList.remove('active');
          if (id === 'modal-task' && App._returnToDetailTaskId) {
            App.openTaskDetailModal(App._returnToDetailTaskId);
            App._returnToDetailTaskId = null;
          }
        }
      });
    });
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          if (modal.id === 'modal-task' && App._returnToDetailTaskId) {
            App.openTaskDetailModal(App._returnToDetailTaskId);
            App._returnToDetailTaskId = null;
          }
        }
      });
    });
  },

  openTaskModal(opts) {
    if (opts.editId) {
      App.openTaskDetailModal(opts.editId);
      return;
    }
    App.editTaskId = null;
    App.presetTaskDate = opts.presetDate || null;
    App.presetTaskHour = opts.presetHour != null ? opts.presetHour : null;
    App.presetTaskMinute = opts.presetMinute != null ? opts.presetMinute : null;
    const form = document.getElementById('form-task');
    form.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-parent-id').value = opts.parentId || '';
    document.getElementById('modal-task-title').textContent = App.editTaskId ? 'Sửa task' : 'Thêm task';
    document.getElementById('task-subtasks-area').style.display = 'none';
    document.getElementById('task-is-parent').checked = false;

    if (App.presetTaskDate) {
      const hour = App.presetTaskHour != null ? App.presetTaskHour : 9;
      const minute = App.presetTaskMinute != null ? App.presetTaskMinute : 0;
      document.getElementById('task-deadline').value = `${App.presetTaskDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    } else if (!App.editTaskId) {
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      document.getElementById('task-deadline').value = d.toISOString().slice(0, 16);
    }

    if (App.editTaskId) {
      const task = Data.getTask(App.editTaskId);
      if (task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-estimated').value = task.estimatedMinutes;
        document.getElementById('task-deadline').value = task.deadline ? task.deadline.slice(0, 16) : '';
        document.getElementById('task-single-day').value = task.singleDay ? 'true' : 'false';
        document.getElementById('task-important').value = task.important ? 'true' : 'false';
        document.getElementById('task-urgent').value = task.urgent ? 'true' : 'false';
        document.getElementById('task-project').value = task.projectId || '';
        document.getElementById('task-notes').value = Array.isArray(task.notes) ? task.notes.join('\n') : (task.notes || '');
        document.getElementById('task-is-parent').checked = !!(task.childIds && task.childIds.length);
        if (task.childIds && task.childIds.length) {
          document.getElementById('task-subtasks-area').style.display = 'block';
          App.renderSubtasksList(task.childIds);
        }
      }
    }
    App.fillProjectOptions();
    App.openModal('modal-task');
  },

  openTaskDetailModal(taskId) {
    const task = Data.getTask(taskId);
    if (!task) return;
    App._detailTaskId = taskId;
    document.getElementById('detail-task-title').textContent = task.name;
    document.getElementById('detail-task-dot').style.background = Dashboard.getPriorityColor(task.important, task.urgent);
    document.getElementById('detail-task-name').value = task.name;
    document.getElementById('detail-task-estimated').value = task.estimatedMinutes || 30;
    document.getElementById('detail-task-deadline').value = task.deadline ? task.deadline.slice(0, 16) : '';
    document.getElementById('detail-task-single-day').value = task.singleDay ? 'true' : 'false';
    document.getElementById('detail-task-important').value = task.important ? 'true' : 'false';
    document.getElementById('detail-task-urgent').value = task.urgent ? 'true' : 'false';
    document.getElementById('detail-task-project').value = task.projectId || '';
    document.getElementById('detail-btn-done').textContent = task.status === 'done' ? '↩ Hoàn tác' : '✓ Done';
    App._renderDetailSubtasks();
    App._renderDetailNotes();
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.detail-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('.detail-tab[data-detail-tab="info"]').classList.add('active');
    document.getElementById('detail-panel-info').classList.add('active');
    App.openModal('modal-task-detail');
  },

  _renderDetailSubtasks() {
    const list = document.getElementById('detail-subtasks-list');
    if (!list) return;
    list.innerHTML = '';
    const task = Data.getTask(App._detailTaskId);
    if (!task || !task.childIds || !task.childIds.length) return;
    const all = Data.getTasks();
    task.childIds.forEach(id => {
      const t = all.find(x => x.id === id);
      if (!t) return;
      const row = document.createElement('div');
      row.className = 'detail-subtask-row' + (t.status === 'done' ? ' done' : '');
      row.innerHTML = '<span class="detail-subtask-name">' + escapeHtml(t.name) + '</span><div><button type="button" class="btn btn-small btn-done-subtask" data-id="' + t.id + '">' + (t.status === 'done' ? '↩' : '✓') + '</button> <button type="button" class="btn btn-small btn-remove-subtask-detail" data-id="' + t.id + '">Xóa</button></div>';
      row.querySelector('.btn-done-subtask').addEventListener('click', () => {
        Data.updateTask(t.id, { status: t.status === 'done' ? 'pending' : 'done', completedAt: t.status === 'done' ? null : new Date().toISOString() });
        App._renderDetailSubtasks();
      });
      row.querySelector('.btn-remove-subtask-detail').addEventListener('click', () => {
        Data.updateTask(t.id, { parentId: null });
        Data.updateTask(task.id, { childIds: task.childIds.filter(x => x !== t.id) });
        App._renderDetailSubtasks();
      });
      list.appendChild(row);
    });
  },

  _renderDetailNotes() {
    const list = document.getElementById('detail-notes-list');
    if (!list) return;
    list.innerHTML = '';
    const task = Data.getTask(App._detailTaskId);
    if (!task) return;
    const notes = Array.isArray(task.notes) ? task.notes : (task.notes ? [task.notes] : []);
    notes.slice().reverse().forEach((note, idx) => {
      const text = typeof note === 'string' ? note : (note && note.text);
      if (text === undefined) return;
      const realIndex = notes.length - 1 - idx;
      const item = document.createElement('div');
      item.className = 'detail-note-item';
      item.innerHTML = '<div class="detail-note-text">' + escapeHtml(text) + '</div><div class="detail-note-meta"><span></span><button type="button" class="btn btn-small btn-remove-note" data-index="' + realIndex + '">✕</button></div>';
      item.querySelector('.btn-remove-note').addEventListener('click', () => {
        const arr = Array.isArray(task.notes) ? task.notes.slice() : [];
        arr.splice(realIndex, 1);
        Data.updateTask(App._detailTaskId, { notes: arr });
        App._renderDetailNotes();
      });
      list.appendChild(item);
    });
  },

  bindTaskDetailModal() {
    document.querySelectorAll('.detail-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.detailTab;
        document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.detail-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('detail-panel-' + name).classList.add('active');
      });
    });
    var saveBtn = document.getElementById('detail-btn-save-info');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const id = App._detailTaskId;
      if (!id) return;
      const task = Data.getTask(id);
      const notes = Array.isArray(task.notes) ? task.notes : [];
      Data.updateTask(id, {
        name: document.getElementById('detail-task-name').value.trim(),
        estimatedMinutes: parseInt(document.getElementById('detail-task-estimated').value, 10) || 30,
        deadline: document.getElementById('detail-task-deadline').value,
        singleDay: document.getElementById('detail-task-single-day').value === 'true',
        important: document.getElementById('detail-task-important').value === 'true',
        urgent: document.getElementById('detail-task-urgent').value === 'true',
        projectId: document.getElementById('detail-task-project').value || null,
        notes,
      });
      document.getElementById('detail-task-title').textContent = Data.getTask(id).name;
      Calendar.render();
      Dashboard.render();
      App.renderDayTimeline();
      App.renderTodayPanel();
    });
    var addSubBtn = document.getElementById('detail-btn-add-subtask');
    if (addSubBtn) addSubBtn.addEventListener('click', () => {
      App._returnToDetailTaskId = App._detailTaskId;
      App.closeModal('modal-task-detail');
      App.openTaskModal({ parentId: App._detailTaskId });
    });
    var addNoteBtn = document.getElementById('detail-btn-add-note');
    if (addNoteBtn) addNoteBtn.addEventListener('click', () => {
      const input = document.getElementById('detail-note-input');
      const text = input.value.trim();
      if (!text) return;
      const task = Data.getTask(App._detailTaskId);
      if (!task) return;
      const notes = Array.isArray(task.notes) ? task.notes.slice() : [];
      notes.push(text);
      Data.updateTask(App._detailTaskId, { notes });
      input.value = '';
      App._renderDetailNotes();
    });
    var doneBtn = document.getElementById('detail-btn-done');
    if (doneBtn) doneBtn.addEventListener('click', () => {
      const id = App._detailTaskId;
      const task = Data.getTask(id);
      if (!task) return;
      if (task.status === 'done') {
        Data.updateTask(id, { status: 'pending', completedAt: null });
      } else {
        App.markTaskDone(id);
      }
      App.closeModal('modal-task-detail');
      App.updateHeaderPoints();
    });
    var delBtn = document.getElementById('detail-btn-delete');
    if (delBtn) delBtn.addEventListener('click', () => {
      if (!window.confirm('Xóa task này và mọi task con?')) return;
      App.deleteTask(App._detailTaskId);
      App.closeModal('modal-task-detail');
    });
  },

  renderSubtasksList(childIds) {
    const list = document.getElementById('task-subtasks-list');
    list.innerHTML = '';
    const all = Data.getTasks();
    childIds.forEach(id => {
      const t = all.find(x => x.id === id);
      if (!t) return;
      const row = document.createElement('div');
      row.className = 'subtask-row';
      row.innerHTML = `
        <span>${escapeHtml(t.name)}</span>
        <button type="button" class="btn btn-small btn-remove-subtask" data-id="${t.id}">Xóa</button>
      `;
      row.querySelector('.btn-remove-subtask').addEventListener('click', () => {
        Data.updateTask(t.id, { parentId: null });
        const parent = all.find(x => x.childIds && x.childIds.includes(t.id));
        if (parent) {
          Data.updateTask(parent.id, { childIds: parent.childIds.filter(x => x !== t.id) });
        }
        if (App.editTaskId) App.renderSubtasksList(Data.getTask(App.editTaskId).childIds || []);
      });
      list.appendChild(row);
    });
  },

  bindTaskForm() {
    document.getElementById('task-is-parent').addEventListener('change', (e) => {
      document.getElementById('task-subtasks-area').style.display = e.target.checked ? 'block' : 'none';
      if (e.target.checked && App.editTaskId) {
        const task = Data.getTask(App.editTaskId);
        App.renderSubtasksList(task.childIds || []);
      } else {
        document.getElementById('task-subtasks-list').innerHTML = '';
      }
    });
    document.getElementById('btn-add-subtask').addEventListener('click', () => {
      const parentId = document.getElementById('task-id').value || document.getElementById('task-parent-id').value;
      if (!parentId) {
        alert('Lưu task trước rồi thêm task con.');
        return;
      }
      App.closeModal('modal-task');
      App.openTaskModal({ parentId });
    });

    document.getElementById('form-task').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('task-id').value;
      const parentId = document.getElementById('task-parent-id').value || null;
      const notesRaw = document.getElementById('task-notes').value.trim();
      const notes = notesRaw ? notesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
      const payload = {
        id: id || undefined,
        name: document.getElementById('task-name').value.trim(),
        estimatedMinutes: parseInt(document.getElementById('task-estimated').value, 10) || 30,
        deadline: document.getElementById('task-deadline').value,
        singleDay: document.getElementById('task-single-day').value === 'true',
        important: document.getElementById('task-important').value === 'true',
        urgent: document.getElementById('task-urgent').value === 'true',
        notes,
        parentId: parentId || null,
        projectId: (document.getElementById('task-project') && document.getElementById('task-project').value) || null,
        childIds: [],
      };
      if (App.editTaskId) {
        const existing = Data.getTask(App.editTaskId);
        if (existing) payload.childIds = existing.childIds || [];
      }
      let task;
      if (id) {
        Data.updateTask(id, payload);
        task = Data.getTask(id);
      } else {
        task = Data.addTask(payload);
        if (parentId) {
          const parent = Data.getTask(parentId);
          if (parent) {
            const childIds = [...(parent.childIds || []), task.id];
            Data.updateTask(parentId, { childIds });
          }
        }
      }
      App.closeModal('modal-task');
      if (App._returnToDetailTaskId) {
        App.openTaskDetailModal(App._returnToDetailTaskId);
        App._returnToDetailTaskId = null;
      }
      Calendar.render();
      Dashboard.render();
      App.renderDayTimeline();
    });
  },

  bindScheduleModal() {
    const WEEKDAYS = [{ v: 0, l: 'Chủ nhật' }, { v: 1, l: 'Thứ 2' }, { v: 2, l: 'Thứ 3' }, { v: 3, l: 'Thứ 4' }, { v: 4, l: 'Thứ 5' }, { v: 5, l: 'Thứ 6' }, { v: 6, l: 'Thứ 7' }];
    function renderRecurrenceExtra(wrap, type, item) {
      const extra = wrap.querySelector('.schedule-recurrence-extra');
      if (!extra) return;
      type = type || 'daily';
      if (type === 'once') {
        extra.innerHTML = '<label class="schedule-extra-label">Ngày</label><input type="date" class="schedule-once-date" value="' + (item.onceDate || '') + '" />';
      } else if (type === 'weekly') {
        const val = item.dayOfWeek != null ? item.dayOfWeek : 1;
        extra.innerHTML = '<label class="schedule-extra-label">Thứ</label><select class="schedule-day-of-week">' + WEEKDAYS.map(w => '<option value="' + w.v + '"' + (w.v === Number(val) ? ' selected' : '') + '>' + w.l + '</option>').join('') + '</select>';
      } else if (type === 'every_n_days') {
        extra.innerHTML = '<label class="schedule-extra-label">Lặp mỗi (ngày)</label><input type="number" class="schedule-every-n" min="1" value="' + (item.everyN || 30) + '" />' +
          '<label class="schedule-extra-label">Bắt đầu từ</label><input type="date" class="schedule-every-n-start" value="' + (item.everyNStartDate || '') + '" />';
      } else if (type === 'monthly') {
        extra.innerHTML = '<label class="schedule-extra-label">Ngày trong tháng (1-31)</label><input type="number" class="schedule-day-of-month" min="1" max="31" value="' + (item.dayOfMonth != null ? item.dayOfMonth : 1) + '" />';
      } else {
        extra.innerHTML = '';
      }
    }
    function buildScheduleRow(item, i, onRemove) {
      const type = item.type || 'daily';
      const div = document.createElement('div');
      div.className = 'fixed-schedule-item';
      div.innerHTML = '<div class="fixed-schedule-row1">' +
        '<input type="text" class="schedule-label" value="' + escapeHtml(item.label || '') + '" placeholder="VD: Ăn sáng" />' +
        '<input type="time" class="schedule-start" value="' + (item.start || '07:00') + '" />' +
        '<input type="time" class="schedule-end" value="' + (item.end || '08:00') + '" />' +
        '<select class="schedule-type"><option value="daily"' + (type === 'daily' ? ' selected' : '') + '>Mỗi ngày</option><option value="once"' + (type === 'once' ? ' selected' : '') + '>Một ngày cụ thể</option><option value="weekly"' + (type === 'weekly' ? ' selected' : '') + '>Thứ trong tuần</option><option value="every_n_days"' + (type === 'every_n_days' ? ' selected' : '') + '>Sau mỗi N ngày</option><option value="monthly"' + (type === 'monthly' ? ' selected' : '') + '>Ngày trong tháng</option></select>' +
        '<button type="button" class="btn btn-small btn-remove-schedule">Xóa</button>' +
        '</div><div class="schedule-recurrence-extra"></div>';
      renderRecurrenceExtra(div, type, item);
      div.querySelector('.schedule-type').addEventListener('change', function() {
        renderRecurrenceExtra(div, this.value, {});
      });
      div.querySelector('.btn-remove-schedule').addEventListener('click', onRemove);
      return div;
    }
    const openSchedule = () => {
      const list = document.getElementById('fixed-schedule-list');
      list.innerHTML = '';
      const items = Data.getFixedSchedule();
      items.forEach((item, i) => {
        const div = buildScheduleRow(item, i, () => {
          items.splice(i, 1);
          Data.setFixedSchedule(items);
          openSchedule();
        });
        list.appendChild(div);
      });
      App.openModal('modal-schedule');
    };
    document.getElementById('btn-save-schedule').addEventListener('click', () => {
      const items = [];
      document.querySelectorAll('.fixed-schedule-item').forEach(row => {
        const label = (row.querySelector('.schedule-label') || {}).value.trim();
        const start = (row.querySelector('.schedule-start') || {}).value;
        const end = (row.querySelector('.schedule-end') || {}).value;
        if (!start || !end) return;
        const type = (row.querySelector('.schedule-type') || {}).value || 'daily';
        const obj = { label: label || 'Khung giờ', start, end, type };
        if (type === 'once') obj.onceDate = (row.querySelector('.schedule-once-date') || {}).value || '';
        if (type === 'weekly') obj.dayOfWeek = parseInt((row.querySelector('.schedule-day-of-week') || {}).value, 10);
        if (type === 'every_n_days') {
          obj.everyN = parseInt((row.querySelector('.schedule-every-n') || {}).value, 10) || 30;
          obj.everyNStartDate = (row.querySelector('.schedule-every-n-start') || {}).value || '';
        }
        if (type === 'monthly') obj.dayOfMonth = parseInt((row.querySelector('.schedule-day-of-month') || {}).value, 10) || 1;
        items.push(obj);
      });
      Data.setFixedSchedule(items);
      App.closeModal('modal-schedule');
      Calendar.render();
      App.renderDayTimeline();
    });
    document.getElementById('btn-add-schedule').addEventListener('click', () => {
      const list = document.getElementById('fixed-schedule-list');
      const items = Data.getFixedSchedule();
      const div = buildScheduleRow({ label: '', start: '07:00', end: '08:00', type: 'daily' }, items.length, () => div.remove());
      list.appendChild(div);
    });
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
      const scheduleLink = document.createElement('button');
      scheduleLink.type = 'button';
      scheduleLink.className = 'btn btn-secondary';
      scheduleLink.textContent = 'Lịch cố định';
      scheduleLink.addEventListener('click', () => {
        App.closeModal('modal-settings');
        openSchedule();
      });
      settingsBtn.after(scheduleLink);
    }
    document.getElementById('btn-fixed-schedule').addEventListener('click', openSchedule);
  },

  checkLateTasks() {
    const now = new Date().getTime();
    Data.getTasks().forEach(t => {
      if (t.status !== 'pending' || !t.deadline) return;
      if (new Date(t.deadline).getTime() < now) {
        Data.updateTask(t.id, { status: 'late' });
        Data.pushHistory({ type: 'late', taskId: t.id, at: new Date().toISOString() });
      }
    });
  },

  renderDayTimeline() {
    const dateStr = Calendar.dateToStr(Calendar.getCalendarDate());
    const vn = Calendar.getVietnamNow();
    const nowMinutes = (dateStr === vn.dateStr) ? vn.minutesFromMidnight : 0;
    App._fillTimelineAndQueue(document.getElementById('day-timeline'), document.getElementById('queue-list'), dateStr, nowMinutes);
  },

  renderTodayPanel() {
    const vn = Calendar.getVietnamNow();
    const timeEl = document.getElementById('today-current-time');
    if (timeEl) timeEl.textContent = String(vn.hours).padStart(2, '0') + ':' + String(vn.minutes).padStart(2, '0') + ' (giờ VN)';
    App._fillTimelineAndQueue(document.getElementById('today-timeline'), document.getElementById('today-queue'), vn.dateStr, vn.minutesFromMidnight);
  },

  _fillTimelineAndQueue(timelineEl, queueEl, dateStr, nowMinutes) {
    if (!timelineEl || !queueEl) return;
    const fixedSchedule = Data.getFixedSchedule();
    const tasks = Data.getTasks();
    const vn = Calendar.getVietnamNow();
    const todayStr = vn.dateStr;
    const isToday = dateStr === todayStr;
    const { scheduled, queue } = isToday
      ? Scheduler.getCurrentScheduleForDay(dateStr, tasks, fixedSchedule, nowMinutes)
      : Scheduler.scheduleForDay(dateStr, tasks, fixedSchedule);

    timelineEl.innerHTML = '';
    const fixedBlocks = Scheduler.getFixedBlocksForDay(dateStr, fixedSchedule).map(f => ({
      startMin: f.startMin,
      endMin: f.endMin,
      label: f.label,
      fixed: true,
    }));
    const taskBlocks = scheduled.map(s => ({
      startMin: s.startMin,
      endMin: s.endMin,
      label: s.task.name,
      task: s.task,
      fixed: false,
    }));
    const all = [...fixedBlocks, ...taskBlocks].sort((a, b) => a.startMin - b.startMin);
    all.forEach(block => {
      const row = document.createElement('div');
      const past = isToday && block.endMin <= nowMinutes;
      const active = isToday && block.startMin <= nowMinutes && nowMinutes < block.endMin;
      row.className = 'timeline-row' + (past ? ' timeline-row-past' : '') + (active ? ' timeline-row-active' : '');
      const startStr = Scheduler.minutesToTime(block.startMin);
      const endStr = Scheduler.minutesToTime(block.endMin);
      const alertClass = block.fixed ? '' : Dashboard.getAlertClass(block.task.important, block.task.urgent);
      const dotColor = block.fixed ? 'var(--text-dim)' : Dashboard.getPriorityColor(block.task.important, block.task.urgent);
      const labelDisplay = block.fixed ? '🔒 ' + escapeHtml(block.label || 'Lịch cố định') : escapeHtml(block.label);
      const projectTag = !block.fixed && block.task && block.task.projectId ? (() => {
        const p = Data.getProject(block.task.projectId);
        return p ? '<span class="timeline-project-tag" style="background:' + (p.color || '#7c6fff') + '">' + escapeHtml(p.name || '') + '</span>' : '';
      })() : '';
      const badge = active ? '<span class="timeline-badge-now">Đang</span>' : '';
      const isTodayPanel = timelineEl.id === 'today-timeline';
      const taskActions = isTodayPanel && !block.fixed && block.task ? '<div class="timeline-row-actions"><button type="button" class="btn btn-small btn-done" data-id="' + block.task.id + '">Done</button></div>' : '';
      row.innerHTML = `
        <span class="timeline-dot" style="background:${dotColor}"></span>
        <span class="timeline-time">${startStr} - ${endStr}</span>
        <div class="timeline-bar ${block.fixed ? 'fixed' : ''} ${alertClass}" style="min-width:80px">${labelDisplay}${projectTag}</div>
        ${badge}
        ${taskActions}
      `;
      if (isTodayPanel && !block.fixed && block.task) {
        row.classList.add('timeline-row-clickable');
        row.querySelector('.timeline-bar').addEventListener('click', function(e) {
          e.stopPropagation();
          App.openTaskModal({ editId: block.task.id });
        });
        var doneBtn = row.querySelector('.btn-done');
        if (doneBtn) doneBtn.addEventListener('click', function(e) { e.stopPropagation(); App.markTaskDone(block.task.id); });
      }
      timelineEl.appendChild(row);
    });

    queueEl.innerHTML = '';
    queue.forEach(task => {
      const div = document.createElement('div');
      div.className = 'queue-item';
      const dotColor = Dashboard.getPriorityColor(task.important, task.urgent);
      const project = task.projectId ? Data.getProject(task.projectId) : null;
      const queueProjectTag = project ? '<span class="queue-project-tag" style="background:' + (project.color || '#7c6fff') + '">' + escapeHtml(project.name || '') + '</span>' : '';
      div.innerHTML = `
        <span class="queue-item-dot" style="background:${dotColor}"></span>
        <span>${escapeHtml(task.name)} (${Data.getTaskTotalMinutes(task, tasks)} phút)</span> ${queueProjectTag}
        <div class="actions">
          <button type="button" class="btn btn-small btn-done" data-id="${task.id}">Done</button>
          <button type="button" class="btn btn-small btn-edit" data-id="${task.id}">Sửa</button>
          <button type="button" class="btn btn-small btn-cancel" data-id="${task.id}">Hủy</button>
        </div>
      `;
      div.querySelector('.btn-done').addEventListener('click', () => App.markTaskDone(task.id));
      div.querySelector('.btn-edit').addEventListener('click', () => App.openTaskModal({ editId: task.id }));
      div.querySelector('.btn-cancel').addEventListener('click', () => App.markTaskCancelled(task.id));
      var queueElParent = queueEl.parentElement;
      var isTodayQueue = queueElParent && queueElParent.id === 'today-queue';
      if (isTodayQueue) {
        div.classList.add('queue-item-clickable');
        div.style.cursor = 'pointer';
        div.addEventListener('click', function(e) {
          if (!e.target.closest('.actions')) App.openTaskModal({ editId: task.id });
        });
      }
      queueEl.appendChild(div);
    });
  },

  markTaskDone(taskId) {
    const task = Data.getTask(taskId);
    if (!task) return;
    Data.updateTask(taskId, {
      status: 'done',
      completedAt: new Date().toISOString(),
      completedMinutes: task.estimatedMinutes || Data.getTaskTotalMinutes(task, Data.getTasks()),
    });
    Data.pushHistory({ type: 'done', taskId, at: new Date().toISOString() });
    const points = Data.getPriorityPoints(Data.getPriority(task.important, task.urgent));
    Data.addRewardPoints(points, `Task done: ${task.name}`);
    App.updateHeaderPoints();
    Calendar.render();
    Dashboard.render();
    App.renderDayTimeline();
    App.renderTodayPanel();
    Stats.render();
    KPI.render();
  },

  markTaskCancelled(taskId) {
    const task = Data.getTask(taskId);
    if (!task) return;
    const at = new Date().toISOString();
    Data.setTaskCancelledAt(taskId, at);
    Data.pushHistory({ type: 'cancelled', taskId, at });
    Calendar.render();
    Dashboard.render();
    App.renderDayTimeline();
    Stats.render();
    KPI.render();
  },

  deleteTask(taskId) {
    const task = Data.getTask(taskId);
    if (!task) return;
    if (!window.confirm("Xóa task \"" + (task.name || "") + "\" và mọi task con?")) return;
    Data.deleteTaskWithChildren(taskId);
    Calendar.render();
    Dashboard.render();
    App.renderDayTimeline();
    App.renderTodayPanel();
    Stats.render();
    KPI.render();
  },

  bindSettings() {
    document.getElementById('btn-export').addEventListener('click', () => {
      const data = {
        tasks: Data.getTasks(),
        schedule: Data.getFixedSchedule(),
        kpi: Data.getKPI(),
        rewards: Data.getRewardsState(),
        history: Data.getHistory(),
        projects: Data.getProjects(),
        exportedAt: new Date().toISOString(),
      };
      const a = document.createElement('a');
      a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(data, null, 2));
      a.download = 'todo-export.json';
      a.click();
    });
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (data.tasks) Data.setTasks(data.tasks);
          if (data.schedule) Data.setFixedSchedule(data.schedule);
          if (data.kpi) Data.setKPI(data.kpi);
          if (data.rewards) Data.setRewardsState(data.rewards);
          if (data.history) localStorage.setItem('todo_history', JSON.stringify(data.history));
          if (data.projects && Array.isArray(data.projects)) Data.setProjects(data.projects);
          Calendar.render();
          Dashboard.render();
          App.renderDayTimeline();
          Stats.render();
          KPI.render();
          alert('Đã nhập dữ liệu.');
        } catch (err) {
          alert('Lỗi đọc file: ' + err.message);
        }
        e.target.value = '';
      };
      r.readAsText(file);
    });
  },
};

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => App.init());