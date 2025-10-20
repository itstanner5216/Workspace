import {
  GoogleProvider,
  SerpApiProvider,
  SerperProvider,
  BraveProvider,
  AdultMediaProvider,
  QualityPornProvider,
  ApifyProvider,
  SeznamProvider,
  PornhubProvider,
  XNXXProvider,
  PurepornProvider,
  PornlinksProvider
} from './sources/index.js'
import { ProviderLedger } from './provider-ledger.js'
import { AdapterRegistry } from './adapter-registry.js'

/**
 * Search Service with Scoped Provider Chains
 */
export class SearchService {
  constructor(env) {
    this.env = env
    this.ledger = new ProviderLedger(env)
    this.registry = new AdapterRegistry()

    // Initialize provider caps
    this._initializeProviderCaps()

    // Create provider instances
    this.providers = this._createProviderInstances()

    // Define chains by mode - TESTING WITH WORKING PROVIDER
    this.chains = {
      normal: {
        test_slice: ['xnxx']
      },
      deep_niche: {
        test_slice: ['xnxx']
      }
    }

    // Slice weights by mode
    this.sliceWeights = {
      normal: {
        test_slice: 1.0
      },
      deep_niche: {
        test_slice: 1.0
      }
    }
  }

  /**
   * Initialize provider daily/monthly caps
   */
  _initializeProviderCaps() {
    // Set caps in ledger
    this.ledger.setDailyCap('google', 100)
    this.ledger.setMonthlyCap('google', 3000)

    this.ledger.setDailyCap('serpapi', 100)
    this.ledger.setMonthlyCap('serpapi', 3000)

    this.ledger.setDailyCap('seznam', 6) // 200/30 = ~6.67
    this.ledger.setMonthlyCap('seznam', 200)

    this.ledger.setDailyCap('serper', 83) // 2500/30 = ~83.33
    this.ledger.setMonthlyCap('serper', 2500)

    this.ledger.setDailyCap('brave', 66) // 2000/30 = ~66.67
    this.ledger.setMonthlyCap('brave', 2000)

    this.ledger.setDailyCap('adultmedia', 50) // ~50/day requests
    this.ledger.setMonthlyCap('adultmedia', 1500) // requests per month
    this.ledger.setRequestsDailyCap('adultmedia', 50) // 25 objects/request × 50 = 1250 objects
    this.ledger.setObjectsDailyCap('adultmedia', 1250) // API's actual quota

    this.ledger.setDailyCap('qualityporn', 300)
    this.ledger.setMonthlyCap('qualityporn', 9000)

    this.ledger.setDailyCap('pornhub', 300)
    this.ledger.setMonthlyCap('pornhub', 9000)

    this.ledger.setDailyCap('xnxx', 300)
    this.ledger.setMonthlyCap('xnxx', 9000)

    this.ledger.setDailyCap('pureporn', 300)
    this.ledger.setMonthlyCap('pureporn', 9000)

    this.ledger.setDailyCap('pornlinks', 300)
    this.ledger.setMonthlyCap('pornlinks', 9000)

    this.ledger.setMonthlyCap('apify', 1428) // No daily cap
  }

  /**
   * Create provider instances
   */
  _createProviderInstances() {
    return {
      google: new GoogleProvider(),
      serpapi: new SerpApiProvider(),
      serper: new SerperProvider(),
      brave: new BraveProvider(),
      adultmedia: new AdultMediaProvider(),
      qualityporn: new QualityPornProvider(),
      apify: new ApifyProvider(),
      seznam: new SeznamProvider(),
      pornhub: new PornhubProvider(),
      xnxx: new XNXXProvider(),
      pureporn: new PurepornProvider(),
      pornlinks: new PornlinksProvider()
    }
  }

  async search(options) {
    const { query, limit = 10, mode = 'normal', debug = false } = options

    // Load provider states
    await this.ledger.loadStates()

    try {
      // Execute search by mode
      const results = await this.executeSearch(query, { ...options, mode, limit, debug })

      // Save provider states
      await this.ledger.saveStates()

      return this.formatResults(results, limit, debug)

    } catch (error) {
      console.error('Search service error:', error)
      throw error
    }
  }

