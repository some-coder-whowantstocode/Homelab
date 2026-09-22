let timeOutId = null;
let chartInstance = null;
const processPreviewLength = 8;

export function init(container) {
  initChart();

  fetchStatus();

  const refreshBtn = document.getElementById("refresh-btn");
  const handleRefresh = () => fetchStatus(true);
  if (refreshBtn) {
    refreshBtn.addEventListener("click", handleRefresh);
  }

  return () => {
    destroy();
    if (refreshBtn) {
      refreshBtn.removeEventListener("click", handleRefresh);
    }
  };
}

export function destroy() {
  if (timeOutId !== null) {
    clearTimeout(timeOutId);
    timeOutId = null;
  }

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function initChart() {
  const ctx = document.getElementById("network-chart");
  if (!ctx || !window.Chart) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const labels = [
    "10:00", "10:05", "10:10", "10:15", "10:20", "10:25",
    "10:30", "10:35", "10:40", "10:45", "10:50", "10:55",
  ];

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Download (MB/s)",
          data: [12, 18, 15, 25, 20, 34, 28, 41, 36, 30, 45, 38],
          borderColor: "#4da3ff",
          backgroundColor: "rgba(77, 163, 255, 0.08)",
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: "Upload (MB/s)",
          data: [5, 8, 7, 12, 9, 15, 11, 18, 14, 17, 13, 20],
          borderColor: "#35d07f",
          backgroundColor: "rgba(53, 208, 127, 0.08)",
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            color: "#8995a5",
            boxWidth: 10,
            usePointStyle: true,
            font: { size: 11, family: "Inter" },
          },
        },
        tooltip: {
          backgroundColor: "#111720",
          titleColor: "#f1f5f9",
          bodyColor: "#8995a5",
          borderColor: "#202936",
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(32, 41, 54, 0.6)" },
          ticks: { color: "#687586", font: { size: 10, family: "Inter" } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(32, 41, 54, 0.6)" },
          ticks: { color: "#687586", font: { size: 10, family: "Inter" } },
        },
      },
    },
  });
}

async function fetchStatus(isManual = false) {
  if (timeOutId !== null) {
    clearTimeout(timeOutId);
    timeOutId = null;
  }

  const url = "http://localhost:8000/status";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    processAndRender(result);
  } catch (error) {
    renderFallbackData();
  }

  timeOutId = setTimeout(() => {
    fetchStatus();
  }, 2500);
}

function processAndRender(result) {
  if (!isNaN(result.CPU)) {
    result.CPU = parseFloat(result.CPU).toFixed(1);
  }

  if (result.Memory) {
    if (!isNaN(result.Memory.Usage)) {
      result.Memory.Usage = parseFloat(result.Memory.Usage).toFixed(1);
    }
    result.Memory.Total = convertkbTogb(result.Memory.Total);
    result.Memory.Free = convertkbTogb(result.Memory.Free);
    result.Memory.Used = convertkbTogb(result.Memory.Used);
  }

  if (result.Disk) {
    if (!isNaN(result.Disk.Usage)) {
      result.Disk.Usage = parseFloat(result.Disk.Usage).toFixed(1);
    }
    result.Disk.Total = convertbytesTogb(result.Disk.Total);
    result.Disk.Free = convertbytesTogb(result.Disk.Free);
    result.Disk.Used = convertbytesTogb(result.Disk.Used);
    result.Disk.Available = convertbytesTogb(result.Disk.Available);
  }

  const upTime = parseFloat(result.Uptime || 0);
  const hours = Math.floor(upTime / 3600);
  const minutes = Math.floor((upTime % 3600) / 60);
  const seconds = Math.floor(upTime % 60);
  result.Uptime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  updateDashboardUI(result);
}

