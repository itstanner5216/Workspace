// -------------------- Client-Side JavaScript --------------------
// iOS-specific optimizations
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isIOS18 = isIOS && (/OS 18/.test(navigator.userAgent) || /Version\/18/.test(navigator.userAgent));
const hasDynamicIsland = isIOS && /iPhone/.test(navigator.userAgent) && window.devicePixelRatio >= 3;

// Apply iOS-specific optimizations
if (isIOS) {
  document.body.classList.add("ios");
  
  // Additional iOS 18 optimizations
  if (isIOS18) {
    document.body.classList.add("ios18");
    
    // Dynamic Island awareness
    if (hasDynamicIsland && window.matchMedia("(display-mode: standalone)").matches) {
      document.body.classList.add("has-dynamic-island");
      const spacer = document.createElement("div");
      spacer.className = "dynamic-island-spacer";
      document.body.insertBefore(spacer, document.body.firstChild);
    }
    
    // Better backdrop filters
    const header = document.querySelector("header");
    if (header) {
      header.style.backdropFilter = "saturate(120%) blur(10px)";
      header.style.webkitBackdropFilter = "saturate(120%) blur(10px)";
    }
  }
  
  // Add viewport-fit=cover for notched devices
  const metaViewport = document.querySelector("meta[name=\"viewport\"]");
  if (metaViewport && !metaViewport.content.includes("viewport-fit=cover")) {
    metaViewport.content += ", viewport-fit=cover";
  }
  
  // Fix 100vh issue on iOS
  const fixHeight = () => {
    document.documentElement.style.setProperty("--real-height", `${window.innerHeight}px`);
  };
  window.addEventListener("resize", fixHeight);
  window.addEventListener("orientationchange", fixHeight);
  fixHeight();
}

// UI element references
const API_BASE = "/aggregate";
const qEl = document.getElementById("q");
const modeSel = document.getElementById("modeSel");
const freshSel = document.getElementById("freshSel");
const limitEl = document.getElementById("limit");
const durationEl = document.getElementById("duration");
const siteEl = document.getElementById("site");
const hostModeSel = document.getElementById("hostModeSel");
const durationModeSel = document.getElementById("durationModeSel");
const showThumbsEl = document.getElementById("showThumbs");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const debugEl = document.getElementById("debug");
const goBtn = document.getElementById("goBtn");
const copyBtn = document.getElementById("copyBtn");
const dbgBtn = document.getElementById("dbgBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const modeChips = document.getElementById("modeChips");
const errorContainer = document.getElementById("error-container");
const searchProgress = document.getElementById("search-progress");
const progressBar = document.getElementById("progress-bar");
const recentSearchesEl = document.getElementById("recent-searches");
const recentSearchesChips = document.getElementById("recent-searches-chips");

// Helper functions
function setStatus(s) { 
  statusEl.textContent = s;
}

function chipSync(mode) {
  [...modeChips.querySelectorAll(".chip")].forEach(c => {
    const isActive = c.dataset.mode === mode;
    c.classList.toggle("active", isActive);
    c.setAttribute("aria-checked", isActive.toString());
  });
  modeSel.value = mode;
}

function buildUrl() {
  const p = new URLSearchParams();
  p.set("q", qEl.value.trim());
  p.set("mode", modeSel.value || "niche");
  p.set("fresh", freshSel.value || "all");
  p.set("limit", Math.max(3, Math.min(20, parseInt(limitEl.value || "20", 10))));
  const dur = durationEl.value.trim(); if (dur) p.set("duration", dur);
  const site = siteEl.value.trim(); if (site) p.set("site", site);
  p.set("hostMode", hostModeSel.value || "normal");
  p.set("durationMode", durationModeSel.value || "normal");
  p.set("nocache", "1"); // always bypass cache for live tests
  p.set("reqId", crypto.randomUUID()); // Unique request ID
  return API_BASE + "?" + p.toString();
}

// Enhanced card rendering with lazy loading support
function cardHtml(item, showThumb) {
  const t = item.title || "clip";
  const site = item.site || "";
  const rt = item.runtime || "";
  const url = item.url || "#";
  const thumb = item.thumbnail || item.thumb || "";
  
  let html = "<div class=\"card\">";
  if (showThumb && thumb) {
    html += `<img class="thumb" data-src="${thumb}" alt="" loading="lazy">`;
  }
  html += `<div class="meta"><strong>Site:</strong> ${site} &nbsp;  &nbsp; <strong>Runtime:</strong> ${rt}</div>`;
  html += `<div><a class="link" href="${url}" target="_blank" rel="noopener noreferrer">View Content</a></div>`;
  html += "</div>";
  
  return html;
}

// Render loading skeletons for better perceived performance
function renderLoadingSkeleton(count = 3) {
  const html = Array(count).fill(`
    <div class="card skeleton">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-meta"></div>
      <div class="skeleton-link"></div>
    </div>
  `).join("");
  
  resultsEl.innerHTML = html;
}

// Enhanced result rendering with lazy loading
function render(items) {
  resultsEl.innerHTML = (items || []).map(it => cardHtml(it, showThumbsEl.checked)).join("");
  
  // Initialize lazy loading with Intersection Observer
  if ("IntersectionObserver" in window) {
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target;
          
          // Lazy load thumbnail if available
          const thumb = card.querySelector("img.thumb[data-src]");
          if (thumb) {
            thumb.src = thumb.dataset.src;
            thumb.removeAttribute("data-src");
          }
          
          // Add animation
          card.classList.add("visible");
          
          // Stop observing once loaded
          cardObserver.unobserve(card);
        }
      });
    }, {
      rootMargin: "100px 0px",
      threshold: 0.1
    });
    
    // Observe all cards
    document.querySelectorAll(".card").forEach(card => {
      cardObserver.observe(card);
    });
  }
}

