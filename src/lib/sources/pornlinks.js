// src/lib/sources/pornlinks.js

export class PornlinksProvider {
  constructor() {
    this.name = 'Pornlinks'
    this.baseUrl = 'https://porn-links.p.rapidapi.com'
    this.version = '1.0.0'
    this.monthlyCap = 1000
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 20
  }

  async search(query, options, env) {
    const apiKey = env.PORNLINKS_API_KEY

    if (!apiKey) {
      console.warn('Pornlinks API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('pornlinks')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('pornlinks')
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: Math.min(options.limit || 10, this.batchSize)
      })

      const response = await fetch(`${this.baseUrl}/porns?${params}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'porn-links.p.rapidapi.com'
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
          if (ledger) ledger.markQuotaExceeded('pornlinks')
          throw new Error('RATE_LIMIT')
        }
        if (response.status >= 500) {
          throw new Error('UPSTREAM_ERROR')
        }
        throw new Error(`UPSTREAM_ERROR`) // Default to upstream error for unknown status codes
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('pornlinks')
        ledger.incrementMonthlyUsed('pornlinks')
      }

      // Add lightweight telemetry for max results detection
      console.log(`Pornlinks telemetry: items_returned=${data.results?.length || 0}, pages_requested=1, server_pagination_hints=${data.totalPages || 'unknown'}`)

      return this.normalizeResults(data.results || data || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('pornlinks')
        } else if (error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('pornlinks')
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5')) {
          ledger.recordError('pornlinks', '5xx')
        } else {
          ledger.recordError('pornlinks', '4xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    if (!Array.isArray(results)) return []

    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || item.link || '#',
      snippet: item.description || item.snippet || '',
      published_at: item.published_at || null,
      author: item.author || item.source || null,
      thumbnail: item.thumbnail || item.image || null,
      score: 0.5,
      extra: {
        provider: 'pornlinks',
        category: item.category || 'gay'
      }
    }))
  }
}
