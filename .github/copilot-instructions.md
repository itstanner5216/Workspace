# Jack Portal - AI Coding Agent Instructions

> **Version 2.0** | Multi-provider search orchestration with intelligent fallback chains and quota management | Cloudflare Workers

## Project Context

**Jack Portal** is a serverless multi-provider search aggregator on Cloudflare Workers. It orchestrates 15+ API providers (Google, Brave, Serper, Yandex, adult content providers, scrapers) using a sophisticated **weighted slice-based architecture** with automatic provider fallback chains, KV-backed quota tracking, and circuit breaker health management.

**Core Goal:** Deliver high-quality aggregated search results by intelligently allocating requests across weighted provider slices, automatically falling back to alternate providers when quota exceeded or provider fails, and monthly quota enforcement.

**This is a concise reference guide. Detailed pitfalls, patterns, and full request lifecycle documentation is in `copilot-instructions.legacy.md`.**

## Architecture at a Glance

```
Request /api/search?q=test&mode=normal&limit=10
  ↓
Validate + Rate Limit + Check Cache
  ↓
[CACHE HIT] → Return cached result
  ↓
[CACHE MISS] → SearchService executes weighted slices in PARALLEL
  ├─ google_slice (50%): [google→serpapi→seznam→adapters→apify]
  ├─ qualityporn_xnxx_slice (20%): [qualityporn→xnxx→pornlinks→serphouse→...]
  ├─ pornhub_pureporn_slice (20%): [pornhub→pureporn→pornlinks→serphouse→...]
  └─ adapters_slice (10%): [adapters→apify]
  ↓
Deduplicate by URL + Cache for 48 hours
  ↓
Return combined results with metadata
```

**Deep Niche Mode** has different weightings (Serply 35%, adult 40%, adapters 25%, Google only as fallback).

## Critical Knowledge

### 1. Slices Execute Parallel; Providers Execute Sequentially

Each slice gets a quota (e.g., "need 5 results for google_slice"):
- Call first provider in chain (google)
- If it returns 5+ results → **STOP, don't call serpapi**
- If it returns <5 or fails → **continue to next provider (serpapi)**
- This maximizes throughput while preventing wasted API quota

All slices execute in `Promise.all()` → results combine at end.

### 2. Monthly-Only Quotas (Never Daily)

**Each provider has `monthlyCap` stored in PROVIDER_LEDGER KV:**
- Google: 3000/month
- Serper: 2500/month
- QualityPorn: 9000/month
- Apify: 1428/month
- etc.

**Before any API call:**
```javascript
if (state.monthlyUsed >= this.monthlyCap) {
  // Skip provider, chain continues to next
  return []
}
```

**After successful API call:**
```javascript
ledger.incrementMonthlyUsed('google')  // +1
```

Quotas reset on 1st of each calendar month (UTC). Why monthly-only? Matches API pricing, simpler than daily resets, allows burst usage.

### 3. Health State Machine (Circuit Breaker)

```
HEALTHY → (3 failures in 5 min window) → TEMP_FAIL (5-min cooldown)
TEMP_FAIL → (after 5 min) → HEALTHY (auto-retry)
    OR
TEMP_FAIL → (if continues failing) → UNHEALTHY (1-hour cooldown)
UNHEALTHY → (after 1 hour) → HEALTHY (auto-retry)
```

Ledger tracks rolling 5-minute window of failures. After 3 failures → TEMP_FAIL → provider skipped for 5 minutes.

### 4. Canonical Error Codes (Never UNKNOWN)

Every error MUST map to exactly one of these:

| Code | Condition | Action |
|------|-----------|--------|
| `BAD_PARAMS` | 400, 401, 403 auth issue | Skip, continue chain |
| `BAD_HOST` | 404 endpoint down | Skip, continue chain |
| `RATE_LIMIT` | 429 quota hit | Mark quota exceeded, skip |
| `UPSTREAM_ERROR` | 5xx or timeout | Record error, may trigger temp_fail |
| `NETWORK_ERROR` | Catch blocks/connection failed | Record error, continue chain |

**NO UNKNOWN ERRORS.** Map all responses to canonical codes before throwing.

## Provider Implementation (Required Pattern)

**Every provider class must:**

1. Define `constructor()` with `name`, `baseUrl`, `monthlyCap`, `ttl`, `batchSize`
2. Implement `async search(query, options, env)` method
3. Check monthly quota before making request
4. Use `RequestWrapper` or `fetch()` with proper error mapping
5. Always increment `ledger.incrementMonthlyUsed()` after successful API call
6. Call `normalizeResults()` to return consistent shape
7. Return `Array` (never null/undefined)

