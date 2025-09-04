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
      console.warn('RapidAPI key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger && ledger.recordSuccess) {
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
          if (ledger && ledger.markQuotaExceeded) ledger.markQuotaExceeded('seznam', this.getNextDailyReset())
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`Seznam API error: ${data.error || response.status}`)
      }

      if (ledger && ledger.recordSuccess) {
        ledger.recordSuccess('seznam')
        ledger.incrementDailyUsed('seznam')
      }

      return this.normalizeResults(data, options)

    } catch (error) {
      if (ledger && ledger.recordError) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('seznam', this.getNextDailyReset())
        } else {
          ledger.recordError('seznam', '5xx')
        }
      }
      throw error
    }
  }

  normalizeResults(data, options) {
    // Parse JSON once and extract first title + URL by checking in order: results → organic → items → data
    let results = []
    let pathUsed = 'seznam:cz-api'

    if (data.results && Array.isArray(data.results)) {
      results = data.results
    } else if (data.organic && Array.isArray(data.organic)) {
      results = data.organic
    } else if (data.items && Array.isArray(data.items)) {
      results = data.items
    } else if (data.data && Array.isArray(data.data)) {
      results = data.data
    }

    if (results.length === 0) {
      // Return status="empty" with top_level_keys and array_lengths
      const topLevelKeys = Object.keys(data)
      const arrayLengths = {}
      topLevelKeys.forEach(key => {
        if (Array.isArray(data[key])) {
          arrayLengths[key] = data[key].length
        }
      })

      return [{
        status: 'empty',
        top_level_keys: topLevelKeys,
        array_lengths: arrayLengths,
        path_used: pathUsed
      }]
    }

    // Find first object that has both title and url
    const firstValid = results.find(item =>
      (item.title || item.name || item.displayedLink) &&
      (item.url || item.link || item.displayedUrl)
    )

    if (!firstValid) {
      return [{
        status: 'empty',
        top_level_keys: Object.keys(data),
        path_used: pathUsed
      }]
    }

    return [{
      title: firstValid.title || firstValid.name || firstValid.displayedLink || 'No title',
      url: firstValid.url || firstValid.link || firstValid.displayedUrl || '#',
      snippet: firstValid.snippet || firstValid.description || '',
      published_at: firstValid.date || null,
      author: firstValid.domain || firstValid.displayedLink || null,
      thumbnail: firstValid.thumbnail || null,
      score: 0.85,
      path_used: pathUsed,
      extra: {
        provider: 'seznam',
        position: firstValid.position,
        domain: firstValid.domain
      }
    }]
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
