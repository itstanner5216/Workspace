export class QualityPornProvider {
  constructor() {
    this.name = 'QualityPorn'
    this.baseUrl = 'https://quality-porn.p.rapidapi.com'
    this.version = '1.0.0'
    this.monthlyCap = 9000
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 20
  }

  async search(query, options, env) {
    const apiKey = env.QUALITYPORN_API_KEY

    if (!apiKey) {
      console.warn('QualityPorn API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('qualityporn')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('qualityporn')
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    try {
      const params = new URLSearchParams({
        query: query,
        page: 1,
        timeout: 5000
      })

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'quality-porn.p.rapidapi.com'
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
          if (ledger) ledger.markQuotaExceeded('qualityporn')
          throw new Error('RATE_LIMIT')
        }
        if (response.status >= 500) {
          throw new Error('UPSTREAM_ERROR')
        }
        throw new Error('UPSTREAM_ERROR') // Default to upstream error for unknown status codes
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('qualityporn')
        ledger.incrementMonthlyUsed('qualityporn')
      }

      // Add lightweight telemetry for max results detection
      console.log(`QualityPorn telemetry: items_returned=${data?.results?.length || data?.videos?.length || data?.length || 0}, pages_requested=1, server_pagination_hints=unknown`)

      return this.normalizeResults(data.results || data.videos || data || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('qualityporn')
        } else if (error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('qualityporn')
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5')) {
          ledger.recordError('qualityporn', '5xx')
        } else {
          ledger.recordError('qualityporn', '4xx')
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
      published_at: item.published_at || null,
      author: item.author || null,
      thumbnail: item.thumbnail || null,
      score: 0.6,
      extra: {
        provider: 'qualityporn',
        category: item.category,
        tags: item.tags || []
      }
    }))
  }
}