**Template:**
```javascript
export class ProviderName {
  constructor() {
    this.name = 'ProviderName'
    this.baseUrl = 'https://api.example.com'
    this.monthlyCap = 1000
    this.ttl = 24 * 60 * 60
    this.batchSize = 20
  }

  async search(query, options, env) {
    const apiKey = env.PROVIDER_API_KEY
    if (!apiKey) return []

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('provider')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('provider')
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    try {
      const params = new URLSearchParams({
        key: apiKey,
        q: query,
        num: Math.min(options.limit || 10, this.batchSize)
      })
      const response = await fetch(`${this.baseUrl}?${params}`)

      if (!response.ok) {
        if (response.status === 400) throw new Error('BAD_PARAMS')
        if (response.status === 429) throw new Error('RATE_LIMIT')
        if (response.status >= 500) throw new Error('UPSTREAM_ERROR')
        throw new Error('UPSTREAM_ERROR')
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('provider')
        ledger.incrementMonthlyUsed('provider')
      }

      console.log(`provider telemetry: items_returned=${data.results?.length || 0}`)
      return this.normalizeResults(data.results || [])

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) ledger.markQuotaExceeded('provider')
        else if (error.message.includes('UPSTREAM_ERROR')) ledger.recordError('provider', '5xx')
        else ledger.recordError('provider', '4xx')
      }
      throw error
    }
  }

  normalizeResults(results) {
    if (!Array.isArray(results)) return []
    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url?.startsWith('https://') ? item.url : '#',
      snippet: item.description || '',
      score: 0.5,
      published_at: item.date || null,
      author: item.author || null,
      thumbnail: item.thumb || null,
      extra: { provider: this.name, ...additionalFields }
    }))
  }
}
```

**Result Shape (MUST MATCH):**
```javascript
{
  title: string,          // Required
  url: string,            // Required, HTTPS only
  snippet: string,        // May be empty
  score: 0.5,             // Required, typically 0.5
  published_at: ISO8601 or null,  // Optional
  author: string or null, // Optional
  thumbnail: URL or null, // Optional
  extra: {                // Provider-specific data
    provider: 'name',
    ...
  }
}
```

## Request Patterns (4 Common Variants)

Choose based on the provider's API:

**Pattern 1: GET + Query Params** (Google, Brave)
```javascript
const params = new URLSearchParams({ q: query, key: apiKey, cx: cseId })
const response = await fetch(`${this.baseUrl}?${params}`)
```

**Pattern 2: POST + X-API-KEY Header** (Serper, modern REST APIs)
```javascript
const response = await fetch(this.baseUrl, {
  method: 'POST',
  headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ q: query, num: limit })
})
```

**Pattern 3: GET + Custom Header** (Brave, RapidAPI)
```javascript
const params = new URLSearchParams({ q: query, count: limit })
const response = await fetch(`${this.baseUrl}?${params}`, {
  headers: { 'X-Subscription-Token': apiKey }
})
```

**Pattern 4: POST + X-RapidAPI Headers** (RapidAPI-hosted providers)
```javascript
const response = await fetch(this.baseUrl, {
  method: 'POST',
  headers: {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'api.example.com',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ search: query, category: 'general' })
})
```

## Development Workflow

### Local Setup
```bash
npm install                    # Install dependencies
npm run dev                    # Start local worker (port 8787)
```

### Adding API Keys (.dev.vars)
```bash
# Create/update .dev.vars (gitignored)
GOOGLE_API_KEY=your_key
GOOGLE_CSE_ID=your_cse
BRAVE_API_KEY=your_key
# ... repeat for each provider
```

### Deployment
```bash
wrangler auth login            # Login to Cloudflare
wrangler deploy                # Deploy to production
wrangler secret put GOOGLE_API_KEY  # Store secrets securely
```

### Testing
```
# Test single provider
GET /api/provider-selftest?provider=google

# Test all providers
GET /api/provider-selftest-all?debug=true

# Debug search
GET /api/search?q=test&debug=true

# Check provider health
GET /api/diagnostics?debug=true
```

## Configuration (wrangler.toml Essentials)

```toml
name = "jack-portal"
main = "src/worker.js"

# Two REQUIRED KV namespaces
[[kv_namespaces]]
binding = "CACHE"               # 48-hour result caching
id = "6779e4f7493e4b6ca1c8e2ce5b2ebe39"

[[kv_namespaces]]
binding = "PROVIDER_LEDGER"     # Monthly quotas + health state
id = "d85c23fcfa9e4e42b6f8d18d28af551d"

[vars]
FETCH_TIMEOUT_MS = "10000"      # Per-request timeout
TEMP_FAIL_COOLDOWN_MS = "300000" # 5 min before retry after error
RETRY_MAX = "3"                 # Exponential backoff attempts
DEFAULT_LIMIT = "10"
MAX_LIMIT = "20"
MIN_LIMIT = "3"
LOG_LEVEL = "2"                 # 0=ERROR, 1=WARN, 2=INFO, 3=DEBUG

# Secrets set via: wrangler secret put GOOGLE_API_KEY
# DO NOT commit API keys to wrangler.toml
```

## File Structure Reference

