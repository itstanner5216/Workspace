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
      const requestBody = {
        q: query,
        limit: Math.min(options.limit || 10, this.batchSize)
      }

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'quality-porn.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        cf: {
          cacheTtl: this.ttl,
          cacheEverything: true
        }
      })

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('BAD_PARAMS')
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
        throw new Error(`QualityPorn error: ${response.status}`)
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('qualityporn')
        ledger.incrementMonthlyUsed('qualityporn')
      }

      return this.normalizeResults(data.results || [], options)

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
