var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/html.js
var PORTAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Jack Portal</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0b0b0c">
  <meta name="description" content="Advanced content search interface">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png">
  <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png">
  <style>
    :root {
      --bg:#0b0b0c; --panel:#141416; --panel-2:#1a1b1e; --muted:#9aa0a6; --txt:#e9eaee;
      --accent:#3b82f6; --accent-2:#2563eb; --ok:#22c55e; --bad:#ef4444; --radius:14px;
      --safe-area-inset-top: env(safe-area-inset-top, 0px);
      --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
      --safe-area-inset-left: env(safe-area-inset-left, 0px);
      --safe-area-inset-right: env(safe-area-inset-right, 0px);
    }
    
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;background:var(--bg);color:var(--txt);
      font:16px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
      padding-top: var(--safe-area-inset-top);
      padding-bottom: var(--safe-area-inset-bottom);
      padding-left: var(--safe-area-inset-left);
      padding-right: var(--safe-area-inset-right);
    }
    
    /* Accessibility - Skip Link */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--accent);
      color: white;
      padding: 8px;
      z-index: 100;
      transition: top 0.2s;
    }
    .skip-link:focus {
      top: 0;
    }
    
    header{
      position:sticky;top:0;z-index:5;
      background:#0f1012cc;backdrop-filter:saturate(120%) blur(6px);
      padding:calc(14px + var(--safe-area-inset-top)) 16px 14px;
      border-bottom:1px solid #1f2024;
    }
    
    h1{margin:0;font-size:20px;font-weight:650}
    
    main{
      padding:16px;max-width:1100px;margin:0 auto;
      padding-left: max(16px, var(--safe-area-inset-left));
      padding-right: max(16px, var(--safe-area-inset-right));
    }
    
    .panel{background:var(--panel);border:1px solid #1f2024;border-radius:var(--radius);padding:16px}
    .title{font-weight:700;font-size:22px;margin:0 0 10px}
    
    .row{display:grid;gap:16px;grid-template-columns:1fr 1fr}
    @media (max-width:720px){.row{grid-template-columns:1fr}}
    
    .row-2{display:grid;gap:12px;grid-template-columns:1fr 1fr}
    @media (max-width:720px){.row-2{grid-template-columns:1fr}}
    
    label{display:block;margin:8px 0 6px;color:var(--muted);font-size:13px}
    
    input[type="text"], input[type="number"], select{
      width:100%;padding:12px 12px;border-radius:10px;
      border:1px solid #23252b;background:var(--panel-2);
      color:var(--txt);outline:none;font-size: 16px;
      min-height: 44px;
    }
    
    input::placeholder{color:#6b7280}
    
    .search-form {
      position: relative;
    }
    
    .search-clear {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 16px;
      padding: 8px;
      cursor: pointer;
      display: none;
    }
    
    .voice-search {
      position: absolute;
      right: 46px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 18px;
      padding: 8px;
      cursor: pointer;
      z-index: 2;
    }
    
    .voice-search.listening {
      color: #ef4444;
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }
    
    .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
    
    .chip{
      padding:8px 12px;border-radius:999px;background:#1f2126;
      border:1px solid #262a31;color:#cfd3da;cursor:pointer;font-size:13px;
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      user-select: none;
    }
    
    .chip.active{background:#1f3b8a;border-color:#2147a8;color:#fff}
    
    .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    
    button{
      appearance:none;border:0;border-radius:10px;background:var(--accent);
      color:#fff;padding:12px 16px;font-weight:600;cursor:pointer;
      min-height: 44px;
    }
    
    button.secondary{background:#20242b;color:#d9dce3;border:1px solid #2a2e36}
    button.ghost{background:transparent;border:1px dashed #2f3540;color:#9aa0a6}
    
    .muted{color:var(--muted);font-size:13px}
    
    .grid{
      display:grid;gap:14px;
      grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
      margin-top:16px;
    }
    
    .card{
      background:var(--panel-2);border:1px solid #22252b;
      border-radius:12px;padding:12px;display:flex;
      flex-direction:column;gap:8px;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .card.visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    .card:active {
      transform: scale(0.98);
    }
    
    .thumb{
      width:100%;aspect-ratio:16/9;object-fit:cover;
      border-radius:8px;background:#0d0e11;
    }
    
    .meta{color:var(--muted);font-size:13px}
    
    a.link{color:#9cc4ff;text-decoration:none}
    a.link:hover{text-decoration:underline}
    
    .status{
      position:sticky;bottom:0;margin-top:18px;
      text-align:right;color:var(--muted);font-size:12px;
      padding-bottom: var(--safe-area-inset-bottom);
    }
    
    .debug{
      white-space:pre-wrap;background:#0f1115;
      border:1px solid #23262d;padding:10px;border-radius:10px;
      font-family:ui-monospace,Consolas,Menlo,monospace;font-size:12px;
      display:none;
    }
    
    .debug.show{display:block}
    
    /* iOS optimizations */
    @media (hover: hover) {
      .card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
      }
      
      button:hover {
        opacity: 0.9;
      }
    }

    /* Enhanced components */
    .search-indicators {
      margin-top: 15px;
      padding: 12px;
      background: var(--panel-2);
      border-radius: var(--radius);
      border: 1px solid #1f2024;
      display: none;
    }
    
    .search-indicators.active {
      display: block;
    }
    
    .progress {
      height: 4px;
      width: 100%;
      background: var(--panel-2);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .progress-bar {
      height: 100%;
      width: 0%;
      background: var(--accent);
      transition: width 0.3s ease;
    }
    
    .error-message {
      color: var(--bad);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 10px 14px;
      border-radius: 8px;
      margin: 10px 0;
      font-size: 14px;
      display: none;
    }
    
    .error-message.show {
      display: block;
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-2px, 0, 0); }
      40%, 60% { transform: translate3d(2px, 0, 0); }
    }
    
    .recent-searches {
      margin-top: 15px;
      display: none;
    }
    
    .recent-searches.show {
      display: block;
    }
    
    /* Loading skeletons */
    .skeleton {
      position: relative;
      overflow: hidden;
    }
    
    .skeleton::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      transform: translateX(-100%);
      background-image: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0,
        rgba(255, 255, 255, 0.05) 20,
        rgba(255, 255, 255, 0.1) 60,
        rgba(255, 255, 255, 0)
      );
      animation: shimmer 2s infinite;
    }
    
    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }
    
    .skeleton-thumb {
      width: 100%;
      aspect-ratio: 16/9;
      background: #1a1b1d;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    
    .skeleton-title {
      height: 20px;
      background: #1a1b1d;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .skeleton-meta {
      height: 14px;
      background: #1a1b1d;
      border-radius: 4px;
      margin-bottom: 8px;
      width: 70%;
    }
    
    .skeleton-link {
      height: 14px;
      background: #1a1b1d;
      border-radius: 4px;
      width: 40%;
    }

    /* Offline indicators */
    .offline-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(239, 68, 68, 0.1);
      color: var(--bad);
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 15px;
      font-size: 14px;
    }
    
    .offline-search-item {
      background: var(--panel);
      border-radius: var(--radius);
      padding: 15px;
      margin-bottom: 15px;
    }
    
    .offline-results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 10px;
      margin: 10px 0;
    }
    
    .offline-timestamp {
      font-size: 12px;
      color: var(--muted);
      text-align: right;
    }
    
    .toast {
      position: fixed;
      bottom: calc(20px + var(--safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 9999;
      opacity: 0;
      transition: transform 0.3s, opacity 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    
    .online-toast {
      background: rgba(34, 197, 94, 0.9);
    }
    
    .offline-toast {
      background: rgba(239, 68, 68, 0.9);
    }
    
    /* iOS-specific dark mode */
    @media (prefers-color-scheme: dark) {
      :root {
        color-scheme: dark;
        --bg: #000000;
        --panel: #1a1a1c;
        --panel-2: #2a2a2c;
        --muted: #8a8a91;
        --txt: #ffffff;
      }
      
      header {
        background: rgba(0, 0, 0, 0.8);
      }
      
      .card {
        background: var(--panel);
        border-color: #2a2a2e;
      }
    }
    
    /* iOS reduced transparency */
    @media (prefers-reduced-transparency: reduce) {
      header {
        background: var(--bg);
        backdrop-filter: none;
      }
    }
    
    /* Better mobile action buttons */
    @media (max-width: 480px) {
      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      button {
        width: 100%;
      }
    }
    
    /* Version info */
    .app-footer {
      padding: 15px;
      margin-top: 30px;
      text-align: center;
      border-top: 1px solid #1f2024;
      color: var(--muted);
      font-size: 12px;
    }
    
    .version-info {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }
    
    .update-check {
      background: transparent;
      border: none;
      color: var(--accent);
      font-size: 12px;
      padding: 4px 8px;
      cursor: pointer;
      min-height: auto;
    }
    
    /* Update notification */
    .update-notification {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .update-card {
      background: var(--panel);
      border-radius: var(--radius);
      padding: 20px;
      max-width: 400px;
      width: 100%;
    }
    
    .update-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    .update-button {
      flex: 1;
    }
    
    .update-later {
      flex: 1;
      background: transparent;
      border: 1px solid #2a2e36;
      color: var(--muted);
    }
    
    /* Dynamic Island spacing for iOS */
    .dynamic-island-spacer {
      height: 32px;
      width: 100%;
    }
    
    body.ios18 .has-dynamic-island {
      --dynamic-island-spacing: 32px;
    }
  </style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
  <header role="banner">
    <h1>Jack Portal</h1>
  </header>
  <main id="main" role="main">
    <div class="panel">
      <div class="title">Search</div>
      <form id="searchForm" role="search">
        <div class="search-form">
          <label for="q">Search Query</label>
          <input type="text" id="q" name="q" placeholder="Enter search terms..." aria-label="Search query">
        </div>
        <div class="row">
          <div>
            <label for="modeSel">Search Mode</label>
            <select id="modeSel" aria-label="Search mode">
              <option value="niche">Niche</option>
              <option value="keywords">Keywords</option>
              <option value="deep_niche">Deep Niche</option>
              <option value="forums">Forums</option>
              <option value="tumblrish">Tumblr-like</option>
            </select>
            <div id="modeChips" class="chips" role="radiogroup" aria-label="Search mode selection">
              <div class="chip active" data-mode="niche" role="radio" tabindex="0" aria-checked="true">Niche</div>
              <div class="chip" data-mode="keywords" role="radio" tabindex="0" aria-checked="false">Keywords</div>
              <div class="chip" data-mode="deep_niche" role="radio" tabindex="0" aria-checked="false">Deep Niche</div>
              <div class="chip" data-mode="forums" role="radio" tabindex="0" aria-checked="false">Forums</div>
              <div class="chip" data-mode="tumblrish" role="radio" tabindex="0" aria-checked="false">Tumblr-like</div>
            </div>
          </div>
          <div>
            <div class="row-2">
              <div>
                <label for="freshSel">Freshness</label>
                <select id="freshSel" aria-label="Content freshness">
                  <option value="d7">7 days</option>
                  <option value="m1">1 month</option>
                  <option value="m3">3 months</option>
                  <option value="y1">1 year</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div>
                <label for="limit">Results</label>
                <input type="number" id="limit" value="10" min="3" max="20" aria-label="Number of results">
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div>
            <label for="duration">Duration (optional)</label>
            <input type="text" id="duration" placeholder="e.g. 5-10m, <5m, 7:30..." aria-label="Content duration">
          </div>
          <div>
            <label for="site">Site (optional)</label>
            <input type="text" id="site" placeholder="e.g. example.com" aria-label="Limit to specific site">
          </div>
        </div>
        <div class="row">
          <div>
            <label for="hostModeSel">Host Mode</label>
            <select id="hostModeSel" aria-label="Host mode">
              <option value="normal">Normal</option>
              <option value="relaxed">Relaxed</option>
            </select>
          </div>
          <div>
            <label for="durationModeSel">Duration Mode</label>
            <select id="durationModeSel" aria-label="Duration mode">
              <option value="normal">Normal</option>
              <option value="lenient">Lenient</option>
            </select>
          </div>
        </div>
        <div>
          <label for="showThumbs">
            <input type="checkbox" id="showThumbs" checked> Show thumbnails
          </label>
        </div>
        <div id="error-container" class="error-message" aria-live="assertive"></div>
        <div id="search-progress" class="search-indicators">
          <div class="progress">
            <div id="progress-bar" class="progress-bar"></div>
          </div>
        </div>
        <div id="recent-searches" class="recent-searches">
          <label>Recent Searches</label>
          <div id="recent-searches-chips" class="chips"></div>
        </div>
        <div class="actions">
          <button type="submit" id="goBtn">Search</button>
          <button type="button" id="copyBtn" class="secondary">Copy Results</button>
          <button type="button" id="saveBtn" class="secondary">Save Defaults</button>
          <button type="button" id="resetBtn" class="secondary">Reset</button>
          <button type="button" id="dbgBtn" class="ghost">Debug</button>
        </div>
      </form>
    </div>
    <div id="results" class="grid" aria-live="polite"></div>
    <div id="status" class="status">idle</div>
    <div id="debug" class="debug"></div>
  </main>
  <footer class="app-footer">
    <div class="version-info">
      <span>Jack Portal v2.0.0 (2025-08-29)</span>
      <button id="checkUpdates" class="update-check">Check for updates</button>
    </div>
  </footer>
  <script type="module" src="../src/main.js"><\/script>
</body>
</html>`;

// src/lib/sources/google.js
var GoogleProvider = class {
  static {
    __name(this, "GoogleProvider");
  }
  constructor() {
    this.name = "Google";
    this.baseUrl = "https://www.googleapis.com/customsearch/v1";
  }
  async search(query, options, env) {
    const { limit = 10, fresh } = options;
    const params = new URLSearchParams({
      key: env.GOOGLE_API_KEY,
      cx: env.GOOGLE_CSE_ID,
      q: query,
      num: limit,
      dateRestrict: fresh,
      safe: options.safe ? "active" : "off"
    });
    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          "User-Agent": env.USER_AGENT || "Jack-Portal/2.0.0"
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 1e4)
      });
      if (!response.ok) {
        console.warn(`Google search failed: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return data.items?.map((item) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: "google",
        score: item.pagemap?.metatags?.[0]?.["og:score"] || 0,
        published_at: item.pagemap?.metatags?.[0]?.["article:published_time"] || null,
        thumbnail: item.pagemap?.cse_image?.[0]?.src || null,
        author: item.pagemap?.metatags?.[0]?.["article:author"] || null,
        extra: {
          displayLink: item.displayLink,
          kind: item.kind
        }
      })) || [];
    } catch (error) {
      console.warn("Google search error:", error.message);
      return [];
    }
  }
};

