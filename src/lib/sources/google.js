export class GoogleProvider {
  constructor() {
    this.name = 'Google'
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1'
    this.dailyCap = 100
    this.monthlyCap = 3000
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 10 // Google CSE limit
  }

  async search(query, options, env) {
    const apiKey = env.GOOGLE_API_KEY
    const cseId = env.GOOGLE_CSE_ID

    if (!apiKey || !cseId) {
      console.warn('Google API key or CSE ID not configured')
      return []
    }

    // Check daily cap
    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('google')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('google', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        key: apiKey,
        cx: cseId,
        q: query,
        num: Math.min(options.limit || 10, this.batchSize),
        safe: options.safeMode ? 'active' : 'off'
      })

      // Add date restriction for freshness
      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        if (days && !isNaN(days)) {
          params.set('dateRestrict', `d${days}`)
        }
      }

      if (options.site) {
        params.set('siteSearch', options.site)
      }

      const response = await fetch(`${this.baseUrl}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('google', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`Google API error: ${data.error?.message || response.status}`)
      }

      // Record usage
      if (ledger) {
        ledger.recordSuccess('google')
        ledger.incrementDailyUsed('google')
      }

      return this.normalizeResults(data.items || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('google', this.getNextDailyReset())
        } else {
          ledger.recordError('google', '5xx')
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
      published_at: null,
      author: null,
      thumbnail: item.pagemap?.cse_image?.[0]?.src || null,
      score: 1.0,
      extra: {
        provider: 'google',
        displayLink: item.displayLink
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
