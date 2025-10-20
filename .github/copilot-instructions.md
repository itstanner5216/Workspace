# Jack Portal - AI Coding Guidelines

## Architecture Overview

**Cloudflare Worker** with KV-backed multi-provider search API. Core components:
- `src/worker.js` - Main request router with structured logging
- `src/handlers/` - Business logic handlers (aggregate, diagnostics, health)
- `src/lib/search-service.js` - Weighted provider orchestration with fallback chains
- `src/lib/sources/` - Individual provider implementations
- `src/lib/provider-ledger.js` - Circuit breaker and quota management

## Provider Implementation Pattern

**Every provider class** must follow this exact structure. Choose the appropriate request pattern:

### Pattern 1: POST with JSON + X-RapidAPI-Key (Most Common)
```javascript
// Examples: Pornhub, XNXX, QualityPorn, Pureporn
const response = await fetch(`${this.baseUrl}/search`, {
  method: 'POST',
  headers: {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'host.example.com',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ search: query, category: 'gay' }),
  cf: { cacheTtl: this.ttl, cacheEverything: true }
})
```

### Pattern 2: GET with Query Params + URL Keys
```javascript
// Example: Google Custom Search
const params = new URLSearchParams({
  key: apiKey,
  cx: cseId,
  q: query,
  num: Math.min(options.limit || 10, this.batchSize)
})
const response = await fetch(`${this.baseUrl}?${params}`)
```

### Pattern 3: POST with JSON + Custom Auth Header
```javascript
// Example: Serper.dev
const response = await fetch(this.baseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey
  },
  body: JSON.stringify({ q: query, num: limit })
})
```

### Pattern 4: GET with Query Params + Custom Header
```javascript
// Example: Brave Search
const params = new URLSearchParams({
  q: query,
  count: Math.min(options.limit || 10, this.batchSize)
})
const response = await fetch(`${this.baseUrl}?${params}`, {
  headers: {
    'Accept': 'application/json',
    'X-Subscription-Token': apiKey
  }
})
```

### Complete Provider Template
```javascript
export class ProviderName {
  constructor() {
    this.name = 'ProviderName'
    this.baseUrl = 'https://api.example.com'
    this.version = '1.0.0'
    this.monthlyCap = 1000  // Monthly-only quota (no daily caps)
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
      // Choose appropriate request pattern (see examples above)
      const response = await fetch(/* ... request config ... */)

      // Canonical error mapping - NO UNKNOWN errors
      if (!response.ok) {
        if (response.status === 400) throw new Error('BAD_PARAMS')
        if (response.status === 401 || response.status === 403) throw new Error('BAD_PARAMS')
        if (response.status === 404) throw new Error('BAD_HOST')
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('provider')
          throw new Error('RATE_LIMIT')
        }
        if (response.status >= 500) throw new Error('UPSTREAM_ERROR')
        throw new Error('UPSTREAM_ERROR') // Default for unknown codes
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('provider')
        ledger.incrementMonthlyUsed('provider')
      }

      // Add telemetry for max results detection
      console.log(`Provider telemetry: items_returned=${data.results?.length || 0}, pages_requested=1, server_pagination_hints=${data.totalPages || 'unknown'}`)

      return this.normalizeResults(data.results || data || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) ledger.markQuotaExceeded('provider')
        else if (error.message.includes('RATE_LIMIT')) ledger.markQuotaExceeded('provider')
        else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5')) {
          ledger.recordError('provider', '5xx')
        } else {
          ledger.recordError('provider', '4xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    if (!Array.isArray(results)) return []

    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || '#',
      snippet: item.description || '',
      published_at: item.published_at || null,
      author: item.author || null,
      thumbnail: item.thumbnail || null,
      score: 0.5,
      extra: { provider: 'provider', ...additionalFields }
    }))
  }
}
```

## Critical Patterns

### Error Handling
- **Only canonical codes**: `BAD_PARAMS`, `BAD_HOST`, `RATE_LIMIT`, `UPSTREAM_ERROR`, `NETWORK_ERROR`
- **Never throw UNKNOWN** - map all errors to canonical codes
- **403/401 = BAD_PARAMS** (API key issues, not auth errors)

### Quota Management
- **Monthly-only caps** - no daily limits
- **Hard enforcement**: Check `state.monthlyUsed >= this.monthlyCap`
- **Ledger integration**: Always pass `options.ledger` to providers

### Search Chains & Weighting (Critical Architecture)

**Two search modes with different provider allocation:**

#### Normal Mode (default)
```
Request for 10 results
        ↓
Slice weightings (total 10 results):
  • google_slice: 5 results (50%)     → [Google] → [SerpApi] → [Adapters/Scrapers] → [Apify]
  • qualityporn_xnxx_slice: 2 (20%)   → [QualityPorn] → [XNXX] → [Pornlinks] → [SerpHouse] → [A/S] → [Apify]
  • pornhub_pureporn_slice: 2 (20%)   → [Pornhub] → [Pureporn] → [Pornlinks] → [SerpHouse] → [A/S] → [Apify]
  • adapters_slice: 1 (10%)           → [Adapters] → [Apify]
        ↓
Parallel execution: Each slice calls its chain independently
        ↓
Combine + Deduplicate + Return top 10
```

#### Deep Niche Mode
```
Request for 10 results
        ↓
Slice weightings (total 10 results):
  • serply_slice: 3.5 (35%)           → [Serply] → [Serper] → [Brave] → [SerpHouse] → [Pornlinks] → [A/S] → [Apify]
  • qualityporn_xnxx_slice: 1.5 (15%) → [QualityPorn] → [XNXX] → [Pornlinks] → [SerpHouse] → [A/S] → [Apify]
  • pornhub_pureporn_slice: 2.5 (25%) → [Pornhub] → [Pureporn] → [Pornlinks] → [SerpHouse] → [A/S] → [Apify]
  • adapters_slice: 2.5 (25%)         → [Adapters] → [Apify]
        ↓
Parallel execution: Each slice calls its chain independently
        ↓
Combine + Deduplicate + Return top 10
```

**Key differences:**
- **Normal Mode**: Prioritizes Google (50%), balances adult content (40%)
- **Deep Niche**: Focuses on specialized sources (Serply, adult), less Google

#### Fallback Chain Execution (Within Each Slice)

When a provider fails, hits quota, or returns no results, chain continues:

```
Slice [QualityPorn → XNXX → Pornlinks → SerpHouse → Adapters/Scrapers → Apify]

Scenario 1: QualityPorn succeeds
  [QualityPorn: 2 results] ✓ → Chain stops (quota met for this slice)

Scenario 2: QualityPorn fails/quota exceeded, XNXX succeeds
  [QualityPorn: fails] → [XNXX: 2 results] ✓ → Chain stops

Scenario 3: QualityPorn + XNXX both fail, Pornlinks succeeds
  [QualityPorn: fails] → [XNXX: fails] → [Pornlinks: 2 results] ✓ → Chain stops

Scenario 4: All adult providers fail, SerpHouse fills gap
  [QualityPorn: fails] → [XNXX: fails] → [Pornlinks: fails] → [SerpHouse: 2 results] ✓

Scenario 5: All fail, final fallback fills gap
  [QualityPorn: fails] → ... → [SerpHouse: fails] → [Adapters/Scrapers: 1 result] → [Apify: 1 result] ✓
```