// src/lib/sources/brave.js
var BraveProvider = class {
  static {
    __name(this, "BraveProvider");
  }
  constructor() {
    this.name = "Brave";
    this.baseUrl = "https://api.search.brave.com/res/v1/web/search";
  }
  async search(query, options, env) {
    const { limit = 10, fresh } = options;
    const params = new URLSearchParams({
      q: query,
      count: limit,
      freshness: fresh,
      safe_search: options.safe ? "strict" : "off"
    });
    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          "X-Subscription-Token": env.BRAVE_API_KEY,
          "User-Agent": env.USER_AGENT || "Jack-Portal/2.0.0"
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 1e4)
      });
      if (!response.ok) {
        console.warn(`Brave search failed: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return data.web?.results?.map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.description,
        source: "brave",
        score: item.score || 0,
        published_at: item.age || null,
        thumbnail: item.thumbnail?.src || null,
        author: item.meta_url?.hostname || null,
        extra: {
          subtype: item.subtype,
          age: item.age
        }
      })) || [];
    } catch (error) {
      console.warn("Brave search error:", error.message);
      return [];
    }
  }
};

// src/lib/sources/yandex.js
var YandexProvider = class {
  static {
    __name(this, "YandexProvider");
  }
  constructor() {
    this.name = "Yandex";
    this.baseUrl = "https://yandex.com/search/xml";
  }
  async search(query, options, env) {
    const { limit = 10, fresh } = options;
    const params = new URLSearchParams({
      query,
      lr: "213",
      // Russia, adjust as needed
      l10n: "en",
      maxpassages: limit,
      page: 0,
      user: env.YANDEX_USER || "your-yandex-user",
      key: env.YANDEX_API_KEY
    });
    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          "User-Agent": env.USER_AGENT || "Jack-Portal/2.0.0"
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 1e4)
      });
      if (!response.ok) {
        console.warn(`Yandex search failed: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return data.response?.results?.grouping?.group?.map((item) => ({
        title: item.doc.title,
        url: item.doc.url,
        snippet: item.doc.passages?.passage?.[0]?.text || "",
        source: "yandex",
        score: item.doc.relevance || 0,
        published_at: item.doc.properties?.date || null,
        thumbnail: item.doc.properties?.img?.[0] || null,
        author: item.doc.properties?.author || null,
        extra: {
          mime: item.doc.mime,
          size: item.doc.size
        }
      })) || [];
    } catch (error) {
      console.warn("Yandex search error:", error.message);
      return [];
    }
  }
};