  /**
   * Execute search based on mode
   */
  async executeSearch(query, options) {
    const { mode, limit, debug } = options
    const sliceWeights = this.sliceWeights[mode] || this.sliceWeights.normal

    // Calculate slice quotas
    const sliceQuotas = this._calculateSliceQuotas(sliceWeights, limit)

    if (debug) {
      console.log(`Executing ${mode} search with quotas:`, sliceQuotas)
    }

    // Execute slices in parallel
    const slicePromises = Object.entries(sliceQuotas).map(async ([sliceName, quota]) => {
      if (quota === 0) return { slice: sliceName, results: [], requested: 0, delivered: 0, chain: [] }

      return await this.executeSlice(sliceName, query, { ...options, limit: quota })
    })

    const slices = await Promise.all(slicePromises)

    // Collect results
    const allResults = []
    const sliceBreakdown = {}

    for (const slice of slices) {
      allResults.push(...slice.results)
      sliceBreakdown[slice.slice] = {
        requested: slice.requested,
        delivered: slice.delivered,
        chain: slice.chain
      }
    }

    // Deduplicate
    const deduplicated = this.deduplicateResults(allResults)

    return {
      results: deduplicated.slice(0, limit),
      totalUnique: deduplicated.length,
      dedupedCount: allResults.length - deduplicated.length,
      sliceBreakdown,
      mode
    }
  }

  /**
   * Calculate slice quotas
   */
  _calculateSliceQuotas(sliceWeights, totalLimit) {
    const quotas = {}
    let totalAllocated = 0

    for (const [slice, weight] of Object.entries(sliceWeights)) {
      quotas[slice] = Math.floor(weight * totalLimit)
      totalAllocated += quotas[slice]
    }

    // Distribute remainder
    const remainder = totalLimit - totalAllocated
    const sliceOrder = Object.keys(sliceWeights)

    for (let i = 0; i < remainder; i++) {
      const slice = sliceOrder[i % sliceOrder.length]
      quotas[slice]++
    }

    return quotas
  }

  /**
   * Execute a slice using its chain
   */
  async executeSlice(sliceName, query, options) {
    const { limit, debug } = options
    const chain = this.chains[options.mode][sliceName] || []
    const results = []
    const chainLog = []
    let delivered = 0

    for (const providerName of chain) {
      if (delivered >= limit) break

      try {
        const providerResults = await this.executeProviderInChain(providerName, query, {
          ...options,
          limit: limit - delivered
        })

        if (providerResults.length > 0) {
          results.push(...providerResults)
          delivered += providerResults.length
          chainLog.push({
            provider: providerName,
            added: providerResults.length,
            status: 'success'
          })

          if (debug) {
            console.log(`${sliceName}: ${providerName} added ${providerResults.length} results`)
          }
        } else {
          chainLog.push({
            provider: providerName,
            added: 0,
            status: 'no_results'
          })
        }
      } catch (error) {
        chainLog.push({
          provider: providerName,
          added: 0,
          status: 'error',
          error: error.message
        })

        if (debug) {
          console.log(`${sliceName}: ${providerName} error: ${error.message}`)
        }
      }
    }

    return { slice: sliceName, results, requested: limit, delivered, chain: chainLog }
  }

