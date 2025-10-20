/**
 * XNXX Provider (RapidAPI)
 * Uses RapidAPI Porn XNXX API
 */

export class XNXXProvider {
  constructor() {
    this.name = 'XNXX'
    this.baseUrl = 'https://porn-xnxx-api.p.rapidapi.com'
    this.dailyCap = 300
    this.monthlyCap = 9000
  }

  async search(query, options, env) {
    const apiKey = env.RAPIDAPI_KEY

    if (!apiKey) {
      console.warn('RapidAPI key not configured for XNXX')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('xnxx')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('xnxx', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        search: query,
        limit: Math.min(options.limit || 10, 20)
      })

      const response = await fetch(`${this.baseUrl}/download?${params}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'porn-xnxx-api.p.rapidapi.com'
        },
        signal: AbortSignal.timeout(10000)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('xnxx', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`XNXX API error: ${response.status}`)
      }

      if (ledger) {
        ledger.recordSuccess('xnxx')
        ledger.incrementDailyUsed('xnxx')
      }

      return (data.videos || data.results || []).map(item => ({
        title: item.title || 'No title',
        url: item.url || item.link || '#',
        snippet: item.description || item.snippet || '',
        score: 0.7,
        thumbnail: item.thumbnail || item.thumb || null,
        published_at: item.publish_date || item.date || null,
        author: item.author || item.uploader || null,
        extra: {
          provider: 'xnxx',
          duration: item.duration,
          views: item.views
        }
      }))

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('xnxx', this.getNextDailyReset())
        } else {
          ledger.recordError('xnxx', '5xx')
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
