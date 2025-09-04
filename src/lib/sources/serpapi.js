/**
 * SerpApi Provider
 * Google Search via SerpApi
 */

export class SerpApiProvider {
  constructor() {
    this.name = 'SerpApi'
    this.baseUrl = 'https://serpapi.com/search'
    this.version = '1.0.0'
    this.dailyCap = 100
    this.monthlyCap = 3000
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 10 // Default batch size
  }

  async search(query, options, env) {
    const apiKey = env.SERPAPI_KEY

    if (!apiKey) {
      console.warn('SerpApi API key not configured')
      return []
    }

    // Check daily cap
    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('serpapi')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('serpapi', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        q: query,
        api_key: apiKey,
        engine: 'google',
        num: Math.min(options.limit || 10, this.batchSize),
        start: 0
      })

      // Add freshness filter
      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        params.append('tbs', `qdr:d${days}`)
      }

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        cf: { timeout: 10000 }
      })

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('serpapi', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`SerpApi error: ${response.status}`)
      }

      const data = await response.json()

      // Record success
      if (ledger) {
        ledger.recordSuccess('serpapi')
        ledger.incrementDailyUsed('serpapi')
      }

      // Normalize results
      return this.normalizeResults(data.organic_results || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('serpapi', this.getNextDailyReset())
        } else {
          ledger.recordError('serpapi', '5xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    return results.map(item => ({
      title: item.title || 'No title',
      url: item.link || '#',
      snippet: item.snippet || '',
      published_at: item.date || null,
      author: item.displayed_link || null,
      thumbnail: item.thumbnail?.src || null,
      score: 0.8,
      extra: {
        provider: 'serpapi',
        position: item.position,
        displayed_link: item.displayed_link,
        cached_page_link: item.cached_page_link
      }
    }))
  }

  getNextDailyReset() {
    // Next 00:00 America/New_York
    const now = new Date()
    const nextReset = new Date(now)
    nextReset.setUTCHours(4, 0, 0, 0) // 00:00 EST is 04:00 UTC
    if (nextReset <= now) {
      nextReset.setDate(nextReset.getDate() + 1)
    }
    return nextReset.toISOString()
  }
}
