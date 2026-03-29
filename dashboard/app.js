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

async function renderHeatmap() {
  const cells = await fetchJson(`${API_BASE}/heatmap`);

  // Build 7x24 matrix, fill missing cells with 0
  const matrix = {};
  for (const c of cells) {
    matrix[`${c.dow}-${c.hour}`] = c.count;
  }
  const data = [];
  let maxCount = 1;
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = matrix[`${dow}-${hour}`] ?? 0;
      data.push({ x: hour, y: dow, v: count });
      if (count > maxCount) maxCount = count;
    }
  }

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  new Chart(document.getElementById("heatmap-chart"), {
    type: "matrix",
    data: {
      datasets: [{
        label: "Commits",
        data,
        backgroundColor(ctx) {
          const v = ctx.dataset.data[ctx.dataIndex].v;
          const alpha = v === 0 ? 0.05 : 0.15 + (v / maxCount) * 0.85;
          return `rgba(79, 134, 247, ${alpha})`;
        },
        borderColor: "rgba(0,0,0,0.05)",
        borderWidth: 1,
        width(ctx) { return ctx.chart.chartArea ? ctx.chart.chartArea.width / 24 - 1 : 10; },
        height(ctx) { return ctx.chart.chartArea ? ctx.chart.chartArea.height / 7 - 1 : 10; },
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: () => "",
            label(ctx) {
              const { x, y, v } = ctx.dataset.data[ctx.dataIndex];
              return `${DOW_LABELS[y]} ${String(x).padStart(2, "0")}:00 — ${v} commits`;
            },
          },
        },
      },
      scales: {
        x: { type: "linear", min: 0, max: 23, ticks: { stepSize: 1, callback: (v) => `${v}h` } },
        y: { type: "linear", min: 0, max: 6, ticks: { stepSize: 1, callback: (v) => DOW_LABELS[v] ?? "" } },
      },
    },
  });
}

async function renderPrDistribution() {
  const data = await fetchJson(`${API_BASE}/pr-distribution`);

  new Chart(document.getElementById("pr-distribution-chart"), {
    type: "bar",
    data: {
      labels: data.map((d) => d.bucket),
      datasets: [{
        label: "PRs",
        data: data.map((d) => d.count),
        backgroundColor: "#f7914f",
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

async function init() {
  try {
    await renderSummary();
    await renderCharts();
    await renderHeatmap();
    await renderPrDistribution();
  } catch (e) {
    showError(e.message);
  }
}

init();
