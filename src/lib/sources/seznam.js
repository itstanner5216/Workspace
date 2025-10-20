export class SeznamProvider {
  constructor() {
    this.name = 'Seznam'
    this.baseUrl = 'https://seznam-cz-search-engine-api.p.rapidapi.com/search'
    this.dailyCap = 6
    this.monthlyCap = 200
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 25
  }

  async search(query, options, env) {
    const apiKey = env.RAPIDAPI_KEY

    if (!apiKey) {
      console.warn('Seznam API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('seznam')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('seznam', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        q: query,
        count: Math.min(options.limit || 10, this.batchSize),
        format: 'json',
        lang: 'en'
      })

      // Add freshness filter
      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        params.append('freshness', `pd${days}`)
      }

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'seznam-cz-search-engine-api.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        cf: { timeout: 10000 }
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('seznam', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`Seznam API error: ${data.error || response.status}`)
      }

      if (ledger) {
        ledger.recordSuccess('seznam')
        ledger.incrementDailyUsed('seznam')
      }

      return this.normalizeResults(data.results || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('seznam', this.getNextDailyReset())
        } else {
          ledger.recordError('seznam', '5xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || '#',
      snippet: item.snippet || '',
      published_at: item.date || null,
      author: item.domain || null,
      thumbnail: item.thumbnail || null,
      score: 0.85,
      extra: {
        provider: 'seznam',
        position: item.position,
        domain: item.domain
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
