export class QualityPornProvider {
  constructor() {
    this.name = 'QualityPorn'
    this.baseUrl = 'https://quality-porn.p.rapidapi.com/search'
    this.version = '1.0.0'
    this.dailyCap = 300
    this.monthlyCap = 9000
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 20
  }

  async search(query, options, env) {
    const apiKey = env.RAPIDAPI_KEY

    if (!apiKey) {
      console.warn('RapidAPI key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger && ledger.recordSuccess) {
      const state = ledger.getProviderState('qualityporn')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('qualityporn', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        query: query,
        page: 1  // Start with page 1
      })

      // Optional params allowed: page, sort, quality, duration, tags, category
      if (options.limit) {
        // QualityPorn might use different param for limit
      }

      if (options.fresh && options.fresh !== 'all') {
        // Could add freshness if supported
      }

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'quality-porn.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        cf: { timeout: 10000 }
      })

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger && ledger.markQuotaExceeded) ledger.markQuotaExceeded('qualityporn', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`QualityPorn error: ${response.status}`)
      }

      const data = await response.json()

      if (ledger && ledger.recordSuccess) {
        ledger.recordSuccess('qualityporn')
        ledger.incrementDailyUsed('qualityporn')
      }

      return this.normalizeResults(data, options)

    } catch (error) {
      if (ledger && ledger.recordError) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('qualityporn', this.getNextDailyReset())
        } else {
          ledger.recordError('qualityporn', '5xx')
        }
      }
      throw error
    }
  }

  normalizeResults(data, options) {
    // If Array.isArray(data) and data.length>0, return title and URL using the first item
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0]
      return [{
        title: first.title || first.name || first.videoTitle || 'No title',
        url: first.url || first.link || first.videoUrl || first.pageUrl || '#',
        snippet: first.description || '',
        published_at: first.published_at || null,
        author: first.author || null,
        thumbnail: first.thumbnail || null,
        score: 0.6,
        path_used: 'qualityporn:search',
        extra: {
          provider: 'qualityporn',
          category: first.category,
          tags: first.tags || []
        }
      }]
    }

    // If empty, return status="empty" and count=0
    return [{
      status: 'empty',
      count: 0,
      path_used: 'qualityporn:search'
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