// src/lib/sources/adultmedia.js
var AdultMediaProvider = class {
  static {
    __name(this, "AdultMediaProvider");
  }
  constructor() {
    this.name = "AdultMedia";
    this.baseUrl = "https://adultdatalink.p.rapidapi.com";
  }
  async search(query, options, env) {
    const { limit = 10, fresh } = options;
    const params = new URLSearchParams({
      query,
      limit,
      safe: false
      // Adult content
    });
    try {
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          "X-RapidAPI-Key": env.ADULTMEDIA_API_KEY,
          "X-RapidAPI-Host": "adultdatalink.p.rapidapi.com",
          "User-Agent": env.USER_AGENT || "Jack-Portal/2.0.0"
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 1e4)
      });
      if (!response.ok) {
        console.warn(`AdultMedia search failed: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return data.results?.map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.description || "",
        source: "adultmedia",
        score: item.score || 0,
        published_at: item.published_at || null,
        thumbnail: item.thumbnail || null,
        author: item.author || null,
        extra: {
          category: item.category,
          tags: item.tags
        }
      })) || [];
    } catch (error) {
      console.warn("AdultMedia search error:", error.message);
      return [];
    }
  }
};

// src/lib/sources/reddit.js
var RedditProvider = class {
  static {
    __name(this, "RedditProvider");
  }
  constructor() {
    this.name = "Reddit";
    this.baseUrl = "https://www.reddit.com";
  }
  async search(query, options, env) {
    const { limit = 10, fresh, safeMode = true } = options;
    const subreddit = options.subreddit || "all";
    const sort = options.sort || "relevance";
    try {
      const response = await fetch(`${this.baseUrl}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=${sort}&limit=${limit}&restrict_sr=${subreddit !== "all"}`, {
        headers: {
          "User-Agent": env.USER_AGENT || "Jack-Portal/2.0.0"
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 1e4)
      });
      if (!response.ok) {
        console.warn(`Reddit search failed: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return data.data?.children?.map((post) => ({
        title: post.data.title,
        url: `https://reddit.com${post.data.permalink}`,
        snippet: post.data.selftext || post.data.url,
        source: "reddit",
        score: post.data.score || 0,
        published_at: new Date(post.data.created_utc * 1e3).toISOString(),
        thumbnail: post.data.thumbnail && post.data.thumbnail !== "self" ? post.data.thumbnail : null,
        author: post.data.author,
        extra: {
          subreddit: post.data.subreddit,
          num_comments: post.data.num_comments,
          ups: post.data.ups,
          nsfw: post.data.over_18
        }
      })).filter((item) => !safeMode || !item.extra.nsfw) || [];
    } catch (error) {
      console.warn("Reddit search error:", error.message);
      return [];
    }
  }
};