  /**
   * Execute provider in chain with cap checking
   */
  async executeProviderInChain(providerName, query, options) {
    // Check provider health and caps
    if (!this.ledger.isProviderHealthy(providerName)) {
      this.ledger.setLastSkipReason(providerName, 'unhealthy')
      return []
    }

    // Check for required API keys - Skip validation for known working providers
    const skipKeyValidation = ['serper', 'brave', 'google', 'serpapi', 'adultmedia', 'apify']
    if (!skipKeyValidation.includes(providerName) && !this._hasValidApiKey(providerName)) {
      this.ledger.setLastSkipReason(providerName, 'missing_api_key')
      return []
    }

    const state = this.ledger.getProviderState(providerName)
    
    // Special handling for AdultMedia dual-cap system
    if (providerName === 'adultmedia') {
      if (state.requestsDailyCap && state.requestsDailyUsed >= state.requestsDailyCap) {
        this.ledger.setLastSkipReason(providerName, 'requests_daily_cap_exceeded')
        return []
      }
    } else {
      // Standard cap checking for other providers
      if (state.dailyCap && state.dailyUsed >= state.dailyCap) {
        this.ledger.setLastSkipReason(providerName, 'daily_cap_exceeded')
        return []
      }
    }

    if (state.monthlyCap && state.monthlyUsed >= state.monthlyCap) {
      this.ledger.setLastSkipReason(providerName, 'monthly_cap_exceeded')
      return []
    }

    // Execute provider
    const provider = this.providers[providerName]
    if (!provider) return []

    try {
      const results = await provider.search(query, { ...options, ledger: this.ledger }, this.env)

      // Record usage - AdultMedia handles its own dual-cap counters
      if (providerName === 'adultmedia') {
        // AdultMedia provider handles incrementRequestsDailyUsed and incrementObjectsDailyUsed
        this.ledger.incrementMonthlyUsed(providerName)
      } else if (providerName !== 'apify') { // Apify only has monthly cap
        this.ledger.incrementDailyUsed(providerName)
        this.ledger.incrementMonthlyUsed(providerName)
      } else {
        this.ledger.incrementMonthlyUsed(providerName)
      }
      this.ledger.recordSuccess(providerName)

      return results.map(result => ({
        ...result,
        source: providerName
      }))

    } catch (error) {
      this.handleProviderError(providerName, error)
      return []
    }
  }

  /**
   * Execute providers in parallel
   */
  async executeParallel(providerNames, query, options) {
    const promises = providerNames.map(name =>
      this.executeProviderInChain(name, query, options)
    )

    const resultsArrays = await Promise.all(promises)
    return resultsArrays.flat()
  }

  /**
   * Handle provider errors
   */
  handleProviderError(providerName, error) {
    if (error.message === 'QUOTA_EXCEEDED_DAILY') {
      this.ledger.markQuotaExceeded(providerName, this.ledger._getNextDailyReset())
    } else if (error.message === 'QUOTA_EXCEEDED_MONTHLY') {
      this.ledger.markQuotaExceeded(providerName)
    } else if (error.message.includes('5') || error.message.includes('timeout')) {
      this.ledger.recordError(providerName, '5xx')
    } else {
      this.ledger.recordError(providerName, '4xx')
    }
  }

  /**
   * Deduplicate results
   */
  deduplicateResults(results) {
    const seen = new Set()
    const deduplicated = []

    for (const result of results) {
      const canonicalUrl = this.canonicalizeUrl(result.url)
      if (!seen.has(canonicalUrl)) {
        seen.add(canonicalUrl)
        deduplicated.push(result)
      }
    }

    return deduplicated
  }

  /**
   * Canonicalize URL
   */
  canonicalizeUrl(url) {
    try {
      const parsed = new URL(url)
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
      trackingParams.forEach(param => parsed.searchParams.delete(param))
      return `${parsed.host}${parsed.pathname}${parsed.search}`.toLowerCase()
    } catch {
      return url.toLowerCase()
    }
  }

  /**
   * Format final results
   */
  formatResults(searchResult, limit, debug = false) {
    const results = searchResult.results || []

    const formatted = results.slice(0, limit).map(result => ({
      title: result.title || 'No title',
      url: result.url || '#',
      snippet: result.snippet || '',
      source: result.source || 'unknown',
      score: result.score || 0,
      thumbnail: result.thumbnail || null,
      published_at: result.published_at || null,
      author: result.author || null
    }))

    const response = {
      results: formatted,
      query: searchResult.query,
      mode: searchResult.mode,
      timestamp: Date.now(),
      cached: false,
      requestId: crypto.randomUUID(),
      totalUnique: searchResult.totalUnique || formatted.length,
      dedupedCount: searchResult.dedupedCount || 0
    }

    if (debug) {
      response.sliceBreakdown = searchResult.sliceBreakdown
      response.ledgerState = this.ledger.getDiagnostics()
    }

    return response
  }
}
