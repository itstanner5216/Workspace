export class YandexProvider {
  constructor() {
    this.name = 'Yandex'
    this.baseUrl = 'https://api.serpwow.com/search'
    this.dailyCap = 3
    this.monthlyCap = 100
    this.ttl = 4 * 24 * 60 * 60 // 4 days
    this.batchSize = 50
  }

  async search(query, options, env) {
    const apiKey = env.SERPWOW_API_KEY // Using SERPWOW_API_KEY for SERP Wow

    if (!apiKey) {
      console.warn('SERP Wow (Yandex) API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('yandex')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('yandex', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: query,
        engine: 'yandex',
        num: Math.min(options.limit || 10, this.batchSize),
        yandex_domain: options.yandex_domain || 'yandex.com',
        yandex_location: options.yandex_location || '',
        yandex_language: options.yandex_language || 'en'
      })

      // Add freshness filter
      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        params.append('tbs', `qdr:d${days}`)
      }

      const response = await fetch(`${this.baseUrl}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('yandex', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`SERP Wow error: ${data.error || response.status}`)
      }

      if (ledger) {
        ledger.recordSuccess('yandex')
        ledger.incrementDailyUsed('yandex')
      }

      return this.normalizeResults(data.organic_results || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('yandex', this.getNextDailyReset())
        } else {
          ledger.recordError('yandex', '5xx')
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
      published_at: item.date || null,
      author: item.displayed_link || null,
      thumbnail: item.thumbnail?.src || null,
      score: 0.9,
      extra: {
        provider: 'yandex',
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
