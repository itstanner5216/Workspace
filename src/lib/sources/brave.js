export class BraveProvider {
  constructor() {
    this.name = 'Brave'
    this.baseUrl = 'https://api.search.brave.com/res/v1/web/search'
    this.dailyCap = 66
    this.monthlyCap = 2000
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 20
  }

  async search(query, options, env) {
    const apiKey = env.BRAVE_API_KEY

    if (!apiKey) {
      console.warn('Brave API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('brave')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('brave', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        q: query,
        count: Math.min(options.limit || 10, this.batchSize),
        safesearch: options.safeMode ? 'strict' : 'off'
      })

      // Add freshness filter
      if (options.fresh && options.fresh !== 'all') {
        if (options.fresh === 'd1') params.set('freshness', 'pd')
        else if (options.fresh === 'd7') params.set('freshness', 'pw')
        else if (options.fresh === 'd30') params.set('freshness', 'pm')
        else if (options.fresh === 'd365') params.set('freshness', 'py')
      }

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('brave', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`Brave API error: ${response.status}`)
      }

      if (ledger) {
        ledger.recordSuccess('brave')
        ledger.incrementDailyUsed('brave')
      }

      return (data.web?.results || []).map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        score: result.score || 1,
        thumbnail: result.thumbnail?.src || null,
        published_at: null,
        author: result.meta_url?.hostname || null,
        extra: {
          provider: 'brave',
          subtype: result.subtype,
          age: result.page_age
        }
      }))

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('brave', this.getNextDailyReset())
        } else {
          ledger.recordError('brave', '5xx')
        }
      }
      throw error
    }
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