#### Universal Fallback Chain (for ANY slice exhaustion)

When all slices fail or return insufficient results, this order applies globally:

```
Primary Fallback Order:
  1. Pornlinks       (1000/month cap)
  2. SerpHouse       (400/month cap, also in chains)
  3. Adapters/Scrapers (no cap)
  4. Apify           (1428/month, last resort transport)
```

**Example execution:**
```
User requests 10 results, all weighted slices fail:
  1. Try Pornlinks with remaining quota
  2. If Pornlinks exhausted, try SerpHouse
  3. If SerpHouse exhausted, use Adapters/Scrapers (unlimited)
  4. If all fail, use Apify as final transport layer
  5. If all exhausted, return whatever results accumulated + error diagnostics
```

#### Implementation in `SearchService`

```javascript
// src/lib/search-service.js - How it works internally

this.chains = {
  normal: {
    google_slice: ['google', 'serpapi', 'adapters_scrapers_parallel', 'apify'],
    qualityporn_xnxx_slice: ['qualityporn', 'xnxx', 'pornlinks', 'serphouse', 'adapters_scrapers_parallel', 'apify'],
    pornhub_pureporn_slice: ['pornhub', 'pureporn', 'pornlinks', 'serphouse', 'adapters_scrapers_parallel', 'apify'],
    adapters_slice: ['adapters_parallel', 'apify'],
    scrapers_slice: ['scrapers_parallel', 'apify']
  },
  deep_niche: {
    serply_slice: ['serply', 'serper', 'brave', 'serphouse', 'pornlinks', 'adapters_scrapers_parallel', 'apify'],
    qualityporn_xnxx_slice: ['qualityporn', 'xnxx', 'pornlinks', 'serphouse', 'adapters_scrapers_parallel', 'apify'],
    pornhub_pureporn_slice: ['pornhub', 'pureporn', 'pornlinks', 'serphouse', 'adapters_scrapers_parallel', 'apify'],
    adapters_slice: ['adapters_parallel', 'apify'],
    scrapers_slice: ['scrapers_parallel', 'apify']
  }
}

this.sliceWeights = {
  normal: {
    google_slice: 0.50,
    qualityporn_xnxx_slice: 0.20,
    pornhub_pureporn_slice: 0.20,
    adapters_slice: 0.10
  },
  deep_niche: {
    serply_slice: 0.35,
    qualityporn_xnxx_slice: 0.15,
    pornhub_pureporn_slice: 0.25,
    adapters_slice: 0.25
  }
}

// When search executes:
// 1. Calculate quota for each slice (e.g., 10 results * 0.50 = 5 for google_slice)
// 2. Execute each slice's chain in parallel
// 3. For each slice: iterate through chain until quota filled or all fail
// 4. Combine results + deduplicate + return
```

#### When Would Fallback Chain Be Used?

**Scenario A: QualityPorn hits quota mid-day**
```
Request: 10 results
  qualityporn_xnxx_slice needs 2 results
  → QualityPorn: quota exceeded, skip
  → XNXX: 1 result (only 1 available)
  → Pornlinks: provides missing 1 result ✓
  → Done (fallback succeeded in same slice)
```

**Scenario B: All adult providers exhausted, SerpHouse saves search**
```
Request: 10 results
  pornhub_pureporn_slice needs 2 results
  → Pornhub: 403 auth error
  → Pureporn: 429 rate limited
  → Pornlinks: quota exceeded
  → SerpHouse: 2 results ✓
  → Done (universal fallback within slice)
```

**Scenario C: Entire normal mode fails (catastrophic)**
```
Request: 10 results (normal mode)
  google_slice: all fail (Google down, SerpApi down)
  qualityporn_xnxx_slice: all fail (RapidAPI network error)
  pornhub_pureporn_slice: all fail (quota exceeded)
  adapters_slice: all fail (adapter timeout)
  
  → Activate universal fallback:
    → Pornlinks: 3 results
    → SerpHouse: 2 results
    → Adapters/Scrapers: 3 results
    → Apify: 2 results
    → Return 10 combined + diagnostics showing "degraded_mode: true"
```

#### How Execution Actually Works: `executeSlice()`

```javascript
// src/lib/search-service.js

async executeSlice(sliceName, query, options) {
  const { limit, debug } = options
  const chain = this.chains[options.mode][sliceName]  // Get provider chain for this slice
  const results = []
  let delivered = 0

  // Iterate through chain: google → serpapi → adapters_scrapers_parallel → apify
  for (const providerName of chain) {
    if (delivered >= limit) break  // ← STOP when slice quota filled

    try {
      // Execute one provider from the chain
      const providerResults = await this.executeProviderInChain(providerName, query, {
        ...options,
        limit: limit - delivered  // ← Tell provider how many more we need
      })

      if (providerResults.length > 0) {
        results.push(...providerResults)
        delivered += providerResults.length
        // Continue chain loop even if provider succeeded (might need more results)
        // unless we've hit our quota
      }
      // If provider returned 0 results, continue to next in chain (fallback)

    } catch (error) {
      // Provider errored (auth fail, quota exceeded, network error)
      // Log and continue to NEXT provider in chain
      chainLog.push({
        provider: providerName,
        status: 'error',
        error: error.message
      })
      // Continue loop → fallback automatically triggers
    }
  }

  return { slice: sliceName, results, delivered }
}

// EXECUTION TRACE: qualityporn_xnxx_slice needs 2 results

// Iteration 1: qualityporn
//   → executeProviderInChain('qualityporn', query, { limit: 2 })
//   → Returns 2 results ✓
//   delivered = 2
//   if (2 >= 2) break  ← STOP, quota filled, don't call XNXX

// EXECUTION TRACE: When qualityporn fails

// Iteration 1: qualityporn
//   → executeProviderInChain('qualityporn', ...) throws Error('QUOTA_EXCEEDED_MONTHLY')
//   → Catch block: log error, continue
//   delivered = 0

// Iteration 2: xnxx
//   → executeProviderInChain('xnxx', query, { limit: 2 })
//   → Returns 1 result (only available)
//   delivered = 1
//   if (1 >= 2) continue to next

// Iteration 3: pornlinks
//   → executeProviderInChain('pornlinks', query, { limit: 1 })
//   → Returns 1 result ✓
//   delivered = 2
//   if (2 >= 2) break  ← STOP, quota filled
```

#### How Each Provider Is Executed: `executeProviderInChain()`