// Persistence functions
function saveDefaults() {
  const obj = {
    fresh: freshSel.value,
    limit: limitEl.value,
    showThumbs: showThumbsEl.checked,
    mode: modeSel.value,
    hostMode: hostModeSel.value,
    durationMode: durationModeSel.value
  };
  try {
    localStorage.setItem("jack.defaults", JSON.stringify(obj));
  } catch (e) {
    console.error("Failed to save defaults:", e);
  }
}

function loadDefaults() {
  try {
    const s = localStorage.getItem("jack.defaults");
    if (!s) return;
    const d = JSON.parse(s);
    if (d.fresh) freshSel.value = d.fresh;
    if (d.limit) limitEl.value = d.limit;
    if (typeof d.showThumbs === "boolean") showThumbsEl.checked = d.showThumbs;
    if (d.mode) {
      modeSel.value = d.mode;
      chipSync(d.mode);
    }
    if (d.hostMode) hostModeSel.value = d.hostMode;
    if (d.durationMode) durationModeSel.value = d.durationMode;
  } catch (e) {
    console.error("Failed to load defaults:", e);
  }
}

// Recent searches management
function saveRecentSearch(query) {
  if (!query.trim()) return;
  
  try {
    const searches = JSON.parse(localStorage.getItem("jack.recent-searches") || "[]");
    
    // Remove if already exists
    const index = searches.indexOf(query);
    if (index !== -1) {
      searches.splice(index, 1);
    }
    
    // Add to beginning
    searches.unshift(query);
    
    // Keep only 5 most recent
    const updated = searches.slice(0, 5);
    
    localStorage.setItem("jack.recent-searches", JSON.stringify(updated));
    renderRecentSearches();
  } catch (e) {
    console.error("Failed to save recent search:", e);
  }
}

function renderRecentSearches() {
  try {
    const searches = JSON.parse(localStorage.getItem("jack.recent-searches") || "[]");
    
    if (searches.length === 0) {
      recentSearchesEl.style.display = "none";
      return;
    }
    
    recentSearchesEl.style.display = "block";
    recentSearchesChips.innerHTML = "";
    
    searches.forEach(search => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = search;
      chip.addEventListener("click", () => {
        qEl.value = search;
        document.getElementById("searchForm").dispatchEvent(new Event("submit"));
      });
      recentSearchesChips.appendChild(chip);
    });
  } catch (e) {
    console.error("Failed to load recent searches:", e);
  }
}

