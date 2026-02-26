/**
 * Mục 8: KPI (tỷ lệ done hoặc completion) + Reward (tùy chỉnh hoặc points theo ưu tiên)
 */

const KPI = {
  init() {
    document.getElementById('btn-save-kpi').addEventListener('click', () => KPI.save());
  },

  save() {
    const type = document.getElementById('kpi-type').value;
    const target = parseInt(document.getElementById('kpi-target').value, 10) || 80;
    const rewardCustom = document.getElementById('kpi-reward-custom').value.trim();
    Data.setKPI({ type, target, rewardCustom });
    KPI.render();
    App.closeModal('modal-kpi');
  },

  loadIntoSettings() {
    const kpi = Data.getKPI();
    document.getElementById('kpi-type').value = kpi.type || 'done_ratio';
    document.getElementById('kpi-target').value = kpi.target ?? 80;
    document.getElementById('kpi-reward-custom').value = kpi.rewardCustom || '';
  },

  computeCurrent() {
    const kpi = Data.getKPI();
    const tasks = Data.getRootTasks();
    const total = tasks.length;
    if (total === 0) return { value: 0, target: kpi.target, type: kpi.type };
    if (kpi.type === 'done_ratio') {
      const done = tasks.filter(t => t.status === 'done').length;
      return { value: (done / total) * 100, target: kpi.target, type: kpi.type };
    }
    let sumPct = 0;
    tasks.forEach(t => {
      sumPct += Data.getTaskCompletionByTime(t, Data.getTasks());
    });
    return { value: sumPct / total, target: kpi.target, type: kpi.type };
  },

  render() {
    const configEl = document.getElementById('kpi-config');
    const rewardsEl = document.getElementById('rewards-display');
    if (!configEl || !rewardsEl) return;
    const kpi = Data.getKPI();
    const current = KPI.computeCurrent();
    configEl.innerHTML = `
      <p><strong>KPI hiện tại:</strong> ${kpi.type === 'done_ratio' ? 'Tỷ lệ task hoàn thành' : 'Tỷ lệ hoàn thành theo thời gian'}</p>
      <p>Mục tiêu: ${kpi.target}% · Đạt: ${current.value.toFixed(1)}%</p>
    `;
    const rewardsState = Data.getRewardsState();
    const rewardText = kpi.rewardCustom || `Points: ${rewardsState.points || 0}`;
    const achieved = current.value >= current.target;
    rewardsEl.innerHTML = `
      <div class="points">${rewardText}</div>
      <div class="kpi-status">${achieved ? 'Đạt KPI!' : 'Chưa đạt KPI'}</div>
    `;
  },
};