```javascript
// src/lib/search-service.js

async executeProviderInChain(providerName, query, options) {
  // 1. Check if provider is "healthy" (not temporarily failed)
  if (!this.ledger.isProviderHealthy(providerName)) {
    return []  // Skip unhealthy providers (circuit breaker)
  }

  // 2. Check monthly quota
  const state = this.ledger.getProviderState(providerName)
  if (state.monthlyCap && state.monthlyUsed >= state.monthlyCap) {
    return []  // Skip providers that hit monthly limit
  }

  // 3. Get provider instance and execute search
  const provider = this.providers[providerName]
  if (!provider) return []

  try {
    // CRITICAL: Pass ledger so provider can track usage
    const results = await provider.search(
      query,
      { ...options, ledger: this.ledger },  // ← Ledger passed here
      this.env
    )

    // 4. Record usage in ledger
    this.ledger.incrementMonthlyUsed(providerName)
    this.ledger.recordSuccess(providerName)

    // 5. Add source metadata and return
    return results.map(result => ({
      ...result,
      source: providerName
    }))

  } catch (error) {
    // 6. Handle provider errors
    this.handleProviderError(providerName, error)
    return []  // Return empty, chain will try next provider
  }
}

// EXECUTION TRACE: google provider

// Step 1: isProviderHealthy('google')
//   → Check ledger: "google_temp_fail_until" timestamp
//   → If past timestamp, healthy = true, continue
//   → If still in cooldown, return [] (skip)

// Step 2: Check quota
//   getProviderState('google') returns {
//     monthlyCap: 3000,
//     monthlyUsed: 2998,
//     ...
//   }
//   → 2998 >= 3000? false, continue

// Step 3: Execute
//   await GoogleProvider.search('cloudflare', { ledger, limit: 5 }, env)
//   → Makes API request to googleapis.com
//   → Returns 5 results

// Step 4: Record usage
//   ledger.incrementMonthlyUsed('google')  → 2998 → 2999

// Step 5: Map and return
//   Results: [
//     { title: '...', url: '...', source: 'google' },
//     { title: '...', url: '...', source: 'google' },
//     ...
//   ]

// EXECUTION TRACE: When google hits quota

// Step 3: Execute
//   await GoogleProvider.search(...)
//   → Response status: 403 (quota exceeded from API)
//   → Provider throws: Error('BAD_PARAMS')

// Step 6: Handle error
//   error.message = 'BAD_PARAMS'
//   → handleProviderError('google', error)
//   → ledger.recordError('google', '4xx')
//   → Ledger marks google unhealthy for 5 minutes
//   → Return []  (fallback triggers, chain continues)
```

#### Full Request Flow with Execution Order

```
User GET /api/search?q=cloudflare&limit=10&mode=normal
          ↓
    worker.js fetch()
          ↓
    validateAllInputs()  ← Check query length, mode valid, etc
          ↓
    handleAggregate()
          ↓
    Check cache for key: "search:cloudflare:normal:all:10:all:false:false"
          ↓
    [CACHE MISS] → Execute SearchService
          ↓
    SearchService.search({ query: 'cloudflare', limit: 10, mode: 'normal' })
          ↓
    Calculate slice quotas:
      google_slice: 5 results (50%)
      qualityporn_xnxx_slice: 2 (20%)
      pornhub_pureporn_slice: 2 (20%)
      adapters_slice: 1 (10%)
          ↓
    Execute ALL slices in PARALLEL (Promise.all):
    
    ┌─ google_slice ─────────────────────────────────┐
    │ executeSlice('google_slice', 'cloudflare', 5)  │
    │   ├─ google.search() → 4 results               │
    │   └─ return [4 results]                        │
    │                                                │
    ├─ qualityporn_xnxx_slice ──────────────────────┤
    │ executeSlice('qualityporn_xnxx_slice', 'cloudflare', 2)
    │   ├─ qualityporn.search() → RATE_LIMIT (429)   │
    │   ├─ xnxx.search() → 1 result                  │
    │   ├─ pornlinks.search() → 1 result             │
    │   └─ return [2 results]                        │
    │                                                │
    ├─ pornhub_pureporn_slice ──────────────────────┤
    │ executeSlice('pornhub_pureporn_slice', ...)   │
    │   ├─ pornhub.search() → 2 results              │
    │   └─ return [2 results] (quota met)            │
    │                                                │
    └─ adapters_slice ──────────────────────────────┘
      executeSlice('adapters_slice', ..., 1)
        ├─ adapters.search() → 1 result
        └─ return [1 result]
    
    [All slices complete]
          ↓
    Combine results: 4 + 2 + 2 + 1 = 9 results
          ↓
    Deduplicate (remove duplicate URLs): 9 → 8 unique
          ↓
    Slice to limit: first 10 (only 8 available)
          ↓
    Cache result for 48 hours
          ↓
    Return to user:
    {
      results: [
        { title, url, snippet, source: 'google' },
        { title, url, snippet, source: 'xnxx' },
        { title, url, snippet, source: 'pornlinks' },
        { title, url, snippet, source: 'pornhub' },
        { title, url, snippet, source: 'pureporn' },
        { title, url, snippet, source: 'adapters' },
        ...
      ],
      totalUnique: 8,
      dedupedCount: 1,
      requestId: '...'
    }
```

### Environment & Configuration
- **`.dev.vars`** for local development (gitignored)
- **`wrangler.toml`** for production secrets
- **KV namespaces**: `CACHE` and `PROVIDER_LEDGER` required
- **API keys**: `PROVIDER_API_KEY` pattern in env

### Request Flow
1. `worker.js` → Route to handler
2. Handler → `validateAllInputs()` → `SearchService`
3. SearchService → Calculate quotas → Execute slices in parallel
4. Each slice → Provider chain with fallbacks
5. Results → Deduplicate → Cache → Response

### Important Patterns Not Yet Covered

#### 1. Request Wrapper Pattern (Always Use This)
Every provider should use `RequestWrapper` for HTTP calls, not raw `fetch()`. This provides:
- Automatic retry logic with exponential backoff
- Timeout handling (configurable via `FETCH_TIMEOUT_MS`)
- Ledger integration for error tracking
- Header redaction for logs (keeps API keys safe)

```javascript
// BAD: Raw fetch without retry or timeout
const response = await fetch(url, { headers: { 'X-API-KEY': apiKey } })

// GOOD: Use RequestWrapper
import { RequestWrapper } from '../lib/request-wrapper.js'
const wrapper = new RequestWrapper(env, options.ledger)
const response = await wrapper.request('provider-name', {
  url: `${this.baseUrl}/search`,
  method: 'POST',
  headers: { 'X-API-KEY': apiKey },
  body: JSON.stringify({ q: query }),
  timeoutMs: 8000,
  retries: 3
})
```

#### 2. Robots.txt Compliance Pattern
Use `RobotsChecker` for domains that need ethical scraping (adapters, scrapers):

