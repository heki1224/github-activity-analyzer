const API_BASE = "http://localhost:3001/api";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function showError(message) {
  const el = document.getElementById("error");
  el.textContent = `Error: ${message}`;
  el.style.display = "block";
}

async function renderSummary() {
  const data = await fetchJson(`${API_BASE}/summary`);
  document.getElementById("pr-count").textContent = data.pr_count;
  document.getElementById("commit-count").textContent = data.commit_count;
  document.getElementById("lead-time").textContent = `${data.avg_lead_time_hours}h`;
}

async function renderCharts() {
  const data = await fetchJson(`${API_BASE}/timeseries`);

  new Chart(document.getElementById("weekly-commits-chart"), {
    type: "bar",
    data: {
      labels: data.weekly_commits.map((d) => d.week),
      datasets: [{
        label: "Commits",
        data: data.weekly_commits.map((d) => d.count),
        backgroundColor: "#4f86f7",
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });

  new Chart(document.getElementById("reviewer-chart"), {
    type: "doughnut",
    data: {
      labels: data.reviewer_activity.map((d) => d.reviewer),
      datasets: [{
        data: data.reviewer_activity.map((d) => d.count),
        borderWidth: 1,
      }],
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } },
  });
}

async function init() {
  try {
    await renderSummary();
    await renderCharts();
  } catch (e) {
    showError(e.message);
  }
}

init();
