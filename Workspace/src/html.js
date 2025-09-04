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
        <div class="actions">
          <button type="submit" id="goBtn">Search</button>
        </div>
      </form>
    </div>
    <div id="results" class="grid" aria-live="polite"></div>
    <div id="status" class="status">Ready</div>
  </main>

  <script>
    // Basic client-side JavaScript for the search interface
    const searchForm = document.getElementById('searchForm');
    const qInput = document.getElementById('q');
    const modeSel = document.getElementById('modeSel');
    const freshSel = document.getElementById('freshSel');
    const limitInput = document.getElementById('limit');
    const providerSel = document.getElementById('provider');
    const resultsDiv = document.getElementById('results');
    const statusDiv = document.getElementById('status');

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
            <div><a class="link" href="\${result.url}" target="_blank" rel="noopener">View Result</a></div>
          </div>
        \`).join('');

        statusDiv.textContent = \`Found \${data.results?.length || 0} results\`;

      } catch (error) {
        console.error('Search error:', error);
        statusDiv.textContent = 'Search failed';
        resultsDiv.innerHTML = \`<div class="card visible" style="color: var(--bad)">Error: \${error.message}</div>\`;
      }
    });
  </script>
</body>
</html>`;
