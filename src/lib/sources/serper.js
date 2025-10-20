export class SerperProvider {
  constructor() {
    this.name = 'Serper'
    this.baseUrl = 'https://google.serper.dev/search'
    this.dailyCap = 83
    this.monthlyCap = 2500
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 10
  }

  async search(query, options, env) {
    const apiKey = env.SERPER_KEY

    if (!apiKey) {
      console.warn('Serper API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('serper')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('serper', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        q: query,
        apiKey: apiKey
      })

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('serper', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`Serper API error: ${response.status}`)
      }

      if (ledger) {
        ledger.recordSuccess('serper')
        ledger.incrementDailyUsed('serper')
      }

      return (data.organic || []).map(item => ({
        title: item.title || 'No title',
        url: item.link || '#',
        snippet: item.snippet || '',
        score: 0.5,
        thumbnail: item.thumbnail || null,
        published_at: item.date || null,
        author: item.displayed_link || null,
        extra: {
          provider: 'serper',
          position: item.position,
          domain: item.displayed_link
        }
      }))

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('serper', this.getNextDailyReset())
        } else {
          ledger.recordError('serper', '5xx')
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