```javascript
// src/lib/sources/adapters.js example
import { RobotsChecker } from '../robots-checker.js'

export class AdaptersProvider {
  constructor() {
    this.robotsChecker = null
  }

  async search(query, options, env) {
    // Initialize robots checker for domain
    if (!this.robotsChecker) {
      this.robotsChecker = new RobotsChecker('example.com')
    }

    // Check if we're allowed to scrape
    if (!this.robotsChecker.isAllowed('/search')) {
      console.log('Domain robots.txt disallows /search path')
      return []
    }

    // Proceed with request...
  }
}
```

#### 3. Adapter Registry Pattern
Provider metadata should be registered for discovery and lifecycle management:

```javascript
// In AdapterRegistry
registry.register({
  name: 'GoogleProvider',
  version: '1.0.0',
  type: 'api',
  searchFn: GoogleProvider.search,
  supportsFreshness: 'ISO8601',  // or 'none', 'epochs', etc
  defaultWeightByMode: {
    normal: 0.50,
    deep_niche: 0.0
  },
  priority: 100,  // Higher = preferred fallback
  cooldowns: {
    temp_fail: 300000,  // 5 minutes
    unhealthy: 3600000  // 1 hour
  }
})
```

#### 4. Structured Logging Pattern
Use `logger.js` with log levels instead of console.log:

```javascript
// BAD: Raw console.log
console.log('Google returned 5 results')
console.error('Google failed')

// GOOD: Structured logging with levels
import { logInfo, logDebug, logError, logWarn } from '../lib/logger.js'

logInfo('search.provider', {
  provider: 'google',
  items_returned: 5,
  query: query,
  request_id: requestId
})

logError('search.provider_error', {
  provider: 'google',
  error_code: 'RATE_LIMIT',
  status: 429,
  request_id: requestId
})

// Log levels controlled by env.LOG_LEVEL (0=ERROR, 1=WARN, 2=INFO, 3=DEBUG)
```

#### 5. Response Utilities Pattern
Use provided response helpers instead of manual Response construction:

```javascript
// BAD: Raw Response construction
return new Response(JSON.stringify(results), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
})

// GOOD: Use response utilities
import { createSuccessResponse, createErrorResponse, createCORSResponse } from '../lib/response.js'

// Success response with caching headers
return createSuccessResponse(results, {
  cache: true,
  cacheSeconds: 172800,  // 48 hours
  requestId: 'req-123',
  origin: request.headers.get('origin')
})

// Error response with proper status codes
return createErrorResponse('Invalid query', 400, {
  code: 'INVALID_INPUT',
  details: validation.errors,
  type: 'ValidationError'
})
```

#### 6. Safe Header Pattern (Security)
Never include raw API keys in logs or responses:

```javascript
// src/lib/request-wrapper.js uses header redaction
const safeHeaders = this._redactHeaders(requestHeaders)
// Turns X-API-KEY: abc123xyz into X-API-KEY: ***REDACTED***

// Always log safe headers
console.log(`Request to ${url} with headers:`, safeHeaders)  // Safe
console.log(`Request to ${url} with headers:`, requestHeaders)  // DANGEROUS!
```

### Validation First
```javascript
// Always validate inputs before processing
const validation = validateAllInputs(url.searchParams, env)
if (!validation.isValid) {
  return createErrorResponse('Invalid input parameters', 400, {
    details: validation.errors,
    type: 'ValidationError'
  })
}
```

### Logging & Debugging
- **Structured JSON logs** with request IDs
- **Debug mode** adds `sliceBreakdown` and `ledgerState`
- **Request tracing** with `X-Request-ID` headers
- **Performance headers**: `X-Response-Time`, `X-Cache-Status`

## Development Workflow

### Local Development
```bash
npm run dev          # wrangler dev --local (port 8787)
npm run lint         # eslint
npm run format       # prettier
```

### Testing Providers
```javascript
// Direct provider test
import { ProviderClass } from './src/lib/sources/provider.js'
const provider = new ProviderClass()
const results = await provider.search('test', { ledger: null }, env)
```

### Adding New Providers
1. Create `src/lib/sources/newprovider.js` with provider class
2. Export from `src/lib/sources/index.js`
3. Import in `src/lib/search-service.js`
4. Add to `providers` object and caps
5. Add to appropriate chains in `this.chains`
6. Add API key to `.dev.vars` and `wrangler.toml`
7. Test with `/api/provider-selftest-all?debug=true`

### Cache Behavior
- **TTL: 48 hours** for search results
- **Bypass**: `cache: false` in options
- **Keys**: `search:${query}:${mode}:${fresh}:${limit}:${provider}:${safeMode}:${debug}`

## Key Files to Reference

### Core Architecture
- **`src/worker.js`** - Main request router with method dispatch and error handling
- **`src/handlers/aggregate.js`** - Primary `/api/search` handler with caching and slicing
- **`src/lib/search-service.js`** - Provider orchestration logic with chains, fallbacks, and parallel execution

### Provider Management & Utilities
- **`src/lib/provider-ledger.js`** - Quota tracking, health status, circuit breaker logic
- **`src/lib/request-wrapper.js`** - Unified HTTP requests with retry logic, timeout, and error mapping (ALL providers should use this)
- **`src/lib/adapter-registry.js`** - Provider metadata registration and lookup (internal provider lifecycle)
- **`src/lib/validation.js`** - Input sanitization, bounds-checking, parameter validation (ALWAYS use before processing)
- **`src/lib/response.js`** - Response formatting with compression, CORS, and standardized headers
- **`src/lib/logger.js`** - Structured logging with levels (ERROR, WARN, INFO, DEBUG) and request IDs

### Provider Examples
- **`src/lib/sources/pornhub.js`** - Template provider (monthly cap, canonical errors)
- **`src/lib/sources/google.js`** - GET+query params pattern with CSE integration
- **`src/lib/sources/serper.js`** - POST+X-API-KEY pattern with freshness support
- **`src/lib/sources/brave.js`** - GET+custom header pattern with pagination
- **`src/lib/sources/adapters.js`** - Advanced pattern with robots compliance checking and quality filtering
- **`src/lib/sources/apify.js`** - Final fallback transport layer with specialized scraping

### Special Handlers
- **`src/handlers/provider-selftest.js`** - Comprehensive provider health diagnostics (understand provider test requirements)
- **`src/handlers/health.js`** - System health endpoint
- **`src/handlers/diagnostics.js`** - Advanced debugging and cache inspection

### Infrastructure
- **`wrangler.toml`** - Cloudflare Worker configuration with KV bindings and environment variables
- **`.dev.vars`** - Local development secrets (gitignored, never commit API keys)
- **`src/lib/robots-checker.js`** - robots.txt compliance for ethical scraping
- **`src/lib/rate-limit.js`** - Client rate limiting and quota enforcement

## Configuration Reference (wrangler.toml)

