let timeOutId = null;
let services = [];
let cleanupListeners = [];

export function init(container) {
  cleanupListeners = [];

  const searchInput = document.getElementById("service-search");
  const statusFilter = document.getElementById("status-filter");
  const monitorFilter = document.getElementById("monitor-filter");
  const modal = document.getElementById("service-modal");
  const modalClose = document.getElementById("modal-close");
  const modalCancel = document.getElementById("modal-cancel");

  const handleFilter = () => renderServices();
  if (searchInput) {
    searchInput.addEventListener("input", handleFilter);
    cleanupListeners.push(() => searchInput.removeEventListener("input", handleFilter));
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", handleFilter);
    cleanupListeners.push(() => statusFilter.removeEventListener("change", handleFilter));
  }
  if (monitorFilter) {
    monitorFilter.addEventListener("change", handleFilter);
    cleanupListeners.push(() => monitorFilter.removeEventListener("change", handleFilter));
  }

  const closeModal = () => {
    if (modal) modal.classList.remove("show");
  };

  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
    cleanupListeners.push(() => modalClose.removeEventListener("click", closeModal));
  }
  if (modalCancel) {
    modalCancel.addEventListener("click", closeModal);
    cleanupListeners.push(() => modalCancel.removeEventListener("click", closeModal));
  }
  if (modal) {
    const handleOverlayClick = (e) => {
      if (e.target === modal) closeModal();
    };
    modal.addEventListener("click", handleOverlayClick);
    cleanupListeners.push(() => modal.removeEventListener("click", handleOverlayClick));
  }

  fetchServices();

  return () => {
    destroy();
  };
}

export function destroy() {
  if (timeOutId !== null) {
    clearTimeout(timeOutId);
    timeOutId = null;
  }

  cleanupListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn("[Services] Error cleaning up listener:", e);
    }
  });
  cleanupListeners = [];

  const modal = document.getElementById("service-modal");
  if (modal) modal.classList.remove("show");
}

async function fetchServices() {
  if (timeOutId !== null) {
    clearTimeout(timeOutId);
    timeOutId = null;
  }

  const url = "http://localhost:8000/service";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();

    if (Array.isArray(result.Services)) {
      const monitoredMap = new Map();
      services.forEach((s) => {
        if (s.monitored) monitoredMap.set(s.name, true);
      });

      services = result.Services.map((svc) => ({
        name: svc.Name,
        description: svc.Description || "System daemon",
        status: svc.SubState || "active",
        pid: svc.PID || "—",
        enabled: svc.EnableState === "enabled",
        monitored: monitoredMap.has(svc.Name),
      }));
    }

    updateStats();
    renderServices();
  } catch (error) {
    if (services.length === 0) {
      loadDemoServices();
    }
  }

  timeOutId = setTimeout(() => {
    fetchServices();
  }, 3000);
}

function renderServices() {
  const serviceList = document.getElementById("service-list");
  const searchInput = document.getElementById("service-search");
  const statusFilter = document.getElementById("status-filter");
  const monitorFilter = document.getElementById("monitor-filter");

  if (!serviceList) return;

  const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const status = statusFilter ? statusFilter.value : "all";
  const monitor = monitorFilter ? monitorFilter.value : "all";

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search) ||
      s.description.toLowerCase().includes(search);

    const matchesStatus =
      status === "all" ||
      s.status.toLowerCase().includes(status.toLowerCase());

    const matchesMonitor =
      monitor === "all" ||
      (monitor === "monitored" && s.monitored) ||
      (monitor === "unmonitored" && !s.monitored);

    return matchesSearch && matchesStatus && matchesMonitor;
  });

  serviceList.innerHTML = "";

  if (filtered.length === 0) {
    serviceList.innerHTML = `
      <div class="empty-state">
        No system services match your current search and filters.
      </div>
    `;
    updateResultCount(0);
    return;
  }

  filtered.forEach((service) => {
    const row = document.createElement("div");
    row.className = "service-row";

    const isRunning =
      service.status === "running" || service.status === "active";
    const isFailed = service.status === "failed";
    const dotClass = isFailed
      ? "status-failed"
      : isRunning
      ? "status-running"
      : "status-stopped";

    row.innerHTML = `
      <div class="service-name">
        <div class="service-icon">⚙</div>
        <div>
          <strong>${service.name}</strong>
          <small>${service.description}</small>
        </div>
      </div>

      <div class="service-state">
        <span class="service-status-dot ${dotClass}"></span>
        <span>${service.status}</span>
      </div>

      <div class="service-pid">
        ${service.pid > 0 ? service.pid : "—"}
      </div>

      <div class="service-enabled">
        ${service.enabled ? "Enabled" : "Disabled"}
      </div>

      <div class="monitor-badge-col">
        <span class="monitor-badge ${service.monitored ? "monitor-yes" : "monitor-no"}">
          ${service.monitored ? "Monitored" : "Not Monitored"}
        </span>
      </div>
    `;

    row.addEventListener("click", () => {
      openServiceModal(service);
    });

    serviceList.appendChild(row);
  });

  updateResultCount(filtered.length);
}