// Error handling
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.add("show");
  
  // Automatically hide after 5 seconds
  setTimeout(() => {
    errorContainer.classList.remove("show");
  }, 5000);
}

function clearError() {
  errorContainer.textContent = "";
  errorContainer.classList.remove("show");
}

// Progress bar
function startProgress() {
  searchProgress.classList.add("active");
  let progress = 0;
  const interval = setInterval(() => {
    progress += 5;
    progressBar.style.width = progress + "%";
    if (progress > 90) {
      clearInterval(interval);
    }
  }, 150);
  
  return interval;
}

function completeProgress(interval) {
  clearInterval(interval);
  progressBar.style.width = "100%";
  setTimeout(() => {
    searchProgress.classList.remove("active");
    progressBar.style.width = "0%";
  }, 500);
}

// Enhanced fetch with retry and error handling
async function fetchWithRetry(url, options = {}, retries = 2) {
  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store"
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 100)}`);
        }
        throw e;
      }
    }
    
    return response;
  } catch (error) {
    if (retries > 0 && (error.message.includes("timeout") || error.message.includes("network"))) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Toast notifications
function showToast(message, type = "") {
  // Remove any existing toasts
  document.querySelectorAll(".toast").forEach(t => t.remove());
  
  const toast = document.createElement("div");
  toast.className = `toast ${type ? `${type}-toast` : ""}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger reflow for animation
  toast.offsetHeight;
  
  toast.classList.add("show");
  
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Check for updates
function checkForUpdates() {
  showToast("Checking for updates...");
  
  fetch("/version.json?_=" + Date.now())
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.version !== "2.0.0") {
        showUpdateNotification(data.version);
      } else {
        showToast("You\"re running the latest version!");
      }
    })
    .catch(error => {
      console.error("Failed to check for updates:", error);
      showToast("Update check failed. Please try again later.");
    });
}