### Critical Environment Variables
```toml
[env.production]
# API Keys (use: wrangler secret put PROVIDER_API_KEY)
GOOGLE_API_KEY = ""
GOOGLE_CSE_ID = ""
SERPAPI_API_KEY = ""
SERPER_API_KEY = ""
BRAVE_API_KEY = ""
# ... plus all other provider keys

# Request Configuration
FETCH_TIMEOUT_MS = "10000"      # HTTP timeout per request
RETRY_MAX = "3"                 # Max retry attempts
BACKOFF_BASE_MS = "1000"        # Exponential backoff base
USER_AGENT = "Jack-Portal/2.0.0"

# Search Configuration
DEFAULT_LIMIT = "10"            # Default results per query
MAX_LIMIT = "20"                # Maximum results allowed
MIN_LIMIT = "3"                 # Minimum results required

# Circuit Breaker Configuration
LEDGER_DEFAULT_QUOTA_RESET_MS = "3600000"  # 1 hour
TEMP_FAIL_COOLDOWN_MS = "300000"           # 5 minutes before retry
```

### KV Namespace Configuration
```toml
# Two REQUIRED KV namespaces:

[[env.production.kv_namespaces]]
binding = "CACHE"               # Search result caching
id = "6779e4f7493e4b6ca1c8e2ce5b2ebe39"

[[env.production.kv_namespaces]]
binding = "PROVIDER_LEDGER"     # Provider health & quotas
id = "d85c23fcfa9e4e42b6f8d18d28af551d"
```

### Local Development (.dev.vars)
```bash
# Never commit this file to git!
# Copy from production env or get from wrangler

GOOGLE_API_KEY=your_key_here
SERPAPI_API_KEY=your_key_here
# ... all provider keys

FETCH_TIMEOUT_MS=10000
RETRY_MAX=3
LOG_LEVEL=2
```

## Request Flow & Architecture Deep Dive

### Endpoint Structure
```
GET /api/search?q=query&mode=normal&limit=10&debug=true

Routes (src/worker.js):
  /api/search         → handleAggregate() [main search endpoint]
  /health             → handleHealth() [liveness probe]
  /api/diagnostics    → handleDiagnostics() [cache/ledger inspection]
  /api/provider-selftest  → handleProviderSelfTest() [provider health check]
  /                   → PORTAL_HTML [UI interface]

Disabled/Legacy:
  /api/provider-selftest-all → Full provider test suite
  /fresh, /duration, /site  → Optional query filters
```

### Request Lifecycle (Detailed)

1. **Worker Receives Request** (`worker.js`)
   - Extract IP from `CF-Connecting-IP` (Cloudflare) or fallback headers
   - Generate request ID with `crypto.randomUUID()`
   - Log request start with structured logger
   - Route to appropriate handler

2. **Rate Limiting Check** (`aggregate.js` → `rate-limit.js`)
   ```
   Three overlapping windows checked:
   - IP-based: 10 requests/min per IP
   - Endpoint-based: 30 requests/min per endpoint
   - Global: 100 requests/min total
   
   If ANY limit exceeded → 429 response with X-Rate-Limit-* headers
   ```

3. **Input Validation** (`validateAllInputs()` from `validation.js`)
   ```
   Checks:
   - Query length (2-200 chars after sanitization)
   - Mode in ['normal', 'deep_niche', 'fresh']
   - Limit in [MIN_LIMIT, MAX_LIMIT]
   - No HTML/XML injection in query
   - No control characters
   
   If invalid → 400 response with validation errors
   ```

4. **Cache Check** (`aggregate.js`)
   ```
   Cache key = "search:${query}:${mode}:${fresh}:${limit}:${provider}:${safeMode}:${debug}"
   
   await env.CACHE.get(cacheKey)
   
   If HIT:
     - Return cached result with `cached: true` flag
     - No provider calls made
   
   If MISS:
     - Continue to step 5
   ```

5. **SearchService Execution** (`search-service.js`)
   ```
   a) Initialize ProviderLedger from PROVIDER_LEDGER KV
   
   b) Calculate slice quotas based on mode and requested limit:
      Normal mode: [google: 50%, adult: 40%, pornhub: 20%, adapters: 10%]
      Deep niche: [serply: 35%, adult: 15%, pornhub: 25%, adapters: 25%]
   
   c) Execute all slices in PARALLEL with Promise.all():
      - Each slice runs executeSlice()
      - Each slice runs executeProviderInChain()
      - Providers called in sequence until quota met or all fail
   
   d) Combine results from all slices
   
   e) Deduplicate by URL (remove exact matches)
   
   f) Slice to requested limit
   
   g) Add telemetry and source metadata
   ```

6. **Provider Chain Execution** (`executeProviderInChain()`)
   ```
   For each provider in chain:
     1. Check ledger.isProviderHealthy()
        - If in temp_fail cooldown (5 min) → skip
        - If marked unhealthy → skip
     
     2. Check monthly quota
        if (state.monthlyUsed >= monthlyCap) → skip
     
     3. Make request with RequestWrapper
        - Includes retry logic (3 attempts)
        - Timeout: FETCH_TIMEOUT_MS (default 10s)
        - Exponential backoff if retry needed
     
     4. On success:
        - ledger.recordSuccess(provider)
        - ledger.incrementMonthlyUsed(provider)
        - Return normalized results
     
     5. On error:
        - ledger.recordError(provider, errorType)
        - If 5xx error → may trigger temp_fail (5 min cooldown)
        - If 3 errors in 5 min window → unhealthy state
        - Return [] (continue to next provider)
   ```

7. **Error Handling** (`handleProviderError()`)
   ```
   Maps HTTP status to canonical error:
   - 400 → BAD_PARAMS
   - 401/403 → BAD_PARAMS (auth issue)
   - 404 → BAD_HOST
   - 429 → RATE_LIMIT
   - 5xx → UPSTREAM_ERROR
   - Network timeout → NETWORK_ERROR
   - Other → UPSTREAM_ERROR
   
   Ledger updates:
   - 4xx errors increment error4xxCount
   - 5xx errors increment error5xxCount
   - After 3 failures in 5-min window:
     → Provider marked temp_fail
     → 5-minute cooldown starts
   ```

8. **Response Caching** (`aggregate.js`)
   ```
   if (results.length > 0) {
     await env.CACHE.put(
       cacheKey,
       JSON.stringify(response),
       { expirationTtl: 172800 }  // 48 hours
     )
   }
   
   Cache miss but no results:
   - Still caching to avoid repeated provider calls
   - Short TTL or negative cache entry
   ```

9. **Response Formatting** (`createSuccessResponse()`)
   ```
   Response object:
   {
     results: [
       {
         title, url, snippet, score, source,
         published_at, author, thumbnail,
         extra: { provider-specific data }
       },
       ...
     ],
     query: "original query",
     mode: "normal",
     timestamp: 1729365600000,
     cached: false,
     requestId: "uuid-here",
     totalUnique: 10,
     dedupedCount: 2,
     
     // Only if debug=true:
     providerBreakdown: {
       google: { results: 5, source: 'google' },
       xnxx: { results: 2, source: 'xnxx' },
       ...
     },
     ledgerState: {
       google: { health: 'healthy', monthlyUsed: 2998, monthlyCap: 3000, ... },
       ...
     }
   }
   ```

