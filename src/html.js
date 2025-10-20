export const PORTAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Jack Portal</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0b0b0c">
  <meta name="description" content="Advanced content search interface">
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

    label{display:block;margin:8px 0 6px;color:var(--muted);font-size:13px}

    input[type="text"], input[type="number"], select{
      width:100%;padding:12px 12px;border-radius:10px;
      border:1px solid #23252b;background:var(--panel-2);
      color:var(--txt);outline:none;font-size: 16px;
      min-height: 44px;
    }

    button{
      appearance:none;border:0;border-radius:10px;background:var(--accent);
      color:#fff;padding:12px 16px;font-weight:600;cursor:pointer;
      min-height: 44px;
    }

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
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .card.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .meta{color:var(--muted);font-size:13px}

    a.link{color:#9cc4ff;text-decoration:none}
    a.link:hover{text-decoration:underline}

    .status{
      position:sticky;bottom:0;margin-top:18px;
      text-align:right;color:var(--muted);font-size:12px;
      padding-bottom: var(--safe-area-inset-bottom);
    }
  </style>
</head>
<body>
  <header role="banner">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h1>Jack Portal</h1>
      <button id="authBtn" style="background: var(--accent-2); padding: 8px 14px; font-size: 13px;">Login</button>
    </div>
  </header>
  <main id="main" role="main">
    <!-- Auth Modal -->
    <div id="authModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 100; padding: 20px;">
      <div style="background: var(--panel); max-width: 400px; margin: auto; margin-top: 80px; border-radius: var(--radius); padding: 24px; max-height: 80vh; overflow-y: auto;">
        <div class="title" style="margin-bottom: 20px;">Site Credentials</div>
        
        <!-- Auth Form -->
        <div id="authForm" style="display: none;">
          <label for="authSite">Site Domain (e.g., pornhub.com)</label>
          <input type="text" id="authSite" placeholder="pornhub.com" style="margin-bottom: 12px;">
          
          <label for="authUsername">Username/Email</label>
          <input type="text" id="authUsername" placeholder="your username" style="margin-bottom: 12px;">
          
          <label for="authPassword">Password</label>
          <input type="password" id="authPassword" placeholder="••••••••" style="margin-bottom: 20px;">
          
          <div style="display: grid; gap: 8px; grid-template-columns: 1fr 1fr; margin-bottom: 16px;">
            <button id="authSaveBtn" style="background: var(--ok);">Save Login</button>
            <button id="authCancelBtn" style="background: var(--muted);">Cancel</button>
          </div>
        </div>

        <!-- Saved Logins List -->
        <div id="loginsList" style="display: none;">
          <div style="margin-bottom: 16px;">
            <p style="color: var(--muted); font-size: 12px; margin: 0 0 12px;">Saved logins (auto-login when visiting):</p>
            <div id="savedLoginsList" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
          
          <div style="display: grid; gap: 8px; grid-template-columns: 1fr 1fr;">
            <button id="authNewBtn" style="background: var(--accent);">Add New Login</button>
            <button id="authCloseBtn" style="background: var(--muted);">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Proxy Status Modal -->
    <div id="proxyModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 100; padding: 20px;">
      <div style="background: var(--panel); max-width: 500px; margin: auto; margin-top: 80px; border-radius: var(--radius); padding: 24px; max-height: 80vh; overflow-y: auto;">
        <div class="title" style="margin-bottom: 20px;">Proxy Status</div>
        
        <div id="proxyStatsContent" style="display: flex; flex-direction: column; gap: 16px;">
          <p style="color: var(--muted); text-align: center;">Loading proxy statistics...</p>
        </div>
        
        <div style="margin-top: 20px; display: grid; gap: 8px; grid-template-columns: 1fr 1fr;">
          <button id="proxyRefreshBtn" style="background: var(--accent);">Refresh Stats</button>
          <button id="proxyCloseBtn" style="background: var(--muted);">Close</button>
        </div>
      </div>
    </div>

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
              <option value="normal">Normal</option>
              <option value="deep_niche">Deep Niche</option>
            </select>
          </div>
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
        </div>
        <div class="row">
          <div>
            <label for="limit">Results</label>
            <input type="number" id="limit" value="10" min="3" max="20" aria-label="Number of results">
          </div>
          <div>
            <label for="provider">Provider (optional)</label>
            <select id="provider" aria-label="Search provider">
              <option value="">All Providers</option>
              <option value="google">Google</option>
              <option value="brave">Brave</option>
              <option value="yandex">Yandex</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div>
            <label for="region">Region (optional - uses proxy)</label>
            <select id="region" aria-label="Proxy region">
              <option value="">Auto-detect</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="NL">Netherlands</option>
              <option value="BR">Brazil</option>
              <option value="AU">Australia</option>
              <option value="JP">Japan</option>
            </select>
          </div>
          <div>
            <label for="proxyType">Proxy Type</label>
            <select id="proxyType" aria-label="Proxy type">
              <option value="residential">Residential (slower, undetectable)</option>
              <option value="datacenter">Datacenter (faster, detectable)</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button type="submit" id="goBtn">Search</button>
          <button type="button" id="proxyStatusBtn" style="background: var(--muted); margin-left: 8px;">Proxy Status</button>
        </div>
      </form>
    </div>
    <div id="results" class="grid" aria-live="polite"></div>
    <div id="status" class="status">Ready</div>
  </main>

  <script>
    // ============== AUTH MANAGER SYSTEM ==============
    class SimpleAuthManager {
      constructor() {
        this.dbName = 'JackPortalAuthDB';
        this.storeName = 'credentials';
        this.db = null;
        this.initialized = false;
      }

      async init() {
        if (this.initialized) return;
        return new Promise((resolve) => {
          const request = indexedDB.open(this.dbName, 1);
          request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.storeName)) {
              db.createObjectStore(this.storeName, { keyPath: 'site' });
            }
          };
          request.onsuccess = () => {
            this.db = request.result;
            this.initialized = true;
            resolve();
          };
        });
      }

      // Simple XOR encryption (client-side only, no key management)
      encrypt(text, siteKey) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const keyBytes = encoder.encode(siteKey);
        const encrypted = [];
        for (let i = 0; i < data.length; i++) {
          encrypted.push(data[i] ^ keyBytes[i % keyBytes.length]);
        }
        return btoa(String.fromCharCode(...encrypted));
      }

      decrypt(encoded, siteKey) {
        try {
          const encrypted = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
          const keyBytes = new TextEncoder().encode(siteKey);
          const decrypted = [];
          for (let i = 0; i < encrypted.length; i++) {
            decrypted.push(encrypted[i] ^ keyBytes[i % keyBytes.length]);
          }
          return new TextDecoder().decode(new Uint8Array(decrypted));
        } catch {
          return null;
        }
      }

      async save(site, username, password) {
        await this.init();
        const encrypted = this.encrypt(JSON.stringify({ username, password }), site);
        const record = {
          site,
          encrypted,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        };
        return new Promise((resolve) => {
          const tx = this.db.transaction([this.storeName], 'readwrite');
          tx.objectStore(this.storeName).put(record);
          tx.oncomplete = () => resolve(true);
        });
      }

      async get(site) {
        await this.init();
        return new Promise((resolve) => {
          const tx = this.db.transaction([this.storeName], 'readonly');
          const request = tx.objectStore(this.storeName).get(site);
          request.onsuccess = () => {
            const record = request.result;
            if (!record || record.expiresAt < Date.now()) {
              resolve(null);
              return;
            }
            try {
              const decrypted = this.decrypt(record.encrypted, site);
              resolve(JSON.parse(decrypted));
            } catch {
              resolve(null);
            }
          };
        });
      }

      async list() {
        await this.init();
        return new Promise((resolve) => {
          const tx = this.db.transaction([this.storeName], 'readonly');
          const request = tx.objectStore(this.storeName).getAll();
          request.onsuccess = () => {
            const records = request.result.filter(r => r.expiresAt > Date.now());
            resolve(records.map(r => ({ site: r.site, expiresAt: r.expiresAt })));
          };
        });
      }

      async delete(site) {
        await this.init();
        return new Promise((resolve) => {
          const tx = this.db.transaction([this.storeName], 'readwrite');
          tx.objectStore(this.storeName).delete(site);
          tx.oncomplete = () => resolve(true);
        });
      }
    }

    const authManager = new SimpleAuthManager();

    // ============== UI ELEMENTS ==============
    const searchForm = document.getElementById('searchForm');
    const qInput = document.getElementById('q');
    const modeSel = document.getElementById('modeSel');
    const freshSel = document.getElementById('freshSel');
    const limitInput = document.getElementById('limit');
    const providerSel = document.getElementById('provider');
    const resultsDiv = document.getElementById('results');
    const statusDiv = document.getElementById('status');

    // Auth UI elements
    const authBtn = document.getElementById('authBtn');
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const loginsList = document.getElementById('loginsList');
    const authSite = document.getElementById('authSite');
    const authUsername = document.getElementById('authUsername');
    const authPassword = document.getElementById('authPassword');
    const authSaveBtn = document.getElementById('authSaveBtn');
    const authCancelBtn = document.getElementById('authCancelBtn');
    const authNewBtn = document.getElementById('authNewBtn');
    const authCloseBtn = document.getElementById('authCloseBtn');
    const savedLoginsList = document.getElementById('savedLoginsList');

    // ============== AUTH EVENT HANDLERS ==============
    authBtn.addEventListener('click', async () => {
      authModal.style.display = 'block';
      await refreshLoginsList();
    });

    authCloseBtn.addEventListener('click', () => {
      authModal.style.display = 'none';
    });

    authNewBtn.addEventListener('click', () => {
      authForm.style.display = 'block';
      loginsList.style.display = 'none';
      authSite.value = '';
      authUsername.value = '';
      authPassword.value = '';
      authSite.focus();
    });

    authCancelBtn.addEventListener('click', async () => {
      authForm.style.display = 'none';
      await refreshLoginsList();
    });

    authSaveBtn.addEventListener('click', async () => {
      const site = authSite.value.trim().toLowerCase();
      const username = authUsername.value.trim();
      const password = authPassword.value;

      if (!site || !username || !password) {
        alert('Please fill in all fields');
        return;
      }

      try {
        await authManager.save(site, username, password);
        alert(\`Saved login for \${site}\`);
        authForm.style.display = 'none';
        await refreshLoginsList();
      } catch (error) {
        alert('Failed to save credentials: ' + error.message);
      }
    });

    async function refreshLoginsList() {
      const sites = await authManager.list();
      
      if (sites.length === 0) {
        loginsList.style.display = 'none';
        authForm.style.display = 'block';
      } else {
        loginsList.style.display = 'block';
        authForm.style.display = 'none';

        savedLoginsList.innerHTML = sites.map(site => {
          const expiresIn = Math.max(0, Math.floor((site.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
          return \`
            <div style="background: var(--panel-2); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>\${site.site}</strong>
                <div style="font-size: 12px; color: var(--muted);">Expires in \${expiresIn}d</div>
              </div>
              <button onclick="deleteSiteLogin('\${site.site}')" style="background: var(--bad); padding: 6px 12px; font-size: 12px;">Delete</button>
            </div>
          \`;
        }).join('');
      }
    }

    window.deleteSiteLogin = async (site) => {
      if (!confirm(\`Delete login for \${site}?\`)) return;
      await authManager.delete(site);
      await refreshLoginsList();
    };

    // ============== SEARCH HANDLER ==============

    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const query = qInput.value.trim();
      if (!query) {
        alert('Please enter a search query');
        return;
      }

      statusDiv.textContent = 'Searching...';

      try {
        const params = new URLSearchParams({
          q: query,
          mode: modeSel.value,
          fresh: freshSel.value,
          limit: limitInput.value,
          provider: providerSel.value
        });

        const response = await fetch(\`/api/search?\${params}\`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Display results
        resultsDiv.innerHTML = (data.results || []).map(result => \`
          <div class="card visible">
            <div><strong>\${result.title}</strong></div>
            <div class="meta">Source: \${result.source} | Score: \${result.score}</div>
            <div>\${result.snippet}</div>
            <div>
              <a class="link" href="\${result.url}" target="_blank" rel="noopener" 
                 onclick="return handleResultClick('\${result.url}')">View Result</a>
            </div>
          </div>
        \`).join('');

        statusDiv.textContent = \`Found \${data.results?.length || 0} results\`;

      } catch (error) {
        console.error('Search error:', error);
        statusDiv.textContent = 'Search failed';
        resultsDiv.innerHTML = \`<div class="card visible" style="color: var(--bad)">Error: \${error.message}</div>\`;
      }
    });

    // ============== AUTO-LOGIN HANDLER ==============
    window.handleResultClick = async (url) => {
      try {
        // Extract domain from URL
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');

        // Check if we have saved credentials
        const creds = await authManager.get(domain);
        if (creds) {
          // Store in sessionStorage to share with opened window
          sessionStorage.setItem(\`auth_\${domain}\`, JSON.stringify(creds));
          console.log('Auto-login info prepared for ' + domain);
        }
      } catch (error) {
        console.error('Error preparing auto-login:', error);
      }

      // Allow normal link navigation
      return true;
    };

    // ============== PROXY HANDLING ==============
    const regionSel = document.getElementById('region');
    const proxyTypeSel = document.getElementById('proxyType');
    const proxyStatusBtn = document.getElementById('proxyStatusBtn');
    const proxyModal = document.getElementById('proxyModal');
    const proxyCloseBtn = document.getElementById('proxyCloseBtn');
    const proxyRefreshBtn = document.getElementById('proxyRefreshBtn');
    const proxyStatsContent = document.getElementById('proxyStatsContent');

    // Load region preference from localStorage
    window.addEventListener('load', () => {
      const savedRegion = localStorage.getItem('proxy_region') || '';
      const savedProxyType = localStorage.getItem('proxy_type') || 'residential';
      if (regionSel && savedRegion) regionSel.value = savedRegion;
      if (proxyTypeSel) proxyTypeSel.value = savedProxyType;
    });

    // Save region preference
    if (regionSel) {
      regionSel.addEventListener('change', () => {
        localStorage.setItem('proxy_region', regionSel.value);
        console.log('Region preference saved: ' + regionSel.value);
      });
    }

    if (proxyTypeSel) {
      proxyTypeSel.addEventListener('change', () => {
        localStorage.setItem('proxy_type', proxyTypeSel.value);
      });
    }

    // Proxy status button
    if (proxyStatusBtn) {
      proxyStatusBtn.addEventListener('click', async () => {
        proxyModal.style.display = 'block';
        await updateProxyStats();
      });
    }

    if (proxyCloseBtn) {
      proxyCloseBtn.addEventListener('click', () => {
        proxyModal.style.display = 'none';
      });
    }

    if (proxyRefreshBtn) {
      proxyRefreshBtn.addEventListener('click', async () => {
        await updateProxyStats();
      });
    }

    async function updateProxyStats() {
      try {
        const response = await fetch('/api/proxy-stats');
        const data = await response.json();

        if (data.stats) {
          const stats = data.stats;
          proxyStatsContent.innerHTML = Object.entries(stats)
            .map(([region, info]) => \`
              <div style="background: var(--panel-2); padding: 12px; border-radius: 8px;">
                <div style="font-weight: 600; margin-bottom: 6px;">\${region}</div>
                <div style="font-size: 12px; color: var(--muted);">
                  <div>Total Proxies: \${info.total}</div>
                  <div>Active: \${info.active}</div>
                  <div>Failed: \${info.failed}</div>
                  <div>Requests: \${info.requests}</div>
                </div>
              </div>
            \`).join('');
        } else {
          proxyStatsContent.innerHTML = '<p style="color: var(--muted);">Proxy service not configured</p>';
        }
      } catch (error) {
        proxyStatsContent.innerHTML = \`<p style="color: var(--bad);">Error loading stats: \${error.message}</p>\`;
      }
    }

    // Update search form to include region parameter
    const originalSearchFormHandler = searchForm.onsubmit;
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const query = qInput.value.trim();
      if (!query) {
        alert('Please enter a search query');
        return;
      }

      statusDiv.textContent = 'Searching...';

      try {
        const params = new URLSearchParams({
          q: query,
          mode: modeSel.value,
          fresh: freshSel.value,
          limit: limitInput.value,
          provider: providerSel.value,
          region: regionSel.value || '',
          proxyType: proxyTypeSel.value || 'residential'
        });

        const response = await fetch(\`/api/search?\${params}\`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Display results
        resultsDiv.innerHTML = (data.results || []).map(result => \`
          <div class="card visible">
            <div><strong>\${result.title}</strong></div>
            <div class="meta">Source: \${result.source} | Score: \${result.score}</div>
            <div>\${result.snippet}</div>
            <div>
              <a class="link" href="\${result.url}" target="_blank" rel="noopener" 
                 onclick="return handleResultClick('\${result.url}')">View Result</a>
            </div>
          </div>
        \`).join('');

        statusDiv.textContent = \`Found \${data.results?.length || 0} results\`;
        if (data.proxy) {
          statusDiv.textContent += \` (via \${data.proxy.region} \${data.proxy.type} proxy)\`;
        }

      } catch (error) {
        console.error('Search error:', error);
        statusDiv.textContent = 'Search failed';
        resultsDiv.innerHTML = \`<div class="card visible" style="color: var(--bad)">Error: \${error.message}</div>\`;
      }
    });

    // ============== SERVICE WORKER REGISTRATION ==============
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          console.log('Service Worker registered:', registration);
        }).catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
      });
    }
  </script>
</body>
</html>`;
