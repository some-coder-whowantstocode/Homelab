var timeOutId = null;

function convertkbTogb(kb) {

  if(isNaN(kb)) {
    return 0;
  }

  let gb = parseInt(kb) / 1000000;
  
  return gb.toFixed(2);
}

function convertbytesTogb(b) {

  if(isNaN(b)) {
    return 0;
  }

  let gb = parseInt(b) / 1000000000;
  
  return gb.toFixed(2);
}

async function fetchStatus() {
  if (timeOutId != null) {
    clearTimeout(timeOutId);
    timeOutId = null;
  }

  let url = "http://localhost:8000/status";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Response status: ", response.status);
    }

    const result = await response.json();

    if (!isNaN(result.CPU)) {
      result.CPU = parseFloat(result.CPU).toFixed(2);
    }

    if (!isNaN(result.Memory.Usage)) {
      result.Memory.Usage = parseFloat(result.Memory.Usage).toFixed(2);
    }

    result.Memory.Total = convertkbTogb(result.Memory.Total);
    result.Memory.Free = convertkbTogb(result.Memory.Free);
    result.Memory.Used = convertkbTogb(result.Memory.Used);

    if (!isNaN(result.Disk.Usage)) {
      result.Disk.Usage = parseFloat(result.Disk.Usage).toFixed(2);
    }

    result.Disk.Total = convertbytesTogb(result.Disk.Total);
    result.Disk.Free = convertbytesTogb(result.Disk.Free);
    result.Disk.Used = convertbytesTogb(result.Disk.Used);
    result.Disk.Available = convertbytesTogb(result.Disk.Available);


    let upTime = parseFloat(result.Uptime);
    let hours = Math.floor(upTime / 3600);
    let minutes = Math.floor((upTime % 3600) / 60);
    let seconds = Math.floor((upTime % 3600) % 60);
    var uptime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    result.Uptime = uptime;

    updateDashboard(result);

    timeOutId = setTimeout(() => {
      fetchStatus();
    }, 2000);
  } catch (error) {
    console.log(error.message);
  }
}

function updateDashboard(data) {
  document.getElementById("cpu-value").textContent = Math.round(data.CPU);

  document.getElementById("cpu-progress").style.width = `${data.CPU}%`;

  const cpuStatus = document.getElementById("cpu-status");

  if (data.CPU < 60) {
    cpuStatus.textContent = "Normal";
    cpuStatus.style.color = "var(--green)";
  } else if (data.CPU < 85) {
    cpuStatus.textContent = "High";
    cpuStatus.style.color = "var(--orange)";
  } else {
    cpuStatus.textContent = "Critical";
    cpuStatus.style.color = "var(--red)";
  }

  document.getElementById("memory-value").textContent = Math.round(
    data.Memory.Usage,
  );

  document.getElementById("memory-progress").style.width =
    `${data.Memory.Usage}%`;

  document.getElementById("memory-used").textContent =
    `${data.Memory.Used} GB used`;

  document.getElementById("memory-total").textContent =
    `${data.Memory.Total} GB`;

  document.getElementById("disk-value").textContent = Math.round(
    data.Disk.Usage,
  );

  document.getElementById("disk-progress").style.width = `${data.Disk.Usage}%`;

  document.getElementById("disk-used").textContent =
    `${data.Disk.Used} GB used`;

  document.getElementById("disk-available").textContent =
    `${data.Disk.Available} GB available`;

  document.getElementById("hostname").textContent = data.Hostname;

  document.getElementById("ip-address").textContent = data.IP;

  document.getElementById("uptime").textContent = data.Uptime;

  document.getElementById("last-updated").textContent =
    new Date().toLocaleTimeString();

  updateNetwork(data.Network)
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}


function formatRate(bytesPerSecond) {
    return `${formatBytes(bytesPerSecond)}/s`;
}


