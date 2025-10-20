import {
  GoogleProvider,
  SerpApiProvider,
  SerperProvider,
  YandexProvider,
  BraveProvider,
  SerpHouseProvider,
  QualityPornProvider,
  ApifyProvider,
  ScrapersProvider,
  AdaptersProvider,
  PornlinksProvider,
  PornhubProvider,
  PurepornProvider,
  XnxxProvider,
  SeznamProvider
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

    // Define chains by mode
    this.chains = {
      normal: {
        google_slice: ['google', 'serpapi', 'seznam', 'adapters_scrapers_parallel', 'apify'],
        qualityporn_xnxx_slice: ['qualityporn', 'xnxx', 'pornlinks', 'serphouse', 'adapters_scrapers_parallel', 'apify'],
        pornhub_pureporn_slice: ['pornhub', 'pureporn', 'pornlinks', 'serphouse', 'adapters_scrapers_parallel', 'apify'],
        adapters_slice: ['adapters_parallel', 'apify'],
        scrapers_slice: ['scrapers_parallel', 'apify']
      },
      deep_niche: {
        serply_slice: ['serply', 'serper', 'seznam', 'brave', 'serphouse', 'pornlinks', 'adapters_scrapers_parallel', 'apify'],
        qualityporn_xnxx_slice: ['qualityporn', 'xnxx', 'pornlinks', 'serphouse', 'adapters_scrapers_parallel', 'apify'],
        pornhub_pureporn_slice: ['pornhub', 'pureporn', 'pornlinks', 'serphouse', 'adapters_scrapers_parallel', 'apify'],
        adapters_slice: ['adapters_parallel', 'apify'],
        scrapers_slice: ['scrapers_parallel', 'apify']
      }
    }

    // Slice weights by mode
    this.sliceWeights = {
      normal: {
        google_slice: 0.50,
        qualityporn_xnxx_slice: 0.20,
        pornhub_pureporn_slice: 0.20,
        adapters_slice: 0.10,
        scrapers_slice: 0.00 // Not used in normal mode weighting
      },
      deep_niche: {
        serply_slice: 0.35,
        qualityporn_xnxx_slice: 0.15,
        pornhub_pureporn_slice: 0.25,
        adapters_slice: 0.25,
        scrapers_slice: 0.00 // Not used in deep niche mode weighting
      }
    }
  }

  /**
   * Initialize provider daily/monthly caps
   */
  _initializeProviderCaps() {
    // Set caps in ledger
    this.ledger.setMonthlyCap('google', Number(this.env.GOOGLE_MONTHLY_CAP) || 3000)
    this.ledger.setMonthlyCap('serpapi', Number(this.env.SERPAPI_MONTHLY_CAP) || 3000)
    this.ledger.setMonthlyCap('serper', Number(this.env.SERPER_MONTHLY_CAP) || 2500)
    this.ledger.setMonthlyCap('yandex', Number(this.env.YANDEX_MONTHLY_CAP) || 100)
    this.ledger.setMonthlyCap('brave', Number(this.env.BRAVE_MONTHLY_CAP) || 2000)
    this.ledger.setMonthlyCap('serphouse', Number(this.env.SERPHOUSE_MONTHLY_CAP) || 400)
    this.ledger.setMonthlyCap('qualityporn', Number(this.env.QUALITYPORN_MONTHLY_CAP) || 9000)
    this.ledger.setMonthlyCap('apify', Number(this.env.APIFY_MONTHLY_CAP) || 1428) // No daily cap

    // New provider caps
    this.ledger.setMonthlyCap('pornlinks', Number(this.env.PORNLINKS_MONTHLY_CAP) || 1000)
    this.ledger.setMonthlyCap('pornhub', Number(this.env.PORNHUB_MONTHLY_CAP) || 1000)
    this.ledger.setMonthlyCap('pureporn', Number(this.env.PUREPORN_MONTHLY_CAP) || 1000)
    this.ledger.setMonthlyCap('xnxx', Number(this.env.XNXX_MONTHLY_CAP) || 100) // Hard cap: 100/month
    this.ledger.setMonthlyCap('seznam', Number(this.env.SEZNAM_MONTHLY_CAP) || 200)

    // Scrapers and adapters have no caps
  }

  /**
   * Create provider instances
   */
  _createProviderInstances() {
    return {
      google: new GoogleProvider(),
      serpapi: new SerpApiProvider(),
      serper: new SerperProvider(),
      yandex: new YandexProvider(),
      brave: new BraveProvider(),
      serphouse: new SerpHouseProvider(),
      qualityporn: new QualityPornProvider(),
      apify: new ApifyProvider(),
      scrapers: new ScrapersProvider(),
      adapters: new AdaptersProvider(),
      pornlinks: new PornlinksProvider(),
      pornhub: new PornhubProvider(),
      pureporn: new PurepornProvider(),
      xnxx: new XnxxProvider(),
      seznam: new SeznamProvider()
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
    // Handle special parallel cases
    if (providerName === 'adapters_scrapers_parallel') {
      return await this.executeParallel(['adapters', 'scrapers'], query, options)
    }

    if (providerName === 'adapters_parallel') {
      return await this.executeParallel(['adapters'], query, options)
    }

    if (providerName === 'scrapers_parallel') {
      return await this.executeParallel(['scrapers'], query, options)
    }

    // Check provider health and caps
    if (!this.ledger.isProviderHealthy(providerName)) {
      this.ledger.setLastSkipReason(providerName, 'unhealthy')
      return []
    }

    const state = this.ledger.getProviderState(providerName)
    
    // Monthly cap checking only
    if (state.monthlyCap && state.monthlyUsed >= state.monthlyCap) {
      this.ledger.setLastSkipReason(providerName, 'monthly_cap_exceeded')
      return []
    }

    // Execute provider
    const provider = this.providers[providerName]
    if (!provider) return []

    try {
      const results = await provider.search(query, { ...options, ledger: this.ledger }, this.env)

      // Record usage
      this.ledger.incrementMonthlyUsed(providerName)
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