// src/lib/sources/site.js
var SiteProvider = class {
  static {
    __name(this, "SiteProvider");
  }
  constructor() {
    this.name = "Site";
    this.adapters = {
      "example.com": {
        searchUrl: "https://example.com/search?q={query}",
        resultSelector: ".result",
        titleSelector: ".title",
        urlSelector: "a",
        snippetSelector: ".snippet"
      }
      // Add more site adapters as needed
    };
  }
  async search(query, options, env) {
    const { limit = 10, site } = options;
    if (!site || !this.adapters[site]) {
      return [];
    }
    const adapter = this.adapters[site];
    const searchUrl = adapter.searchUrl.replace("{query}", encodeURIComponent(query));
    try {
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": env.USER_AGENT || "Jack-Portal/2.0.0"
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 1e4)
      });
      if (!response.ok) {
        console.warn(`Site search failed: ${response.status}`);
        return [];
      }
      const html = await response.text();
      const results = this.parseHtml(html, adapter, limit);
      return results.map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        source: "site",
        score: 0,
        published_at: null,
        thumbnail: null,
        author: null,
        extra: {
          site
        }
      }));
    } catch (error) {
      console.warn("Site search error:", error.message);
      return [];
    }
  }
  parseHtml(html, adapter, limit) {
    const results = [];
    const resultRegex = new RegExp(`${adapter.resultSelector}.*?${adapter.titleSelector}(.*?)</.*?${adapter.urlSelector} href="(.*?)".*?${adapter.snippetSelector}(.*?)</`, "gis");
    let match;
    while ((match = resultRegex.exec(html)) && results.length < limit) {
      results.push({
        title: match[1].trim(),
        url: match[2].trim(),
        snippet: match[3].trim()
      });
    }
    return results;
  }
};

