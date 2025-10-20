// src/lib/sources/pornhub.js

export class PornhubProvider {
  constructor() {
    this.name = 'Pornhub'
    this.baseUrl = 'https://pornhub-api1.p.rapidapi.com'
    this.version = '1.0.0'
    this.monthlyCap = 1000
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 20
  }

  async search(query, options, env) {
    const apiKey = env.PORNHUB_API_KEY

    if (!apiKey) {
      console.warn('Pornhub API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('pornhub')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('pornhub')
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'pornhub-api1.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          search: query,
          category: 'gay'
        }),
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
          if (ledger) ledger.markQuotaExceeded('pornhub')
          throw new Error('RATE_LIMIT')
        }
        if (response.status >= 500) {
          throw new Error('UPSTREAM_ERROR')
        }
        throw new Error(`UPSTREAM_ERROR`) // Default to upstream error for unknown status codes
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('pornhub')
        ledger.incrementMonthlyUsed('pornhub')
      }

      // Add lightweight telemetry for max results detection
      console.log(`Pornhub telemetry: items_returned=${data.results?.length || 0}, pages_requested=1, server_pagination_hints=${data.totalPages || 'unknown'}`)

      return this.normalizeResults(data.results || data || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('pornhub')
        } else if (error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('pornhub')
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5')) {
          ledger.recordError('pornhub', '5xx')
        } else {
          ledger.recordError('pornhub', '4xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    if (!Array.isArray(results)) return []

    return results.map(item => ({
      title: item.name || item.title || 'No title',
      url: item.url || item.link || '#',
      snippet: item.description || item.snippet || '',
      published_at: item.created_at || null,
      author: item.author || null,
      thumbnail: item.thumb || item.thumbnail || null,
      score: 0.5,
      extra: {
        provider: 'pornhub',
        category: item.category || 'gay'
      }
    }))
  }
}