function showUpdateNotification(version) {
  const notification = document.createElement("div");
  notification.className = "update-notification";
  notification.innerHTML = `
    <div class="update-card">
      <h3>Update Available</h3>
      <p>Version ${version} is now available. You\"re currently on v2.0.0.</p>
      <div class="update-actions">
        <button id="updateNow" class="update-button">Update Now</button>
        <button id="updateLater" class="update-later">Later</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  document.getElementById("updateNow").addEventListener("click", () => {
    // Clear cache and reload
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
    
    // Clear caches
    if ("caches" in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      });
    }
    
    // Reload to get the latest version
    window.location.reload();
  });
  
  document.getElementById("updateLater").addEventListener("click", () => {
    notification.remove();
  });
}

// Offline support
class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.offlineContent = [];
    this.offlineMode = false;
    
    // Setup event listeners
    window.addEventListener("online", () => this.handleConnectivityChange(true));
    window.addEventListener("offline", () => this.handleConnectivityChange(false));
    
    // Initialize
    this.init();
  }
  
  async init() {
    try {
      // Load cached searches from localStorage
      const searches = localStorage.getItem("jack.offline-searches");
      if (searches) {
        this.offlineContent = JSON.parse(searches);
      }
      
      // Check if we\"re starting in offline mode
      if (!this.isOnline) {
        this.enableOfflineMode();
      }
    } catch (e) {
      console.error("Failed to initialize offline manager:", e);
    }
  }
  
  handleConnectivityChange(isOnline) {
    this.isOnline = isOnline;
    
    if (isOnline) {
      this.disableOfflineMode();
    } else {
      this.enableOfflineMode();
    }
  }
  
  enableOfflineMode() {
    this.offlineMode = true;
    document.body.classList.add("offline-mode");
    
    // Show offline notification
    this.showOfflineNotification();
    
    // Replace search with offline content
    this.displayOfflineContent();
  }
  
  disableOfflineMode() {
    this.offlineMode = false;
    document.body.classList.remove("offline-mode");
    
    // Show back online notification
    this.showOnlineNotification();
  }
  
  saveSearch(query, results) {
    if (!this.isOnline || !results || results.length === 0) return;
    
    try {
      // Load existing searches
      const searches = JSON.parse(localStorage.getItem("jack.offline-searches") || "[]");
      
      // Add new search
      searches.unshift({
        id: crypto.randomUUID(),
        query,
        results,
        timestamp: Date.now()
      });
      
      // Keep only 5 most recent
      const updated = searches.slice(0, 5);
      
      // Save back to localStorage
      localStorage.setItem("jack.offline-searches", JSON.stringify(updated));
      this.offlineContent = updated;
    } catch (e) {
      console.error("Failed to save search for offline use:", e);
    }
  }
  
  displayOfflineContent() {
    if (this.offlineContent.length === 0) {
      resultsEl.innerHTML = `
        <div class="offline-message" style="text-align:center;padding:20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 15px;display:block;color:var(--muted)">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          <h3>You\"re offline</h3>
          <p>No saved searches available. Connect to the internet to search for content.</p>
        </div>
      `;
      return;
    }
    
    // Display cached searches
    let html = `
      <div class="offline-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="min-width:24px">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        </svg>
        <span>You\"re offline. Showing saved searches.</span>
      </div>
    `;
    
    this.offlineContent.forEach(item => {
      html += `
        <div class="offline-search-item">
          <h3>Search: "${item.query}"</h3>
          <div class="offline-results-grid">
            ${item.results.slice(0, 6).map(result => cardHtml(result, showThumbsEl.checked)).join("")}
          </div>
          <div class="offline-timestamp">Saved ${this.formatTimestamp(item.timestamp)}</div>
        </div>
      `;
    });
    
    resultsEl.innerHTML = html;
    
    // Initialize lazy loading for offline content
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute("data-src");
            }
            observer.unobserve(img);
          }
        });
      });
      
      document.querySelectorAll("img[data-src]").forEach(img => {
        observer.observe(img);
      });
    }
  }
  
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }
  
  showOfflineNotification() {
    showToast("You are offline. Showing saved content.", "offline");
  }
  
  showOnlineNotification() {
    showToast("You\"re back online!", "online");
  }
}

// Initialize offline manager
const offlineManager = new OfflineManager();

// Add voice search if supported
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const voiceButton = document.createElement("button");
  voiceButton.type = "button";
  voiceButton.className = "voice-search";
  voiceButton.innerHTML = "";
  voiceButton.title = "Search by voice";
  voiceButton.setAttribute("aria-label", "Search by voice");
  
  qEl.parentNode.insertBefore(voiceButton, qEl.nextSibling);
  
  voiceButton.addEventListener("click", () => {
    // Create speech recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      voiceButton.classList.add("listening");
      voiceButton.innerHTML = "";
      showToast("Listening...");
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      qEl.value = transcript;
      // Trigger input event for UI updates
      qEl.dispatchEvent(new Event("input"));
      // Submit the form after a short delay
      setTimeout(() => {
        document.getElementById("searchForm").dispatchEvent(new Event("submit"));
      }, 500);
    };
    
    recognition.onend = () => {
      voiceButton.classList.remove("listening");
      voiceButton.innerHTML = "";
    };
    
    recognition.onerror = (event) => {
      voiceButton.classList.remove("listening");
      voiceButton.innerHTML = "";
      showToast("Voice recognition error: " + event.error);
    };
    
    recognition.start();
  });
}

// Add clear button to search input
const clearButton = document.createElement("button");
clearButton.type = "button";
clearButton.className = "search-clear";
clearButton.innerHTML = "";
clearButton.setAttribute("aria-label", "Clear search");
clearButton.style.display = "none";
qEl.parentNode.insertBefore(clearButton, qEl.nextSibling);

qEl.addEventListener("input", () => {
  clearButton.style.display = qEl.value ? "block" : "none";
});

clearButton.addEventListener("click", () => {
  qEl.value = "";
  clearButton.style.display = "none";
  qEl.focus();
});

// Add share button if Web Share API is available
if (navigator.share) {
  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "secondary";
  shareButton.innerHTML = "Share";
  shareButton.title = "Share results";
  
  const actionsContainer = document.querySelector(".actions");
  actionsContainer.appendChild(shareButton);
  
  shareButton.addEventListener("click", () => {
    const results = [...document.querySelectorAll(".card")].map(card => {
      const title = card.querySelector("div[style*=\"font-weight\"]").textContent.trim();
      const url = card.querySelector("a.link").href;
      return `${title} - ${url}`;
    }).join("\n\n");
    
    const searchQuery = qEl.value;
    
    navigator.share({
      title: `Jack Portal Results for "${searchQuery}"`,
      text: results,
      url: window.location.href
    }).catch(err => {
      console.error("Share failed:", err);
      showToast("Sharing failed");
    });
  });
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Load saved defaults
  loadDefaults();
  
  // Load recent searches
  renderRecentSearches();
  
  // Chip selection for search mode
  modeChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    chipSync(chip.dataset.mode);
  });
  
  // Support keyboard navigation for chips
  modeChips.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        chipSync(chip.dataset.mode);
      }
    });
  });
  
  // Debug toggle
  dbgBtn.addEventListener("click", () => debugEl.classList.toggle("show"));
  
  // Save defaults
  saveBtn.addEventListener("click", () => {
    saveDefaults();
    setStatus("defaults saved");
    showToast("Defaults saved");
    setTimeout(() => setStatus("idle"), 800);
  });
  
  // Reset form
  resetBtn.addEventListener("click", () => {
    qEl.value = "";
    durationEl.value = "";
    siteEl.value = "";
    freshSel.value = "all";
    limitEl.value = "20";
    showThumbsEl.checked = true;
    chipSync("niche");
    hostModeSel.value = "normal";
    durationModeSel.value = "normal";
    setStatus("reset");
    showToast("Form reset");
    setTimeout(() => setStatus("idle"), 800);
  });
  
  // Copy results
  copyBtn.addEventListener("click", async () => {
    const data = [...resultsEl.querySelectorAll(".card")].map(c => {
      const title = c.querySelector("div[style*=\"font-weight\"]").textContent.trim();
      const site = c.querySelector(".meta").textContent.replace(/\s+/g, " ").trim();
      const url = c.querySelector("a.link")?.href || "";
      return title + "  " + site + "  " + url;
    }).join("\n");
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(data);
        setStatus("copied");
        showToast("Results copied to clipboard");
      } else {
        const ta = document.createElement("textarea");
        ta.value = data;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setStatus("copied");
        showToast("Results copied to clipboard");
      }
    } catch (e) {
      console.error("Copy failed:", e);
      setStatus("copy failed");
      showToast("Copy failed");
    } finally {
      setTimeout(() => setStatus("idle"), 1200);
    }
  });
  
  // Check for updates button
  document.getElementById("checkUpdates").addEventListener("click", checkForUpdates);
  
  // Search form submission
  const searchForm = document.getElementById("searchForm");
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const query = qEl.value.trim();
    if (!query) {
      showError("Please enter a search query");
      setStatus("enter a query");
      return;
    }
    
    // Handle offline mode
    if (!navigator.onLine) {
      showError("You\"re offline. Connect to the internet to search.");
      return;
    }
    
    // Clear previous results and error messages
    clearError();
    goBtn.disabled = true;
    setStatus("loading");
    
    // Show loading skeletons
    renderLoadingSkeleton(parseInt(limitEl.value) > 6 ? 6 : parseInt(limitEl.value));
    
    // Show progress indicator
    const progressInterval = startProgress();
    
    try {
      // Execute search
      const response = await fetchWithRetry(buildUrl());
      const data = await response.json();
      
      // Save to recent searches
      saveRecentSearch(query);
      
      // Save for offline use
      offlineManager.saveSearch(query, data.results || []);
      
      // Render results
      render(data.results || []);
      
      // Show debug info if available
      if (data.diag) {
        debugEl.textContent = JSON.stringify(data.diag, null, 2);
      }
      
      setStatus("done (" + ((data.results || []).length) + ")");
    } catch (error) {
      console.error("Search error:", error);
      showError(error.message || "Search failed");
      setStatus("error");
      debugEl.textContent = String(error);
    } finally {
      goBtn.disabled = false;
      completeProgress(progressInterval);
    }
  });
});

// Register service worker for offline capability and PWA support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" })
    .then(registration => {
      console.log("Service worker registered successfully");
    })
    .catch(error => {
      console.error("Service worker registration failed:", error);
    });
}
