export class SerpHouseProvider {
  constructor() {
    this.name = 'SerpHouse'
    this.baseUrl = 'https://api.serphouse.com/serp/live'
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
    if (ledger && ledger.recordSuccess) {
      const state = ledger.getProviderState('serphouse')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    let pathUsed = 'serphouse:post-bearer'

    try {
      // Try POST method first
      let response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        body: JSON.stringify({ "q": query, "responseType": "json" }),
        cf: { timeout: 15000 }
      })

      // If POST fails, try GET fallback
      if (!response.ok && response.status !== 429) {
        pathUsed = 'serphouse:get-token'
        const params = new URLSearchParams({
          q: query,
          responseType: 'json',
          api_token: apiKey
        })

        response = await fetch(`${this.baseUrl}?${params}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Jack-Portal/2.0.0'
          },
          cf: { timeout: 15000 }
        })
      }

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger && ledger.markQuotaExceeded) ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`SerpHouse error: ${response.status}`)
      }

      const data = await response.json()

      if (ledger && ledger.recordSuccess) {
        ledger.recordSuccess('serphouse')
        ledger.incrementDailyUsed('serphouse')
      }

      return this.normalizeResults(data.results || data || [], options, pathUsed)

    } catch (error) {
      if (ledger && ledger.recordError) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
        } else {
          ledger.recordError('serphouse', '5xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options, pathUsed) {
    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || '#',
      snippet: item.description || '',
      published_at: item.date || null,
      author: item.domain || null,
      thumbnail: null,
      score: 0.7,
      path_used: pathUsed,
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