// src/lib/sources/index.js
var providers = [
  new GoogleProvider(),
  new BraveProvider(),
  new YandexProvider(),
  new AdultMediaProvider(),
  new RedditProvider(),
  new SiteProvider()
];

// src/config/index.js
var getConfig = /* @__PURE__ */ __name((env) => ({
  // API Keys from env
  GOOGLE_API_KEY: env.GOOGLE_API_KEY,
  GOOGLE_CSE_ID: env.GOOGLE_CSE_ID,
  BRAVE_API_KEY: env.BRAVE_API_KEY,
  YANDEX_API_KEY: env.YANDEX_API_KEY,
  YANDEX_USER: env.YANDEX_USER,
  ADULTMEDIA_API_KEY: env.ADULTMEDIA_API_KEY,
  // Host lists
  ALLOWED_HOSTS: env.ALLOWED_HOSTS ? JSON.parse(env.ALLOWED_HOSTS) : [
    "www.google.com",
    "search.brave.com",
    "yandex.com",
    "adultdatalink.p.rapidapi.com",
    "reddit.com"
  ],
  BLOCKED_HOSTS: env.BLOCKED_HOSTS ? JSON.parse(env.BLOCKED_HOSTS) : [],
  // Search settings
  DEFAULT_LIMIT: parseInt(env.DEFAULT_LIMIT) || 10,
  MAX_LIMIT: parseInt(env.MAX_LIMIT) || 20,
  MIN_LIMIT: parseInt(env.MIN_LIMIT) || 3,
  // Cache settings
  CACHE_TTL: parseInt(env.CACHE_TTL) || 3600,
  // Feature flags
  FOLLOW_LINKS: env.FOLLOW_LINKS === "true",
  INCLUDE_REDDIT: env.INCLUDE_REDDIT === "true",
  // Other constants
  USER_AGENT: env.USER_AGENT || "Jack-Portal/2.0.0",
  FETCH_TIMEOUT_MS: parseInt(env.FETCH_TIMEOUT_MS) || 1e4
}), "getConfig");