10. **Response Headers**
    ```
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
    X-XSS-Protection: 1; mode=block
    Access-Control-Allow-Origin: *
    Access-Control-Allow-Methods: GET, OPTIONS
    Cache-Control: public, max-age=172800
    X-Response-Time: 145ms
    X-Cache-Status: HIT|MISS
    X-Request-ID: uuid-here
    ```

## Provider Ledger & Quota System (Advanced)

### Provider Ledger State Structure
Each provider has a state object stored in `PROVIDER_LEDGER` KV namespace:

```javascript
{
  name: 'google',
  health: 'healthy',           // 'healthy' | 'temp_fail' | 'unhealthy'
  temp_fail_until: 0,          // Timestamp when temp_fail ends (0 = not in cooldown)
  unhealthy_until: 0,          // Timestamp when unhealthy ends
  
  // Monthly quota tracking
  monthlyCap: 3000,            // Monthly API call limit
  monthlyUsed: 2998,           // Current month usage
  monthlyReset: 1730419200000, // Next month reset timestamp
  
  // Health metrics (rolling 5-minute window)
  rolling: {
    successCount: 150,
    error4xxCount: 2,
    error5xxCount: 1,
    timeoutCount: 0,
    failureStartTime: 0,       // When failure window started
    failures: []               // Timestamps of failures (for circuit breaker)
  }
}
```

### Health Status Transitions

```
[HEALTHY] ← No failures
  ↓
  3 failures in 5-min window
  ↓
[TEMP_FAIL] (5-minute cooldown)
  ↓ (after 5 minutes)
[HEALTHY] (if still working)
  ↓
  OR if continues failing
[UNHEALTHY] (1-hour cooldown)
  ↓ (after 1 hour)
[HEALTHY] (reset attempt)
```

**Example:**
```
10:00:00 - Provider makes request, gets 503 → failureStartTime = 10:00:00, failures: [10:00:00]
10:00:05 - Provider makes request, gets 503 → failures: [10:00:00, 10:00:05]
10:00:10 - Provider makes request, gets 503 → failures: [10:00:00, 10:00:05, 10:00:10]
          → Length = 3, within 5 min window → TEMP_FAIL
          → temp_fail_until = 10:05:10

10:02:00 - During TEMP_FAIL → Provider skipped (returns [])

10:05:15 - TEMP_FAIL expired, retried → Success → health = 'healthy', temp_fail_until = 0
```

### Monthly Quota Tracking

```javascript
// When checking quota:
const state = ledger.getProviderState('google')
if (state.monthlyUsed >= state.monthlyCap) {
  // QUOTA EXCEEDED - skip this provider
  return []
}

// After successful call:
ledger.incrementMonthlyUsed('google')  // +1

// Check if this month is over:
const now = Date.now()
if (now >= state.monthlyReset) {
  // Month changed - reset usage
  state.monthlyUsed = 0
  state.monthlyReset = nextMonthTimestamp
}
```

### Quota Reset Schedule
Quotas reset on UTC month boundaries:
- Jan 1, Feb 1, Mar 1, etc. at 00:00:00 UTC

```
Oct 31 23:59:59 UTC - Google at 2999/3000 quota
Nov 1 00:00:00 UTC - Google resets to 0/3000 quota (in monthly reset check)
```

### Why Monthly-Only (Not Daily)?
Monthly caps allow:
- More flexible usage patterns (burst during high-traffic days)
- Easier rate limit management (no daily resets to handle)
- Better cost optimization (can front-load usage early in month)
- Matches most API pricing models (monthly billing cycles)

Daily caps would require:
- Complex timezone handling
- Excessive KV operations for reset checks
- More operational overhead

## Troubleshooting & Debugging

### Common Issues

**Search returns empty results (0 results)**
- Check if query is too short (minimum 2 chars)
- Check if all providers are in temp_fail or unhealthy state
- Check provider quotas: `/api/diagnostics?debug=true` shows ledger state
- Check if query is being filtered by safe mode
- All providers might be down/quota exceeded

**Query returns 429 Rate Limited**
- IP has exceeded 10 requests/minute
- Check X-Rate-Limit-* headers for reset time
- Implement exponential backoff in client
- Different IP or wait for reset

**Specific provider always returns nothing**
- Check if API key is configured: `wrangler secret list`
- Check if provider is in temp_fail: `/api/diagnostics`
- Check if provider hit monthly cap
- Check if provider is in chain for this mode
- Test with `/api/provider-selftest?provider=name`

