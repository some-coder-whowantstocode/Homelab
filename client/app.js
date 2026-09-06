var timeOutId = null;

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

    if (!isNaN(result.Memory)) {
      result.Memory = parseFloat(result.Memory).toFixed(2);
    }

    document.getElementById("hostname").innerText = result.Hostname;
    document.getElementById("ip-address").innerText = result.IP;
    document.getElementById("uptime").innerText = result.Uptime + " sec";
    document.getElementById("cpu-value").innerText = result.CPU + " %";
    document.getElementById("memory-value").innerText = result.Memory + " %";

    document.getElementById("cpu-gauge").style.setProperty("--percentage", Math.round(result.CPU));

    document.getElementById("memory-gauge").style.setProperty("--percentage", Math.round(result.Memory));

    timeOutId = setTimeout(() => {
      fetchStatus();
    }, 1000);
  } catch (error) {
    console.log(error.message);
  }
}

document.addEventListener("DOMContentLoaded", (event) => {
  fetchStatus();

  document.getElementById("refresh-btn").addEventListener("click", fetchStatus);
});