// src/utils/index.js
function parseDuration(duration) {
  if (!duration) return null;
  const match = duration.match(/(\d+)([mhs])/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "s":
      return value * 1e3;
    case "m":
      return value * 60 * 1e3;
    case "h":
      return value * 60 * 60 * 1e3;
    default:
      return null;
  }
}
__name(parseDuration, "parseDuration");
function generateCacheKey(params) {
  return JSON.stringify(params);
}
__name(generateCacheKey, "generateCacheKey");

// src/lib/search-service.js
var SearchService = class {
  static {
    __name(this, "SearchService");
  }
  constructor(env) {
    this.providers = providers;
    this.config = getConfig(env);
    this.cache = /* @__PURE__ */ new Map();
    this.rateLimitCache = /* @__PURE__ */ new Map();
    this.env = env;
  }
  async search(params, env) {
    const { q, mode, fresh, limit = 10, duration, site, hostMode, durationMode, showThumbs, provider, safeMode = true } = params;
    if (!q) {
      throw new Error("Query is required");
    }
    const clientIP = this.getClientIP(params);
    if (!this.checkRateLimit(clientIP)) {
      throw new Error("Rate limit exceeded");
    }
    const cacheKey = generateCacheKey(params);
    if (!fresh && this.env.JACK_STORAGE) {
      const cached = await this.env.JACK_STORAGE.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    let results = [];
    if (provider) {
      const selectedProvider = this.providers.find((p) => p.name.toLowerCase() === provider.toLowerCase());
      if (!selectedProvider) {
        throw new Error(`Provider ${provider} not found`);
      }
      results = await selectedProvider.search(q, { limit, fresh, safeMode }, this.env);
    } else {
      const providerOrder = this.getProviderOrder(mode, safeMode);
      const searchPromises = providerOrder.map(async (provider2) => {
        try {
          const providerResults = await provider2.search(q, { limit: Math.ceil(limit / providerOrder.length), fresh, safeMode }, this.env);
          return providerResults;
        } catch (error) {
          console.warn(`${provider2.name} search error:`, error.message);
          return [];
        }
      });
      const allResults = await Promise.allSettled(searchPromises);
      results = allResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    }
    let filteredResults = this.filterResults(results, { duration, hostMode, durationMode, safeMode });
    const seen = /* @__PURE__ */ new Set();
    filteredResults = filteredResults.filter((result) => {
      const normalized = this.normalizeUrl(result.url);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
    filteredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    if (this.env.FOLLOW_LINKS && filteredResults.length > 0) {
      filteredResults = await this.enrichResults(filteredResults.slice(0, 5), this.env);
    }
    filteredResults = filteredResults.slice(0, limit);
    this.cache.set(cacheKey, filteredResults);
    setTimeout(() => this.cache.delete(cacheKey), this.config.CACHE_TTL * 1e3);
    if (this.env.JACK_STORAGE) {
      await this.env.JACK_STORAGE.put(cacheKey, JSON.stringify(filteredResults), { expirationTtl: this.config.CACHE_TTL });
    }
    return filteredResults;
  }
  getProviderOrder(mode, safeMode) {
    const baseOrder = [
      this.providers.find((p) => p.name === "Google"),
      this.providers.find((p) => p.name === "Brave"),
      this.providers.find((p) => p.name === "Yandex")
    ];
    if (!safeMode) {
      baseOrder.push(this.providers.find((p) => p.name === "AdultMedia"));
    }
    if (this.env.INCLUDE_REDDIT) {
      baseOrder.push(this.providers.find((p) => p.name === "Reddit"));
    }
    return baseOrder.filter(Boolean);
  }
  getClientIP(params) {
    return params.ip || "unknown";
  }
  checkRateLimit(clientIP) {
    const now = Date.now();
    const windowMs = 6e4;
    const maxRequests = 10;
    if (!this.rateLimitCache.has(clientIP)) {
      this.rateLimitCache.set(clientIP, []);
    }
    const requests = this.rateLimitCache.get(clientIP);
    requests.push(now);
    const validRequests = requests.filter((time) => now - time < windowMs);
    this.rateLimitCache.set(clientIP, validRequests);
    return validRequests.length <= maxRequests;
  }
  normalizeUrl(url) {
    try {
      const u = new URL(url);
      return u.host + u.pathname;
    } catch {
      return url;
    }
  }
  filterResults(results, { duration, hostMode, durationMode, safeMode }) {
    return results.filter((result) => {
      if (hostMode === "relaxed" && this.config.ALLOWED_HOSTS && !this.config.ALLOWED_HOSTS.some((host) => result.url.includes(host))) {
        return false;
      }
      if (hostMode === "strict" && this.config.BLOCKED_HOSTS && this.config.BLOCKED_HOSTS.some((host) => result.url.includes(host))) {
        return false;
      }
      if (duration) {
        const parsedDuration = parseDuration(duration);
        if (parsedDuration && result.duration > parsedDuration) {
          return false;
        }
      }
      if (safeMode && result.extra?.nsfw) {
        return false;
      }
      return true;
    });
  }
  async enrichResults(results, env) {
    return results.map((result) => ({
      ...result,
      enriched: true
    }));
  }
};

// src/handlers/aggregate.js
async function handleAggregate(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const mode = url.searchParams.get("mode") || "niche";
  const fresh = url.searchParams.get("fresh") || "d7";
  const limit = parseInt(url.searchParams.get("limit")) || 10;
  const duration = url.searchParams.get("duration");
  const site = url.searchParams.get("site");
  const hostMode = url.searchParams.get("hostMode") || "normal";
  const durationMode = url.searchParams.get("durationMode") || "normal";
  const showThumbs = url.searchParams.get("showThumbs") !== "false";
  const provider = url.searchParams.get("provider");
  const safeMode = url.searchParams.get("safeMode") !== "false";
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  try {
    const searchService = new SearchService(env);
    const results = await searchService.search({
      q,
      mode,
      fresh,
      limit,
      duration,
      site,
      hostMode,
      durationMode,
      showThumbs,
      provider,
      safeMode,
      ip
    }, env);
    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleAggregate, "handleAggregate");

// src/worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/search") {
      return handleAggregate(request, env);
    }
    return new Response(PORTAL_HTML, {
      headers: { "Content-Type": "text/html" }
    });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
