/**
 * Data layer: tasks, fixed schedule, KPI, localStorage
 * Mục 2: Task (thời gian, ưu tiên, ghi chú, task cha/con đệ quy, deadline)
 * Mục 3: Lịch cố định trong ngày
 * Mục 5: Lưu localStorage
 */

const STORAGE_KEY = 'todo_app_data';
const STORAGE_SCHEDULE = 'todo_fixed_schedule';
const STORAGE_KPI = 'todo_kpi';
const STORAGE_REWARDS = 'todo_rewards';
const STORAGE_HISTORY = 'todo_history'; // for stats: done/late/cancelled
const STORAGE_PROJECTS = 'todo_projects';

/** Bảng màu tự động cho project (khi không chọn màu) - tăng số lượng dải màu */
const PROJECT_COLORS = [
  '#7c6fff', '#fb923c', '#38bdf8', '#20d9a0', '#ff4f70', '#a78bfa',
  '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6',
  '#eab308', '#d946ef', '#0ea5e9', '#22c55e', '#f43f5e', '#8b5cf6',
  '#f97316', '#2dd4bf', '#e879f9', '#4ade80', '#facc15', '#38bdf8',
  '#c084fc', '#34d399', '#fb7185', '#60a5fa', '#a3e635', '#f472b6',
];

