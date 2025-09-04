export class QualityPornProvider {
  constructor() {
    this.name = 'QualityPorn'
    this.baseUrl = 'https://quality-porn.p.rapidapi.com/docs'
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
    if (ledger) {
      const state = ledger.getProviderState('qualityporn')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('qualityporn', this.getNextDailyReset())
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
          'x-rapidapi-host': 'quality-porn.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        cf: { timeout: 10000 }
      })

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('qualityporn', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`QualityPorn error: ${response.status}`)
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('qualityporn')
        ledger.incrementDailyUsed('qualityporn')
      }

      return this.normalizeResults(data.results || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('qualityporn', this.getNextDailyReset())
        } else {
          ledger.recordError('qualityporn', '5xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || '#',
      snippet: item.description || '',
      published_at: item.published_at || null,
      author: item.author || null,
      thumbnail: item.thumbnail || null,
      score: 0.6,
      extra: {
        provider: 'qualityporn',
        category: item.category,
        tags: item.tags || []
      }
    }))
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