**Cache not working (every query is cache miss)**
- Verify CACHE KV namespace is bound in wrangler.toml
- Check if dev mode is being used (local mode doesn't persist KV)
- Check cache key doesn't include timestamps
- Try: `curl "http://localhost:8787/api/search?q=test" -H "Accept: application/json"` twice

**Timeout errors from providers**
- Increase FETCH_TIMEOUT_MS in wrangler.toml
- Check if provider API is down
- Check if provider is being throttled (rate limited on their end)
- Check network latency with curl

### Debug Mode Usage
```
// Add ?debug=true to any search query
/api/search?q=test&debug=true

Returns additional fields:
- providerBreakdown: How many results from each provider
- ledgerState: Full health/quota status of all providers
```

### Viewing Diagnostics
```
/api/diagnostics              # All provider states
/api/diagnostics?provider=google  # Specific provider
/api/health                   # System health

Shows:
- Monthly usage vs cap for each provider
- Health status (healthy/temp_fail/unhealthy)
- Failure counts and windows
- Last error messages
- Cache contents (if ?cache=true)
```

### Telemetry & Logging
```
Structured logs visible in:
- Cloudflare Workers console/logs
- Local: npm run dev output

Key metrics logged:
- items_returned: How many results provider gave
- request_id: Trace this request across logs
- provider: Which provider
- error_code: Canonical error
- response_time: Provider latency
- cache_status: HIT/MISS

Log levels (env.LOG_LEVEL):
- 0 = ERROR only
- 1 = ERROR + WARN
- 2 = ERROR + WARN + INFO (default)
- 3 = ERROR + WARN + INFO + DEBUG
```

## Common Pitfalls

### Critical Mistakes (Will Break Production)

- **Don't add daily caps** - only monthly quotas (e.g., `serper.js` still has `this.dailyCap` - this is LEGACY, ignore it)
- **Don't throw UNKNOWN errors** - always map to canonical codes: `BAD_PARAMS`, `BAD_HOST`, `RATE_LIMIT`, `UPSTREAM_ERROR`, `NETWORK_ERROR`
- **Don't bypass ledger** - always pass `options.ledger` to providers and check it before making requests
- **Don't hardcode API keys** - always read from `env.PROVIDER_API_KEY` pattern; never commit secrets
- **Don't skip validation** - always call `validateAllInputs()` first; it sanitizes and bounds-checks everything

### Normalization Mistakes

- **Don't return inconsistent result shapes** - all providers must normalize to:
  ```javascript
  {
    title,           // string, required
    url,            // string, required (MUST be https or #)
    snippet,        // string, may be empty
    score: 0.5,     // number, required
    published_at,   // ISO string or null
    author,         // string or null
    thumbnail,      // URL or null
    extra: {        // object with provider-specific data
      provider: 'name',
      ...additionalFields
    }
  }
  ```
  
  **BAD:** `{ video_title, video_link, ...}` - inconsistent field names
  **GOOD:** `{ title, url, extra: { videoId: item.id } }`

- **Don't include non-HTTPS URLs** - filter or convert to `#`:
  ```javascript
  // BAD
  return { url: item.url }  // might be http://, data:, or malformed
  
  // GOOD
  return { url: item.url?.startsWith('https://') ? item.url : '#' }
  ```

### Chain & Fallback Mistakes

- **Don't check if result is empty** before returning from provider - let the chain handle it:
  ```javascript
  // BAD: Provider decides if it's "good enough"
  if (results.length < 2) throw new Error('NOT_ENOUGH_RESULTS')
  
  // GOOD: Return whatever you got, let SearchService manage quotas
  return this.normalizeResults(data.results || [])
  ```

- **Don't skip ledger.incrementMonthlyUsed()** - if you called the API, increment it even if results are empty:
  ```javascript
  // BAD
  const results = await provider.search()
  if (results.length === 0) return []  // ← Ledger not updated!
  
  // GOOD
  const results = await provider.search()
  if (ledger) ledger.incrementMonthlyUsed('provider')  // Always update
  return this.normalizeResults(results)
  ```

- **Don't mix monthly and daily caps** - ledger tracks both, but new providers use monthly-only:
  ```javascript
  // BAD (old pattern - don't use)
  if (state.dailyUsed >= this.dailyCap) throw Error('QUOTA_EXCEEDED_DAILY')
  if (state.monthlyUsed >= this.monthlyCap) throw Error('QUOTA_EXCEEDED_MONTHLY')
  
  // GOOD (new pattern - monthly only)
  if (state.monthlyUsed >= this.monthlyCap) {
    ledger.markQuotaExceeded('provider')
    throw new Error('QUOTA_EXCEEDED_MONTHLY')
  }
  ```

### Response & Caching Mistakes

- **Don't cache error responses** - only cache successful searches:
  ```javascript
  // BAD
  if (response.ok) {
    cache.set(key, JSON.stringify(results))
  }
  
  // GOOD: Cache is automatic; just return results normally
  return this.normalizeResults(data.results || [])
  ```

- **Don't include timestamp in cache key** - timestamps make every request miss cache:
  ```javascript
  // BAD
  const key = `search:${query}:${Date.now()}`  // Every request is unique!
  
  // GOOD
  const key = `search:${query}:${mode}:${limit}`  // Reused for same query
  ```

- **Don't return raw API responses** - always normalize first:
  ```javascript
  // BAD
  return data.results  // Inconsistent with other providers
  
  // GOOD
  return this.normalizeResults(data.results || [])
  ```

### Error Handling Mistakes

- **Don't throw generic Error('Failed')** - map HTTP status codes to canonical errors:
  ```javascript
  // BAD
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  
  // GOOD
  if (response.status === 403) throw new Error('BAD_PARAMS')
  if (response.status === 429) throw new Error('RATE_LIMIT')
  if (response.status >= 500) throw new Error('UPSTREAM_ERROR')
  ```

- **Don't parse JSON before checking response.ok** - invalid JSON will crash:
  ```javascript
  // BAD
  const data = await response.json()
  if (!response.ok) throw new Error(...)
  
  // GOOD
  if (!response.ok) throw new Error('UPSTREAM_ERROR')  // Don't parse
  const data = await response.json()
  ```

- **Don't swallow ledger errors** - always pass ledger through the full error path:
  ```javascript
  // BAD
  try {
    const results = await provider.search(query, options, env)
    return results
  } catch (error) {
    // Ledger state not updated on error!
  }
  
  // GOOD (in SearchService)
  try {
    const results = await provider.search(query, { ...options, ledger }, env)
    this.ledger.recordSuccess('provider')
    return results
  } catch (error) {
    this.handleProviderError('provider', error)  // Updates ledger
    return []
  }
  ```

### Configuration Mistakes

- **Don't forget to add API key to both environments**:
  ```bash
  # .dev.vars (local)
  NEWPROVIDER_API_KEY=key_value
  
  # wrangler.toml [env.production] section
  NEWPROVIDER_API_KEY = ""
  
  # Then run: wrangler secret put NEWPROVIDER_API_KEY
  ```

- **Don't create new KV namespaces for individual providers** - use single `PROVIDER_LEDGER` namespace:
  ```javascript
  // BAD: Each provider has its own KV
  this.kv = env.PORNHUB_KV
  this.kv = env.XNXX_KV
  
  // GOOD: Centralized ledger
  this.kv = env.PROVIDER_LEDGER  // Shared
  ```

- **Don't hardcode base URLs** - parameterize them:
  ```javascript
  // BAD
  const response = await fetch('https://api.example.com/search', ...)
  
  // GOOD
  constructor() {
    this.baseUrl = 'https://api.example.com'
  }
  const response = await fetch(`${this.baseUrl}/search`, ...)
  ```

### Telemetry & Debugging Mistakes

- **Don't skip console.log telemetry** - add per response to track max results:
  ```javascript
  // GOOD (add this after successful response)
  console.log(`Provider telemetry: items_returned=${data.results?.length || 0}, pages_requested=1, server_pagination_hints=${data.totalPages || 'unknown'}`)
  ```

- **Don't use console.error for expected failures** - use console.warn for quota/rate limits:
  ```javascript
  // BAD
  console.error('XNXX quota exceeded')  // Looks like crash
  
  // GOOD
  console.log('XNXX telemetry: items_returned=0, reason=quota_exceeded')
  ```

### Testing Mistakes

- **Don't test without ledger** - always pass a ledger instance:
  ```javascript
  // BAD
  const results = await provider.search('test', { limit: 5 }, env)
  
  // GOOD
  const ledger = new ProviderLedger(env)
  const results = await provider.search('test', { ledger, limit: 5 }, env)
  ```

- **Don't assume provider returns array** - always check Array.isArray():
  ```javascript
  // BAD
  return results.map(item => normalize(item))  // Crashes if results is null
  
  // GOOD
  if (!Array.isArray(results)) return []
  return results.map(item => normalize(item))
  ```

### KV Query & Storage Mistakes

- **Don't list() without prefix** - it iterates all KV entries (slow):
  ```javascript
  // BAD
  const allKeys = await kv.list()  // Scans everything
  
  // GOOD
  const allKeys = await kv.list({ prefix: 'providers:' })  // Only namespaced keys
  ```

- **Don't store massive objects in KV** - keep individual state small:
  ```javascript
  // BAD: Store all provider states in single key
  await kv.put('all_providers', JSON.stringify(hugeStateObject))
  
  // GOOD: Store individual provider state
  await kv.put(`providers:google`, JSON.stringify(googleState))
  await kv.put(`providers:xnxx`, JSON.stringify(xnxxState))
  ```

- **Don't forget to handle missing KV** - local dev might not have KV:
  ```javascript
  // BAD
  const state = JSON.parse(await env.PROVIDER_LEDGER.get(key))  // Crashes if no KV
  
  // GOOD
  if (!this.kv) {
    console.warn('PROVIDER_LEDGER KV not available, using in-memory only')
    return
  }
  const state = JSON.parse(await this.kv.get(key))
  ```

- **Don't make KV calls in tight loops** - batch them:
  ```javascript
  // BAD: Each iteration makes a KV call
  for (const provider of providers) {
    await kv.put(`providers:${provider}`, JSON.stringify(state))
  }
  
  // GOOD: Batch all calls
  const promises = providers.map(provider =>
    kv.put(`providers:${provider}`, JSON.stringify(state))
  )
  await Promise.all(promises)
  ```

- **Don't store parsed JSON, then stringify again** - unnecessary encoding:
  ```javascript
  // BAD
  const state = JSON.parse(kvValue)
  // ... modify state ...
  const toStore = JSON.stringify(state)
  await kv.put(key, toStore)
  
  // GOOD: Store as-is, parse when needed
  const state = await getProviderState('name')  // Returns object
  // ... modify ...
  await kv.put(key, JSON.stringify(state))
  ```

### CORS & Header Mistakes

- **Don't hardcode Access-Control-Allow-Origin to specific domains in production** - use wildcard or config:
  ```javascript
  // BAD: Only works for one domain
  headers['Access-Control-Allow-Origin'] = 'https://myapp.com'
  
  // GOOD: Allow all or read from config
  headers['Access-Control-Allow-Origin'] = '*'
  // OR if restricted needed:
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['*']
  headers['Access-Control-Allow-Origin'] = allowedOrigins.includes(origin) ? origin : ''
  ```

- **Don't send sensitive headers in Access-Control-Allow-Headers** - don't expose internal auth:
  ```javascript
  // BAD
  headers['Access-Control-Allow-Headers'] = 'Authorization, X-API-Key, X-Internal-Auth'
  
  // GOOD
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
  ```

- **Don't forget OPTIONS preflight handling** - CORS preflight requests must succeed:
  ```javascript
  // BAD: Only handle GET/POST
  if (method === 'GET') { ... }
  if (method === 'POST') { ... }
  // OPTIONS requests fail!
  
  // GOOD: Handle OPTIONS first
  if (method === 'OPTIONS') {
    return handleOptionsRequest(request)  // Returns 200 with CORS headers
  }
  if (method === 'GET') { ... }
  ```

- **Don't mix cache and CORS headers wrong** - Cache-Control conflicts:
  ```javascript
  // BAD: Client-side cache conflicts with browser CORS
  headers['Cache-Control'] = 'public, max-age=3600'
  headers['Access-Control-Allow-Origin'] = '*'
  // Browser won't cache due to CORS

  // GOOD: Vary header for CORS-ed responses
  headers['Vary'] = 'Origin'
  headers['Cache-Control'] = 'public, max-age=3600'
  ```

- **Don't send custom headers that browsers restrict** - some headers only work server-to-server:
  ```javascript
  // BAD: Browser won't send these without explicit Allow-Headers
  const customHeader = request.headers.get('X-Internal-Request-ID')
  
  // GOOD: Always explicitly allow in preflight
  headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Internal-Request-ID'
  ```

### Rate Limit Header Mistakes

- **Don't forget to set rate limit headers** - clients need to know they're rate limited:
  ```javascript
  // BAD
  if (!rateLimitResult.allowed) {
    return new Response('Rate limited', { status: 429 })
  }
  
  // GOOD
  if (!rateLimitResult.allowed) {
    return new Response('Rate limited', {
      status: 429,
      headers: {
        'X-Rate-Limit-Limit': rateLimitResult.limit.toString(),
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Rate-Limit-Reset': rateLimitResult.reset.toString()
      }
    })
  }
  ```

- **Don't use inconsistent rate limit reset times** - seconds vs milliseconds:
  ```javascript
  // BAD: Some places use ms, some use seconds
  headers['X-Rate-Limit-Reset'] = Date.now() + 60000  // Milliseconds
  headers['X-Rate-Limit-Reset'] = Math.floor(Date.now() / 1000) + 60  // Seconds
  
  // GOOD: Always use Unix timestamp in seconds
  headers['X-Rate-Limit-Reset'] = Math.floor((Date.now() + 60000) / 1000)
  ```

- **Don't rate limit before validation** - don't count invalid requests:
  ```javascript
  // BAD
  const rateLimitResult = await checkRateLimit(env, ip, 'search')
  const validation = validateAllInputs(params, env)
  if (!validation.isValid) return error  // Still counted against rate limit!
  
  // GOOD
  const validation = validateAllInputs(params, env)
  if (!validation.isValid) return error  // No rate limit charge
  const rateLimitResult = await checkRateLimit(env, ip, 'search')
  ```

- **Don't expose your internal rate limit strategy** - don't log exact limits:
  ```javascript
  // BAD: Exposes your rate limit config
  console.log(`Rate limit for ${ip}: ${result.limit} per minute`)
  
  // GOOD: Log aggregate metrics only
  console.log(`Rate limit exceeded for IP: ${ip}`)
  ```

- **Don't use client IP incorrectly behind proxies** - Cloudflare provides the right header:
  ```javascript
  // BAD: Trusts X-Forwarded-For (can be spoofed)
  const ip = request.headers.get('X-Forwarded-For')
  
  // GOOD: Use Cloudflare's header first
  const ip = request.headers.get('CF-Connecting-IP') ||
             request.headers.get('X-Forwarded-For') ||
             request.headers.get('X-Real-IP') ||
             'unknown'
  ```

- **Don't have static rate limit windows** - windows should reset on time boundaries:
  ```javascript
  // BAD: Each request resets a 60s window (never enforces)
  windowStart = Date.now()
  windowEnd = windowStart + 60000
  
  // GOOD: Windows aligned to minute boundaries
  const now = Date.now()
  const windowStart = Math.floor(now / 60000) * 60000
  const windowEnd = windowStart + 60000
  ```</content>
<parameter name="filePath">c:\Users\tanne\ProjectFolder\Workspace\.github\copilot-instructions.md