function getNextProjectColor(index) {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const Priority = {
  IMPORTANT_URGENT: 'important_urgent',
  IMPORTANT_NOT_URGENT: 'important_not_urgent',
  NOT_IMPORTANT_URGENT: 'not_important_urgent',
  NOT_IMPORTANT_NOT_URGENT: 'not_important_not_urgent',
};

function getPriority(important, urgent) {
  if (important && urgent) return Priority.IMPORTANT_URGENT;
  if (important && !urgent) return Priority.IMPORTANT_NOT_URGENT;
  if (!important && urgent) return Priority.NOT_IMPORTANT_URGENT;
  return Priority.NOT_IMPORTANT_NOT_URGENT;
}

function getPriorityPoints(priority) {
  const map = {
    [Priority.IMPORTANT_URGENT]: 10,
    [Priority.IMPORTANT_NOT_URGENT]: 7,
    [Priority.NOT_IMPORTANT_URGENT]: 5,
    [Priority.NOT_IMPORTANT_NOT_URGENT]: 2,
  };
  return map[priority] || 2;
}

/**
 * Tính tổng thời gian task (nếu là task cha: sum(con) * 1.1)
 */
function getTaskTotalMinutes(task, allTasks) {
  if (!task.childIds || task.childIds.length === 0) {
    return task.estimatedMinutes || 0;
  }
  let sum = 0;
  for (const id of task.childIds) {
    const child = allTasks.find(t => t.id === id);
    if (child) sum += getTaskTotalMinutes(child, allTasks);
  }
  return Math.ceil(sum * 1.1);
}

/**
 * Phần trăm hoàn thành theo số task (chỉ leaf hoặc task có con)
 */
function getTaskCompletionByCount(task, allTasks) {
  if (!task.childIds || task.childIds.length === 0) {
    return task.status === 'done' ? 100 : 0;
  }
  const children = task.childIds.map(id => allTasks.find(t => t.id === id)).filter(Boolean);
  const done = children.filter(c => c.status === 'done').length;
  const total = children.length;
  let subTotal = 0;
  children.forEach(c => {
    subTotal += getTaskCompletionByCount(c, allTasks);
  });
  return total === 0 ? 0 : subTotal / total;
}

/**
 * Phần trăm hoàn thành theo thời gian (đã làm / tổng thời gian)
 */
function getTaskCompletionByTime(task, allTasks) {
  if (!task.childIds || task.childIds.length === 0) {
    if (task.status === 'done') return 100;
    return task.completedMinutes ? Math.min(100, (task.completedMinutes / (task.estimatedMinutes || 1)) * 100) : 0;
  }
  const children = task.childIds.map(id => allTasks.find(t => t.id === id)).filter(Boolean);
  let totalMin = 0;
  let doneMin = 0;
  children.forEach(c => {
    const cTotal = getTaskTotalMinutes(c, allTasks);
    totalMin += cTotal;
    if (c.status === 'done') doneMin += cTotal;
    else doneMin += (getTaskCompletionByTime(c, allTasks) / 100) * cTotal;
  });
  return totalMin === 0 ? 0 : Math.min(100, (doneMin / totalMin) * 100);
}

const Data = {
  _source: 'local',
  _cache: { tasks: [], schedule: [], kpi: null, rewards: null, history: [], projects: [] },
  _cloudPersist: null,

  getCloudCache() {
    if (this._source !== 'cloud') return null;
    return {
      tasks: (this._cache.tasks || []).slice(),
      schedule: (this._cache.schedule || []).slice(),
      kpi: this._cache.kpi ? { ...this._cache.kpi } : { type: 'done_ratio', target: 80, rewardCustom: '' },
      rewards: this._cache.rewards ? { ...this._cache.rewards, history: (this._cache.rewards.history || []).slice() } : { points: 0, history: [] },
      history: (this._cache.history || []).slice(),
      projects: (this._cache.projects || []).slice(),
    };
  },
  useCloudData(cache) {
    if (cache) {
      this._cache = {
        tasks: Array.isArray(cache.tasks) ? cache.tasks : [],
        schedule: Array.isArray(cache.schedule) ? cache.schedule : [],
        kpi: cache.kpi && typeof cache.kpi === 'object' ? cache.kpi : { type: 'done_ratio', target: 80, rewardCustom: '' },
        rewards: cache.rewards && typeof cache.rewards === 'object' ? cache.rewards : { points: 0, history: [] },
        history: Array.isArray(cache.history) ? cache.history : [],
        projects: Array.isArray(cache.projects) ? cache.projects : [],
      };
    }
    this._source = 'cloud';
  },
  useLocalStorage() {
    this._source = 'local';
  },
  setCloudPersist(fn) {
    this._cloudPersist = typeof fn === 'function' ? fn : null;
  },
  _persist() {
    if (this._source === 'cloud' && this._cloudPersist) this._cloudPersist();
  },

  getTasks() {
    if (this._source === 'cloud') return this._cache.tasks || [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setTasks(tasks) {
    if (this._source === 'cloud') {
      this._cache.tasks = tasks;
      this._persist();
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  },

  getTask(id) {
    return Data.getTasks().find(t => t.id === id);
  },

  addTask(task) {
    const tasks = Data.getTasks();
    const t = {
      id: task.id || uid(),
      name: task.name || 'Task',
      estimatedMinutes: Math.max(1, parseInt(task.estimatedMinutes, 10) || 30),
      deadline: task.deadline,
      singleDay: task.singleDay !== false,
      important: !!task.important,
      urgent: !!task.urgent,
      notes: Array.isArray(task.notes) ? task.notes : (task.notes ? [task.notes] : []),
      parentId: task.parentId || null,
      childIds: task.childIds || [],
      projectId: task.projectId || null,
      status: task.status || 'pending',
      completedAt: task.completedAt || null,
      completedMinutes: task.completedMinutes || 0,
      createdAt: task.createdAt || new Date().toISOString(),
    };
    tasks.push(t);
    Data.setTasks(tasks);
    return t;
  },

  updateTask(id, updates) {
    const tasks = Data.getTasks();
    const i = tasks.findIndex(t => t.id === id);
    if (i === -1) return null;
    tasks[i] = { ...tasks[i], ...updates };
    Data.setTasks(tasks);
    return tasks[i];
  },

  deleteTask(id) {
    const tasks = Data.getTasks().filter(t => t.id !== id);
    Data.setTasks(tasks);
    return tasks;
  },

  /** Xóa task và mọi task con (đệ quy). */
  deleteTaskWithChildren(id) {
    const tasks = Data.getTasks();
    const toRemove = new Set();
    function collect(tid) {
      toRemove.add(tid);
      const t = tasks.find(x => x.id === tid);
      if (t && t.childIds) t.childIds.forEach(collect);
    }
    collect(id);
    const next = tasks.filter(t => !toRemove.has(t.id));
    Data.setTasks(next);
    return next;
  },

  setTaskCancelledAt(id, at) {
    return Data.updateTask(id, { status: 'cancelled', cancelledAt: at || new Date().toISOString() });
  },

  getRootTasks() {
    return Data.getTasks().filter(t => !t.parentId);
  },

  getSubtasks(parentId) {
    return Data.getTasks().filter(t => t.parentId === parentId);
  },

  getProjects() {
    if (this._source === 'cloud') return this._cache.projects || [];
    try {
      const raw = localStorage.getItem(STORAGE_PROJECTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setProjects(projects) {
    if (this._source === 'cloud') {
      this._cache.projects = projects;
      this._persist();
      return;
    }
    localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(projects));
  },

  getProject(id) {
    return (Data.getProjects() || []).find(p => p.id === id);
  },

  addProject(project) {
    const projects = Data.getProjects().slice();
    const color = project.color || getNextProjectColor(projects.length);
    const p = {
      id: project.id || uid(),
      name: project.name || 'Project',
      color,
    };
    projects.push(p);
    Data.setProjects(projects);
    return p;
  },

  /** Màu tự động cho project tiếp theo (để hiển thị preview trong form) */
  getNextProjectColor() {
    return getNextProjectColor(Data.getProjects().length);
  },

  updateProject(id, updates) {
    const projects = Data.getProjects().slice();
    const i = projects.findIndex(p => p.id === id);
    if (i === -1) return null;
    projects[i] = { ...projects[i], ...updates };
    Data.setProjects(projects);
    return projects[i];
  },

  /** Xóa project và gỡ projectId khỏi mọi task thuộc project đó. */
  deleteProject(id) {
    const projects = (Data.getProjects() || []).filter(p => p.id !== id);
    Data.setProjects(projects);
    const tasks = Data.getTasks();
    let changed = false;
    const next = tasks.map(t => {
      if (t.projectId === id) {
        changed = true;
        return { ...t, projectId: null };
      }
      return t;
    });
    if (changed) Data.setTasks(next);
    return projects;
  },

  getTasksByProject(projectId) {
    const tasks = Data.getTasks();
    if (!projectId) return tasks.filter(t => !t.projectId);
    return tasks.filter(t => t.projectId === projectId);
  },

  getRootTasksByProject(projectId) {
    return Data.getRootTasks().filter(t => t.projectId === projectId);
  },

  getFixedSchedule() {
    if (this._source === 'cloud') return this._cache.schedule || [];
    try {
      const raw = localStorage.getItem(STORAGE_SCHEDULE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setFixedSchedule(items) {
    if (this._source === 'cloud') {
      this._cache.schedule = items;
      this._persist();
      return;
    }
    localStorage.setItem(STORAGE_SCHEDULE, JSON.stringify(items));
  },

  getKPI() {
    if (this._source === 'cloud') {
      return this._cache.kpi && typeof this._cache.kpi === 'object'
        ? this._cache.kpi
        : { type: 'done_ratio', target: 80, rewardCustom: '' };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KPI);
      return raw ? JSON.parse(raw) : { type: 'done_ratio', target: 80, rewardCustom: '' };
    } catch {
      return { type: 'done_ratio', target: 80, rewardCustom: '' };
    }
  },

  setKPI(kpi) {
    if (this._source === 'cloud') {
      this._cache.kpi = kpi;
      this._persist();
      return;
    }
    localStorage.setItem(STORAGE_KPI, JSON.stringify(kpi));
  },

  getRewardsState() {
    if (this._source === 'cloud') {
      return this._cache.rewards && typeof this._cache.rewards === 'object'
        ? this._cache.rewards
        : { points: 0, history: [] };
    }
    try {
      const raw = localStorage.getItem(STORAGE_REWARDS);
      return raw ? JSON.parse(raw) : { points: 0, history: [] };
    } catch {
      return { points: 0, history: [] };
    }
  },

  setRewardsState(state) {
    if (this._source === 'cloud') {
      this._cache.rewards = state;
      this._persist();
      return;
    }
    localStorage.setItem(STORAGE_REWARDS, JSON.stringify(state));
  },

  addRewardPoints(points, reason) {
    const state = Data.getRewardsState();
    state.points = (state.points || 0) + points;
    state.history = state.history || [];
    state.history.push({ points, reason, at: new Date().toISOString() });
    Data.setRewardsState(state);
  },

  getHistory() {
    if (this._source === 'cloud') return this._cache.history || [];
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setHistory(h) {
    if (this._source === 'cloud') {
      this._cache.history = h;
      this._persist();
      return;
    }
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(h));
  },

  pushHistory(entry) {
    const h = Data.getHistory();
    h.push(entry);
    Data.setHistory(h);
  },

  getTaskTotalMinutes,
  getTaskCompletionByCount,
  getTaskCompletionByTime,
  getPriority,
  getPriorityPoints,
  Priority,
  uid,
  PROJECT_COLORS,
  getNextProjectColor,
};
