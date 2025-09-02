export const PORTAL_HTML = `<!DOCTYPE html>
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
  <script type="module" src="../src/main.js"></script>
</body>
</html>`;