```
src/
  worker.js                  # Request routing, CORS, logging context
  html.js                    # Portal UI HTML
  handlers/
    aggregate.js            # /api/search handler (cache, rate limit, SearchService)
    diagnostics.js          # /api/diagnostics (inspect cache, ledger state)
    health.js               # /health liveness probe
    provider-selftest.js    # /api/provider-selftest provider diagnostics
  lib/
    search-service.js       # Orchestrates weighted slices + fallback chains
    provider-ledger.js      # Monthly quota + health state machine in KV
    validation.js           # Input sanitization (query length, injection)
    response.js             # Response formatting, CORS, compression
    rate-limit.js           # IP-based rate limiting (10 req/min)
    request-wrapper.js      # Unified HTTP layer (retry, timeout, error map)
    logger.js               # Structured JSON logging
    robots-checker.js       # robots.txt compliance for scrapers
    adapter-registry.js     # Provider metadata registration
    sources/
      google.js             # Reference implementation
      brave.js, serper.js   # Other major providers
      qualityporn.js, xnxx.js, pornhub.js  # Adult providers
      apify.js              # Fallback transport layer
      index.js              # Exports all providers
```

## Critical Patterns (Do These)

1. **Always use ledger** - Pass `options.ledger` to providers, check quota before API call
2. **Normalize results** - All providers must return consistent shape with title, url, snippet, score, extra
3. **Map errors canonically** - Use only 5 canonical error codes, no UNKNOWN
4. **Increment quota tracking** - Even if API returns 0 results, call `ledger.incrementMonthlyUsed()`
5. **Validate inputs** - Always call `validateAllInputs()` before processing
6. **Log telemetry** - Add `console.log()` with item counts after each provider call
7. **Check HTTPS URLs** - Filter or convert to '#'; never return http:// or data: URLs

## Common Pitfalls (Don't Do These)

| Mistake | Why Bad | Fix |
|---------|---------|-----|
| Throw UNKNOWN error | Chain doesn't know how to handle | Map to BAD_PARAMS, RATE_LIMIT, UPSTREAM_ERROR, etc |
| Skip ledger.incrementMonthlyUsed() | Quota tracking breaks, provider appears to have quota | Always increment after API call |
| Check if result empty, then return | Prevents chain fallback | Return whatever you got, let SearchService decide |
| Add daily caps | Breaks architecture, complicates reset logic | Use monthly-only quotas |
| Hardcode API key | Exposes secret in logs/git | Read from env.PROVIDER_API_KEY |
| Skip validateAllInputs() | Query injection attacks possible | Always validate before processing |
| Return null/undefined | Causes crashes in map/filter | Always return Array, use [] for empty |
| Non-HTTPS URLs | Browser security, cache pollution | Filter or use '#' placeholder |

## Debugging Commands

```javascript
// View all cached searches
GET /api/diagnostics?cache=true

// Check specific provider quota/health
GET /api/diagnostics?provider=google

// Run provider self-test (health check)
GET /api/provider-selftest?provider=google

// Search with debug output (includes provider breakdown)
GET /api/search?q=test&debug=true

// System health probe
GET /health
```

## Key External References

- **Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
- **KV Namespace API:** https://developers.cloudflare.com/workers/runtime-apis/kv/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/

## Detailed Reference Guide

**This document covers essential patterns. For 50+ specific pitfalls, provider request patterns, rate limiting mechanics, KV query patterns, and CORS considerations, see `copilot-instructions.legacy.md` (1860 lines).**

Key sections in legacy guide:
- Provider Implementation Pattern (4 detailed request variants)
- Complete Error Handling Guide
- Rate Limiting & Quota System (Advanced)
- Provider Ledger State Transitions
- Full Request Lifecycle Diagrams
- Common Pitfalls (50+ examples with fixes)
- KV Query Patterns & Mistakes
- CORS & Security Considerations

## Important Notes

### Why This Architecture?

- **Weighted slices** → Maximize Google results (50%) while maintaining diversify content (adult 40%, adapters 10%)
- **Fallback chains** → When primary provider fails, automatically try secondary/tertiary providers  
- **Monthly quotas** → Matches API pricing cycles, simpler than daily resets
- **KV-backed ledger** → Distributed state across Cloudflare edge, survives worker restarts
- **Circuit breaker** → Prevent cascading failures; unhealthy providers skipped for cooldown period

### What NOT to Change

- Result shape (title, url, snippet, score, etc) - consumers depend on this format
- Slice weights in normal/deep_niche modes - affects search result distribution
- Monthly quota mechanics - integrated with provider agreements
- Canonical error codes - SearchService chain logic depends on these 5 codes

### Testing New Providers

1. Create `src/lib/sources/newprovider.js` with provider class
2. Export from `src/lib/sources/index.js`
3. Add to `SearchService.providers` object in `search-service.js`
4. Add to appropriate chain(s): `this.chains.normal` and/or `this.chains.deep_niche`
5. Set monthly cap: `this.ledger.setMonthlyCap('newprovider', 1000)`
6. Add API key to `.dev.vars` and `wrangler.toml`
7. Test with: `GET /api/provider-selftest?provider=newprovider`

---

**Last Updated:** October 2025  
**Maintained by:** Jack Portal Team  
**Questions?** Check `copilot-instructions.legacy.md` for detailed explanations

```javascript

