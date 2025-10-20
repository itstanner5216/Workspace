/**
 * Pornhub Provider (RapidAPI)
 * Uses RapidAPI Pornhub API
 */

export class PornhubProvider {
  constructor() {
    this.name = 'Pornhub'
    this.baseUrl = 'https://pornhub-api1.p.rapidapi.com'
    this.dailyCap = 300
    this.monthlyCap = 9000
  }

  async search(query, options, env) {
    const apiKey = env.RAPIDAPI_KEY

    if (!apiKey) {
      console.warn('RapidAPI key not configured for Pornhub')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('pornhub')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('pornhub', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: Math.min(options.limit || 10, 20)
      })

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'pornhub-api1.p.rapidapi.com'
        },
        signal: AbortSignal.timeout(10000)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('pornhub', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`Pornhub API error: ${response.status}`)
      }

      if (ledger) {
        ledger.recordSuccess('pornhub')
        ledger.incrementDailyUsed('pornhub')
      }

      return (data.videos || data.results || []).map(item => ({
        title: item.title || 'No title',
        url: item.url || item.link || '#',
        snippet: item.description || item.snippet || '',
        score: 0.7,
        thumbnail: item.thumbnail || item.thumb || null,
        published_at: item.publish_date || item.date || null,
        author: item.author || item.channel || null,
        extra: {
          provider: 'pornhub',
          duration: item.duration,
          views: item.views
        }
      }))

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('pornhub', this.getNextDailyReset())
        } else {
          ledger.recordError('pornhub', '5xx')
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
