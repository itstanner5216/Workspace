export class AdultMediaProvider {
  constructor() {
    this.name = 'AdultMedia'
    this.baseUrl = 'https://porn-api-adultdatalink.p.rapidapi.com/pornpics/search'
    this.requestsDailyCap = 50 // 25 objects/request × 50 = 1250 objects
    this.objectsDailyCap = 1250 // API's actual quota
    this.monthlyCap = 1500 // requests per month
    this.ttl = 5 * 24 * 60 * 60 // 5 days
    this.batchSize = 25
  }

  async search(query, options, env) {
    const apiKey = env.RAPIDAPI_KEY

    if (!apiKey) {
      console.warn('RapidAPI key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger && ledger.recordSuccess) {
      const state = ledger.getProviderState('adultmedia')
      if (state.requestsDailyUsed >= this.requestsDailyCap) {
        ledger.markQuotaExceeded('adultmedia', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: Math.min(options.limit || 10, this.batchSize)
      })

      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        params.append('freshness', `d${days}`)
      }

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'porn-api-adultdatalink.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        cf: { timeout: 15000 }
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger && ledger.markQuotaExceeded) ledger.markQuotaExceeded('adultmedia', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`AdultMedia API error: ${response.status}`)
      }

      if (ledger && ledger.recordSuccess) {
        ledger.recordSuccess('adultmedia')
        ledger.incrementRequestsDailyUsed('adultmedia')
        // Increment objects based on actual results returned
        const objectsReturned = (data.results || []).length
        ledger.incrementObjectsDailyUsed('adultmedia', objectsReturned)
      }

      return this.normalizeResults(data, options)

    } catch (error) {
      if (ledger && ledger.recordError) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('adultmedia', this.getNextDailyReset())
        } else {
          ledger.recordError('adultmedia', '5xx')
        }
      }
      throw error
    }
  }

  normalizeResults(data, options) {
    const results = data.results || []
    if (results.length === 0) {
      return []
    }

    // Return the first media URL
    const first = results[0]
    return [{
      title: first.title || 'No title',
      url: first.url || '#',
      media_url: first.url || first.thumbnail || null,
      snippet: first.description || '',
      score: first.score || 0,
      thumbnail: first.thumbnail || null,
      published_at: first.published_at || null,
      author: first.author || null,
      path_used: 'adultmedia:pornpics-search',
      extra: {
        provider: 'adultmedia',
        category: first.category,
        tags: first.tags
      }
    }]
  }

  getNextDailyReset() {
    const now = new Date()
    const nextReset = new Date(now)
    nextReset.setUTCHours(4, 0, 0, 0)
    if (nextReset <= now) {
      nextReset.setDate(nextReset.getDate() + 1)
    }
    return nextReset.toISOString()
  }
}