function updateResultCount(count) {
  const el = document.getElementById("result-count");
  if (el) {
    el.textContent = `${count} service${count === 1 ? "" : "s"}`;
  }
}

function updateStats() {
  const total = services.length;
  const monitored = services.filter((s) => s.monitored).length;
  const running = services.filter(
    (s) => s.status === "running" || s.status === "active"
  ).length;

  const totalEl = document.getElementById("total-services");
  const monEl = document.getElementById("monitored-services");
  const runEl = document.getElementById("running-services");

  if (totalEl) totalEl.textContent = total;
  if (monEl) monEl.textContent = monitored;
  if (runEl) runEl.textContent = running;
}

function openServiceModal(service) {
  const modal = document.getElementById("service-modal");
  const modalName = document.getElementById("modal-service-name");
  const modalDesc = document.getElementById("modal-description");
  const modalStatus = document.getElementById("modal-status");
  const modalPid = document.getElementById("modal-pid");
  const modalEnabled = document.getElementById("modal-enabled");
  const modalUnit = document.getElementById("modal-unit");
  const modalMonitor = document.getElementById("modal-monitor");

  if (!modal) return;

  if (modalName) modalName.textContent = service.name;
  if (modalDesc) modalDesc.textContent = service.description;
  if (modalStatus) modalStatus.textContent = service.status;
  if (modalPid) modalPid.textContent = service.pid > 0 ? service.pid : "—";
  if (modalEnabled) modalEnabled.textContent = service.enabled ? "Yes" : "No";
  if (modalUnit) modalUnit.textContent = service.name;

  if (modalMonitor) {
    modalMonitor.textContent = service.monitored
      ? "Remove Monitoring"
      : "Monitor Service";

    modalMonitor.onclick = () => {
      service.monitored = !service.monitored;
      modalMonitor.textContent = service.monitored
        ? "Remove Monitoring"
        : "Monitor Service";
      updateStats();
      renderServices();
    };
  }

  modal.classList.add("show");
}

function loadDemoServices() {
  services = [
    { name: "nginx.service", description: "A high performance web server and reverse proxy", status: "running", pid: 2277, enabled: true, monitored: true },
    { name: "ssh.service", description: "OpenBSD Secure Shell server", status: "running", pid: 1045, enabled: true, monitored: true },
    { name: "docker.service", description: "Docker Application Container Engine", status: "running", pid: 920, enabled: true, monitored: false },
    { name: "cron.service", description: "Regular background program processing daemon", status: "running", pid: 882, enabled: true, monitored: false },
    { name: "systemd-journald.service", description: "Journal Service", status: "running", pid: 412, enabled: true, monitored: true },
    { name: "systemd-resolved.service", description: "Network Name Resolution", status: "running", pid: 610, enabled: true, monitored: false },
    { name: "systemd-timesyncd.service", description: "Network Time Synchronization", status: "running", pid: 590, enabled: true, monitored: false },
    { name: "ufw.service", description: "Uncomplicated firewall", status: "active", pid: "—", enabled: true, monitored: true },
    { name: "bluetooth.service", description: "Bluetooth service", status: "stopped", pid: "—", enabled: false, monitored: false },
    { name: "cups.service", description: "CUPS Scheduler", status: "stopped", pid: "—", enabled: false, monitored: false },
    { name: "apache2.service", description: "The Apache HTTP Server", status: "failed", pid: "—", enabled: false, monitored: false },
  ];

  updateStats();
  renderServices();
}
