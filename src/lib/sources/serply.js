export class SerplyProvider {
  constructor() {
    this.name = 'Serply'
    this.baseUrl = 'https://api.serply.io/v1/search'
    this.monthlyCap = 1000
    this.batchSize = 75
    this.cacheTtl = 48 * 60 * 60 // 48 hours
  }

  async search(query, options, env) {
    const apiKey = env.SERPLY_API_KEY

    if (!apiKey) {
      console.warn('Serply API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('serply')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('serply', this.getNextMonthlyReset())
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    // Check cache first
    const cacheKey = `serply:${query}`
    if (!options.cache_bypass && env.CACHE) {
      try {
        const cachedResult = await env.CACHE.get(cacheKey)
        if (cachedResult) {
          console.log('Serply cache hit for query:', query)
          const cachedData = JSON.parse(cachedResult)
          if (ledger) {
            ledger.recordSuccess('serply')
          }
          return cachedData.slice(0, options.limit || 10)
        }
      } catch (cacheError) {
        console.warn('Serply cache read error:', cacheError.message)
      }
    }

    try {
      const params = new URLSearchParams({
        q: query,
        num: Math.min(options.limit || 10, this.batchSize)
      })

      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        params.append('time_period', `past_${days}_days`)
      }

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'User-Agent': 'Jack-Portal/2.0.0'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('serply', this.getNextMonthlyReset())
          throw new Error('RATE_LIMIT')
        }
        if (response.status === 404) {
          throw new Error('BAD_HOST')
        }
        if (response.status === 400 || response.status === 422) {
          throw new Error('BAD_PARAMS')
        }
        if (response.status >= 500) {
          throw new Error('UPSTREAM_ERROR')
        }
        throw new Error(`Serply API error: ${response.status}`)
      }

      if (ledger) {
        ledger.recordSuccess('serply')
        ledger.incrementMonthlyUsed('serply')
      }

      const results = Array.isArray(data.results) ? data.results : []
      if (!Array.isArray(data.results)) {
        console.warn('Serply response.results is not an array:', data.results)
      }

      const normalizedResults = results.map(item => ({
        title: item.title || 'No title',
        url: item.url || '#',
        snippet: item.description || '',
        published_at: item.date || null,
        author: item.domain || null,
        thumbnail: item.thumbnail || null,
        score: 0.5,
        extra: {
          provider: 'serply',
          position: item.position,
          domain: item.domain
        }
      }))

      // Cache the results
      if (!options.cache_bypass && env.CACHE) {
        try {
          await env.CACHE.put(cacheKey, JSON.stringify(normalizedResults), {
            expirationTtl: this.cacheTtl
          })
          console.log('Serply cached results for query:', query, 'TTL:', this.cacheTtl)
        } catch (cacheWriteError) {
          console.warn('Serply cache write error:', cacheWriteError.message)
        }
      }

      return normalizedResults

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA') || error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('serply', this.getNextMonthlyReset())
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5xx')) {
          ledger.recordError('serply', '5xx')
        } else {
          ledger.recordError('serply', '5xx')
        }
      }
      throw error
    }
  }

  getNextMonthlyReset() {
    const now = new Date()
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
    return nextReset.toISOString()
  }
}
