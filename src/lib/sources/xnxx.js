// src/lib/sources/xnxx.js

export class XnxxProvider {
  constructor() {
    this.name = 'XNXX'
    this.baseUrl = 'https://porn-xnxx-api.p.rapidapi.com'
    this.version = '1.0.0'
    this.monthlyCap = 100
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 10
  }

  async search(query, options, env) {
    const apiKey = env.XNXX_API_KEY

    if (!apiKey) {
      console.warn('XNXX API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('xnxx')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('xnxx')
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    try {
      // Use search endpoint with query body
      const requestBody = {
        q: query
      }

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'porn-xnxx-api.p.rapidapi.com',
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
        if (response.status === 401 || response.status === 403) {
          throw new Error('BAD_PARAMS') // API key issues
        }
        if (response.status === 404) {
          throw new Error('BAD_HOST')
        }
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('xnxx')
          throw new Error('RATE_LIMIT')
        }
        if (response.status >= 500) {
          throw new Error('UPSTREAM_ERROR')
        }
        throw new Error(`UPSTREAM_ERROR`) // Default to upstream error for unknown status codes
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('xnxx')
        ledger.incrementMonthlyUsed('xnxx')
      }

      // Add lightweight telemetry for max results detection
      console.log(`XNXX telemetry: items_returned=${data.results?.length || 0}, pages_requested=1, server_pagination_hints=unknown`)

      // Robustly handle different API response structures
      let resultsArray = [];
      if (Array.isArray(data?.results)) {
        resultsArray = data.results;
      } else if (Array.isArray(data)) {
        resultsArray = data;
      } else if (data?.results && typeof data.results === 'object') {
        resultsArray = Object.values(data.results);
      } else if (typeof data === 'object' && data !== null) {
        resultsArray = [data];
      }
      return this.normalizeResults(resultsArray, options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('xnxx')
        } else if (error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('xnxx')
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5')) {
          ledger.recordError('xnxx', '5xx')
        } else {
          ledger.recordError('xnxx', '4xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    if (!Array.isArray(results)) return []

    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || item.video_url || '#',
      snippet: item.description || item.snippet || '',
      published_at: item.upload_date || item.created_at || null,
      author: item.author || item.uploader || null,
      thumbnail: item.thumbnail || item.thumb || null,
      score: 0.5,
      extra: {
        provider: 'xnxx',
        videoId: item.id,
        duration: item.duration,
        category: item.category || 'gay'
      }
    }))
  }
}