function updateNetwork(network) {

    document.getElementById("network-interface").textContent =
        network.Interface;

    document.getElementById("network-rx-rate").textContent =
        formatRate(network.RXRate);

    document.getElementById("network-tx-rate").textContent =
        formatRate(network.TXRate);

    document.getElementById("network-rx-total").textContent =
        formatBytes(network.RXBytes);

    document.getElementById("network-tx-total").textContent =
        formatBytes(network.TXBytes);

    document.getElementById("network-rx-packets").textContent =
        network.RXPackets.toLocaleString();

    document.getElementById("network-tx-packets").textContent =
        network.TXPackets.toLocaleString();

    const errors =
        network.RXErrors + network.TXErrors;

    const drops =
        network.RXDrops + network.TXDrops;

    document.getElementById("network-errors").textContent =
        errors.toLocaleString();

    document.getElementById("network-drops").textContent =
        drops.toLocaleString();
}

const dummyProcesses = [
    {
        name: "chrome",
        pid: 8421,
        cpu: 12.4,
        memory: 1240,
        status: "Running"
    },
    {
        name: "code",
        pid: 6312,
        cpu: 8.7,
        memory: 842,
        status: "Running"
    },
    {
        name: "go",
        pid: 9214,
        cpu: 4.2,
        memory: 124,
        status: "Running"
    },
    {
        name: "systemd",
        pid: 1,
        cpu: 0.1,
        memory: 12,
        status: "Running"
    },
    {
        name: "NetworkManager",
        pid: 1032,
        cpu: 0.3,
        memory: 28,
        status: "Running"
    }
];


function formatMemory(memoryMB) {

    if (memoryMB >= 1024) {
        return `${(memoryMB / 1024).toFixed(1)} GB`;
    }

    return `${memoryMB} MB`;
}


function updateProcesses(processes) {

    const processList =
        document.getElementById("process-list");

    processList.innerHTML = "";

    processes.forEach(process => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <span class="process-name">
                    ${process.name}
                </span>
            </td>

            <td>
                <span class="process-pid">
                    ${process.pid}
                </span>
            </td>

            <td>
                <span class="process-cpu">
                    ${process.cpu.toFixed(1)}%
                </span>
            </td>

            <td>
                <span class="process-memory">
                    ${formatMemory(process.memory)}
                </span>
            </td>

            <td>
                <span class="process-status">
                    <span class="process-status-dot"></span>
                    ${process.status}
                </span>
            </td>
        `;

        processList.appendChild(row);
    });

    document.getElementById("process-count").textContent =
        processes.length;

    document.getElementById("process-updated").textContent =
        "Updated just now";
}


updateProcesses(dummyProcesses);

document.addEventListener("DOMContentLoaded", (event) => {
  fetchStatus();

  lucide.createIcons();

  const ctx = document.getElementById("network-chart");

  const labels = [
    "10:00",
    "10:05",
    "10:10",
    "10:15",
    "10:20",
    "10:25",
    "10:30",
    "10:35",
    "10:40",
    "10:45",
    "10:50",
    "10:55",
  ];

  const networkChart = new Chart(ctx, {
    type: "line",

    data: {
      labels: labels,

      datasets: [
        {
          label: "Download",
          data: [12, 18, 15, 25, 20, 34, 28, 41, 36, 30, 45, 38],
          borderWidth: 2,
          tension: 0.35,
          fill: false,
        },

        {
          label: "Upload",
          data: [5, 8, 7, 12, 9, 15, 11, 18, 14, 17, 13, 20],
          borderWidth: 2,
          tension: 0.35,
          fill: false,
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
          labels: {
            color: "#8995a5",
            boxWidth: 10,
            font: {
              size: 10,
            },
          },
        },
      },

      scales: {
        x: {
          grid: {
            color: "#1b232d",
          },

          ticks: {
            color: "#687586",
            font: {
              size: 9,
            },
          },
        },

        y: {
          beginAtZero: true,

          grid: {
            color: "#1b232d",
          },

          ticks: {
            color: "#687586",
            font: {
              size: 9,
            },
          },
        },
      },
    },
  });

  updateProcesses(data.processes);

  document.getElementById("refresh-btn").addEventListener("click",fetchStatus)
});
