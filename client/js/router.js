class PageRouter {
  constructor() {
    this.container = document.getElementById("page-content");
    this.activePage = null;
    this.activeCleanup = null;
    this.activeStyleElement = null;

    this.routes = {
      dashboard: {
        title: "Dashboard - HomeLab",
        path: "dashboard",
      },
      services: {
        title: "Services - HomeLab",
        path: "services",
      },
      storage: {
        title: "Storage - HomeLab",
        path: "storage",
      },
      network: {
        title: "Network - HomeLab",
        path: "network",
      },
      processes: {
        title: "Processes - HomeLab",
        path: "processes",
      },
      containers: {
        title: "Containers - HomeLab",
        path: "containers",
      },
      devices: {
        title: "Devices - HomeLab",
        path: "devices",
      },
      logs: {
        title: "Logs - HomeLab",
        path: "logs",
      },
    };

    this.init();
  }

  init() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-page]");
      if (link) {
        e.preventDefault();
        const pageName = link.getAttribute("data-page");
        if (pageName) {
          this.navigateTo(pageName);
        }
      }
    });

    window.addEventListener("hashchange", () => {
      const pageName = this.getPageFromHash();
      this.load(pageName, false);
    });

    const initialPage = this.getPageFromHash() || "dashboard";
    this.load(initialPage, false);
  }

  getPageFromHash() {
    const hash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
    return hash || null;
  }

  navigateTo(pageName) {
    if (this.activePage === pageName) return;
    window.location.hash = `#${pageName}`;
  }

  async load(pageName, updateHash = true) {
    if (!pageName) pageName = "dashboard";

    if (updateHash) {
      window.location.hash = `#${pageName}`;
      return;
    }

    this.cleanupCurrentPage();

    this.updateNav(pageName);

    this.container.innerHTML = `
      <div class="page-loader">
        <div class="spinner"></div>
        <span>Loading ${pageName}...</span>
      </div>
    `;

    try {
      const basePath = `pages/${pageName}/${pageName}`;

      await this.swapPageStylesheet(pageName, `${basePath}.css`);

      const htmlResponse = await fetch(`${basePath}.html?_t=${Date.now()}`);
      if (!htmlResponse.ok) {
        throw new Error(`Page "${pageName}" could not be found (${htmlResponse.status})`);
      }

      let htmlText = await htmlResponse.text();

      if (htmlText.includes("<body")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        htmlText = doc.body.innerHTML;
      }

      this.container.className = `page-container page-${pageName}`;
      this.container.setAttribute("data-current-page", pageName);
      this.container.innerHTML = htmlText;

      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons({
          root: this.container,
        });
      }

      if (this.routes[pageName] && this.routes[pageName].title) {
        document.title = this.routes[pageName].title;
      } else {
        document.title = `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - HomeLab`;
      }

      await this.loadPageScript(pageName, `${basePath}.js`);

      this.activePage = pageName;
    } catch (err) {
      console.error(`[Router] Failed to load page: ${pageName}`, err);
      this.renderError(pageName, err.message);
    }
  }

  swapPageStylesheet(pageName, cssHref) {
    return new Promise((resolve) => {
      if (this.activeStyleElement && this.activeStyleElement.parentNode) {
        this.activeStyleElement.parentNode.removeChild(this.activeStyleElement);
        this.activeStyleElement = null;
      }

      const oldLinks = document.querySelectorAll("link[data-dynamic-page-style]");
      oldLinks.forEach((el) => el.parentNode.removeChild(el));

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "page-stylesheet";
      link.setAttribute("data-dynamic-page-style", pageName);
      link.href = `${cssHref}?_t=${Date.now()}`;

      link.onload = () => {
        this.activeStyleElement = link;
        resolve();
      };

      link.onerror = () => {
        console.warn(`[Router] Page stylesheet not found: ${cssHref}`);
        resolve();
      };

      document.head.appendChild(link);
    });
  }

  async loadPageScript(pageName, jsHref) {
    try {
      const moduleUrl = `${new URL(jsHref, window.location.href).href}?_t=${Date.now()}`;
      const pageModule = await import(moduleUrl);

      if (typeof pageModule.init === "function") {
        const cleanup = await pageModule.init(this.container);
        if (typeof cleanup === "function") {
          this.activeCleanup = cleanup;
        } else if (typeof pageModule.destroy === "function") {
          this.activeCleanup = pageModule.destroy;
        }
      } else if (typeof pageModule.default === "function") {
        const cleanup = await pageModule.default(this.container);
        if (typeof cleanup === "function") {
          this.activeCleanup = cleanup;
        }
      }
    } catch (err) {
      console.warn(`[Router] No valid module exported or error executing script: ${jsHref}`, err);
    }
  }

  cleanupCurrentPage() {
    if (typeof this.activeCleanup === "function") {
      try {
        this.activeCleanup();
      } catch (e) {
        console.error("[Router] Error during page cleanup:", e);
      }
      this.activeCleanup = null;
    }
  }

  updateNav(pageName) {
    const navItems = document.querySelectorAll(".nav-item[data-page]");
    navItems.forEach((item) => {
      const targetPage = item.getAttribute("data-page");
      if (targetPage === pageName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  renderError(pageName, errorMsg) {
    this.container.className = `page-container page-error-state`;
    this.container.innerHTML = `
      <div class="page-error">
        <div class="brand-icon" style="margin-bottom: 8px;">
          <i data-lucide="alert-triangle"></i>
        </div>
        <h2 class="page-error-title">${pageName.charAt(0).toUpperCase() + pageName.slice(1)} View</h2>
        <p class="page-error-msg">
          ${errorMsg.includes("404") || errorMsg.includes("could not be found")
            ? `The page module for "${pageName}" is currently under construction or not yet configured.`
            : errorMsg}
        </p>
        <button class="page-error-btn" onclick="loadPage('dashboard')">
          ← Return to Dashboard
        </button>
      </div>
    `;

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({ root: this.container });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.router = new PageRouter();

  window.loadPage = (pageName) => window.router.load(pageName, true);
  window.fetchPage = (pageName) => window.router.load(pageName, true);
  window.fetchView = (pageName) => window.router.load(pageName, true);
});