function updateDashboardUI(data) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const setWidth = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${val}%`;
  };

  const cpuVal = Math.round(data.CPU || 0);
  setText("cpu-value", cpuVal);
  setWidth("cpu-progress", Math.min(100, cpuVal));

  const cpuStatus = document.getElementById("cpu-status");
  if (cpuStatus) {
    if (cpuVal < 60) {
      cpuStatus.textContent = "Normal";
      cpuStatus.style.color = "var(--green)";
    } else if (cpuVal < 85) {
      cpuStatus.textContent = "Elevated";
      cpuStatus.style.color = "var(--orange)";
    } else {
      cpuStatus.textContent = "Critical";
      cpuStatus.style.color = "var(--red)";
    }
  }

  if (data.Memory) {
    const memVal = Math.round(data.Memory.Usage || 0);
    setText("memory-value", memVal);
    setWidth("memory-progress", Math.min(100, memVal));
    setText("memory-used", `${data.Memory.Used || 0} GB used`);
    setText("memory-total", `${data.Memory.Total || 0} GB`);
  }

  if (data.Disk) {
    const diskVal = Math.round(data.Disk.Usage || 0);
    setText("disk-value", diskVal);
    setWidth("disk-progress", Math.min(100, diskVal));
    setText("disk-used", `${data.Disk.Used || 0} GB used`);
    setText("disk-available", `${data.Disk.Available || 0} GB free`);
  }

  setText("hostname", data.Hostname || "homelab-node");
  setText("ip-address", data.IP || "127.0.0.1");
  setText("uptime", data.Uptime || "00:00:00");
  setText("last-updated", new Date().toLocaleTimeString());

  if (data.Network) {
    updateNetworkUI(data.Network);
  }

  if (data.Process) {
    updateProcessesUI(data.Process);
  }
}

function updateNetworkUI(network) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("network-interface", network.Interface || "eth0");
  setText("network-rx-rate", formatRate(network.RXRate || 0));
  setText("network-tx-rate", formatRate(network.TXRate || 0));
  setText("network-rx-total", formatBytes(network.RXBytes || 0));
  setText("network-tx-total", formatBytes(network.TXBytes || 0));
  setText("network-rx-packets", (network.RXPackets || 0).toLocaleString());
  setText("network-tx-packets", (network.TXPackets || 0).toLocaleString());

  const errors = (network.RXErrors || 0) + (network.TXErrors || 0);
  const drops = (network.RXDrops || 0) + (network.TXDrops || 0);
  setText("network-errors", errors.toLocaleString());
  setText("network-drops", drops.toLocaleString());
}

function updateProcessesUI(processes) {
  const processList = document.getElementById("process-list");
  if (!processList) return;

  processList.innerHTML = "";

  if (Array.isArray(processes)) {
    processes.sort((a, b) => (b.CPU || 0) - (a.CPU || 0));
  } else {
    processes = [];
  }

  const list = processes.slice(0, processPreviewLength);

  list.forEach((proc) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <span class="process-name">${proc.Name || "unknown"}</span>
      </td>
      <td>
        <span class="process-pid">${proc.PID || "—"}</span>
      </td>
      <td>
        <span class="process-cpu">${(proc.CPU || 0).toFixed(1)}%</span>
      </td>
      <td>
        <span class="process-memory">${formatBytes(proc.Memory || 0)}</span>
      </td>
      <td>
        <span class="process-status">
          <span class="process-status-dot"></span>
          ${getProcessState(proc.Status).toLowerCase()}
        </span>
      </td>
    `;
    processList.appendChild(row);
  });

  const countEl = document.getElementById("process-count");
  if (countEl) countEl.textContent = processes.length;

  const updatedEl = document.getElementById("process-updated");
  if (updatedEl) updatedEl.textContent = "Live";
}

function renderFallbackData() {
  const demoData = {
    Hostname: "homelab-server",
    IP: "192.168.1.105",
    Uptime: "14:32:18",
    CPU: 18.5,
    Memory: { Usage: 42.0, Used: 6.7, Total: 16.0 },
    Disk: { Usage: 54.0, Used: 245, Available: 210, Total: 455 },
    Network: {
      Interface: "enp3s0",
      RXRate: 1425000,
      TXRate: 382000,
      RXBytes: 42100000000,
      TXBytes: 15400000000,
      RXPackets: 31204000,
      TXPackets: 18450000,
      RXErrors: 0,
      TXErrors: 0,
      RXDrops: 0,
      TXDrops: 0,
    },
    Process: [
      { Name: "nginx", PID: 2277, CPU: 4.2, Memory: 145000000, Status: "S" },
      { Name: "homelab-api", PID: 4512, CPU: 3.8, Memory: 89000000, Status: "R" },
      { Name: "postgres", PID: 1834, CPU: 2.1, Memory: 420000000, Status: "S" },
      { Name: "docker", PID: 920, CPU: 1.6, Memory: 210000000, Status: "S" },
      { Name: "systemd-journal", PID: 412, CPU: 0.8, Memory: 45000000, Status: "S" },
      { Name: "sshd", PID: 1045, CPU: 0.2, Memory: 18000000, Status: "S" },
      { Name: "cron", PID: 882, CPU: 0.1, Memory: 8000000, Status: "S" },
    ],
  };

  updateDashboardUI(demoData);
}

function convertkbTogb(kb) {
  if (isNaN(kb)) return "0.00";
  return (parseInt(kb) / 1000000).toFixed(2);
}

function convertbytesTogb(b) {
  if (isNaN(b)) return "0.00";
  return (parseInt(b) / 1000000000).toFixed(2);
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatRate(bytesPerSec) {
  return `${formatBytes(bytesPerSec)}/s`;
}

function getProcessState(state) {
  const states = {
    R: "Running",
    S: "Sleeping",
    D: "Waiting",
    Z: "Zombie",
    T: "Stopped",
    I: "Idle",
  };
  return states[state] || "Active";
}
