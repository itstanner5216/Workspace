export class SeznamProvider {
  constructor() {
    this.name = 'Seznam'
    this.baseUrl = 'https://seznam-cz-search-engine-api.p.rapidapi.com'
    this.version = '1.0.0'
    this.monthlyCap = 200
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 25
  }

  async search(query, options, env) {
    const apiKey = env.SEZNAM_API_KEY

    if (!apiKey) {
      console.warn('Seznam API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('seznam')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('seznam')
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    try {
      const params = new URLSearchParams({
        q: query
      })

      // Add freshness filter if provided
      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        params.append('freshness', `pd${days}`)
      }

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'seznam-cz-search-engine-api.p.rapidapi.com',
          'x-rapidapi-key': apiKey
        },
        cf: {
          cacheTtl: this.ttl,
          cacheEverything: true
        }
      })

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('BAD_PARAMS')
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('BAD_PARAMS') // API key issues
        }
        if (response.status === 404) {
          throw new Error('BAD_HOST')
        }
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('seznam')
          throw new Error('RATE_LIMIT')
        }
        if (response.status >= 500) {
          throw new Error('UPSTREAM_ERROR')
        }
        throw new Error('UPSTREAM_ERROR') // Default to upstream error for unknown status codes
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('seznam')
        ledger.incrementMonthlyUsed('seznam')
      }

      // Add lightweight telemetry for max results detection
      console.log(`Seznam telemetry: items_returned=${data?.results?.length || data?.length || 0}, pages_requested=1, server_pagination_hints=unknown`)

      return this.normalizeResults(data.results || data || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('seznam')
        } else if (error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('seznam')
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5')) {
          ledger.recordError('seznam', '5xx')
        } else {
          ledger.recordError('seznam', '4xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    if (!Array.isArray(results)) return []

    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || '#',
      snippet: item.snippet || '',
      published_at: item.date || null,
      author: item.domain || null,
      thumbnail: item.thumbnail || null,
      score: 0.85,
      extra: {
        provider: 'seznam',
        position: item.position,
        domain: item.domain
      }
    }))
  }
}
