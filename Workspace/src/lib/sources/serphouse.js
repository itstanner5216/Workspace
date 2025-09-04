/**
 * SerpHouse Provider
 * SERP API via SerpHouse
 */

export class SerpHouseProvider {
  constructor() {
    this.name = 'SerpHouse'
    this.baseUrl = 'https://api.serphouse.com/serp'
    this.version = '1.0.0'
    this.dailyCap = 13
    this.monthlyCap = 400
    this.ttl = 4 * 24 * 60 * 60 // 4 days
    this.batchSize = 75
  }

  async search(query, options, env) {
    const apiKey = env.SERPHOUSE_KEY

    if (!apiKey) {
      console.warn('SerpHouse API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('serphouse')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = {
        q: query,
        num: Math.min(options.limit || 10, this.batchSize),
        domain: 'google.com',
        lang: 'en',
        device: 'desktop',
        serp_type: 'web'
      }

      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        params.time_period = `past_${days}_days`
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        body: JSON.stringify(params),
        cf: { timeout: 15000 }
      })

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`SerpHouse error: ${response.status}`)
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('serphouse')
        ledger.incrementDailyUsed('serphouse')
      }

      return this.normalizeResults(data.results || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
        } else {
          ledger.recordError('serphouse', '5xx')
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
      published_at: item.date || null,
      author: item.domain || null,
      thumbnail: null,
      score: 0.7,
      extra: {
        provider: 'serphouse',
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
