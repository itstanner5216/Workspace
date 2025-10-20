export const PORTAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Jack'D - Advanced Search Portal</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0b0b0c">
  <meta name="description" content="Advanced content search interface">
  <style>
    :root {
      --bg:#0b0b0c; --panel:#141416; --panel-2:#1a1b1e; --muted:#9aa0a6; --txt:#e9eaee;
      --accent:#c8102e; --accent-2:#b91c1c; --ok:#22c55e; --bad:#ef4444; --radius:14px;
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
      border-bottom:2px solid var(--accent);
      box-shadow:0 0 20px rgba(200,16,46,0.1);
    }

    h1{margin:0;font-size:20px;font-weight:650;color:var(--accent);text-shadow:0 0 10px rgba(200,16,46,0.3)}

    main{
      padding:16px;max-width:1100px;margin:0 auto;
      padding-left: max(16px, var(--safe-area-inset-left));
      padding-right: max(16px, var(--safe-area-inset-right));
    }

    .panel{background:var(--panel);border:1px solid #1f2024;border-top:2px solid var(--accent);border-radius:var(--radius);padding:16px;box-shadow:0 4px 12px rgba(200,16,46,0.08)}
    .title{font-weight:700;font-size:22px;margin:0 0 10px;color:var(--accent)}

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

    a.link{color:#ff6b6b;text-decoration:none}
    a.link:hover{text-decoration:underline}

    .collapsible-header{display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:12px 0;border-bottom:1px solid #2a2c31;margin-bottom:12px;user-select:none}
    .collapsible-header h3{margin:0;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent)}
    .collapsible-chevron{transition:transform 0.3s ease;color:var(--accent);font-weight:bold}
    .collapsible-header.collapsed .collapsible-chevron{transform:rotate(-90deg)}
    .collapsible-content{max-height:500px;overflow:hidden;transition:max-height 0.3s ease;opacity:1}
    .collapsible-content.collapsed{max-height:0;opacity:0}

    .status{
      position:sticky;bottom:0;margin-top:18px;
      text-align:right;color:var(--muted);font-size:12px;
      padding:12px;border-radius:8px;background:var(--panel);border:1px solid #2a2c31;
    }
    .status.ready{color:var(--accent);border-color:var(--accent)}
    .status.searching{color:var(--accent);border-color:var(--accent);animation:pulse 1.5s infinite}
    .status.done{color:var(--accent);border-color:var(--accent)}
    .status.error{color:var(--bad);border-color:var(--bad)}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}
  </style>
</head>
<body>
  <header role="banner">
    <h1>Jack'D</h1>
  </header>
  <main id="main" role="main">
    <div class="panel">
      <div class="title">Search</div>
      <form id="searchForm" role="search">
        <div class="search-form">
          <label for="q">Search Query</label>
          <input type="text" id="q" name="q" placeholder="Enter search terms..." aria-label="Search query">
        </div>

        <div class="collapsible-header">
          <h3>Advanced Filters</h3>
          <span class="collapsible-chevron">▼</span>
        </div>
        <div class="collapsible-content">
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
              <option value="adultmedia">AdultMedia</option>
            </select>
          </div>
        </div>
        </div>

        <div class="actions">
          <button type="submit" id="goBtn">Search</button>
        </div>
      </form>
    </div>
    <div id="resultsContainer" class="grid"></div>
    <div class="status ready" id="status">Ready</div>
  </main>

  <script>
    // Jack'D Advanced Search Interface with Collapsible Filters
    const searchForm = document.getElementById('searchForm');
    const qInput = document.getElementById('q');
    const modeSel = document.getElementById('modeSel');
    const freshSel = document.getElementById('freshSel');
    const limitInput = document.getElementById('limit');
    const providerSel = document.getElementById('provider');
    const resultsDiv = document.getElementById('resultsContainer');
    const statusDiv = document.getElementById('status');
    const collapsibleHeader = document.querySelector('.collapsible-header');
    const collapsibleContent = document.querySelector('.collapsible-content');
    const collapsibleChevron = document.querySelector('.collapsible-chevron');

    // Collapsible filters toggle
    if (collapsibleHeader) {
      collapsibleHeader.addEventListener('click', () => {
        collapsibleHeader.classList.toggle('collapsed');
        collapsibleContent.classList.toggle('collapsed');
        collapsibleChevron.classList.toggle('collapsed');
      });
    }

    // Status indicator state management
    function updateStatus(state) {
      statusDiv.className = 'status ' + state;
      const statusTexts = {
        ready: 'Ready to search',
        searching: 'Searching...',
        done: 'Search complete',
        error: 'Search failed'
      };
      statusDiv.textContent = statusTexts[state] || state;
    }

    // Initialize status to ready
    updateStatus('ready');

    // Form submission handler
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const query = qInput.value.trim();
      if (!query) {
        alert('Please enter a search query');
        return;
      }

      updateStatus('searching');

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

        // Display results - handle nested results structure
        const resultsList = data.results?.results || data.results || [];
        resultsDiv.innerHTML = resultsList.map(result => \`
          <div class="card visible">
            <div><strong>\${result.title || 'Untitled'}</strong></div>
            <div class="meta">Source: \${result.source || 'Unknown'} | Score: \${result.score || 'N/A'}</div>
            <div>\${result.snippet || result.description || 'No description available'}</div>
            <div><a class="link" href="\${result.url}" target="_blank" rel="noopener">View Result</a></div>
          </div>
        \`).join('');

        updateStatus('done');

      } catch (error) {
        console.error('Search error:', error);
        updateStatus('error');
        resultsDiv.innerHTML = \`<div class="card visible" style="color: var(--bad)">Error: \${error.message}</div>\`;
      }
    });
  </script>
</body>
</html>`;
