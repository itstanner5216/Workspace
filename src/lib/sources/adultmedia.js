// src/lib/sources/adultmedia.js
/**
 * @deprecated This provider has been removed from main search chains and is no longer maintained.
 * Consider removing this file entirely.
 */

 /**
  * @deprecated This provider is deprecated and no longer maintained.
  */
export class AdultMediaProvider {
  constructor() {
    this.name = 'AdultMedia'
    // Switched to the confirmed working endpoint
    this.baseUrl = 'https://porn-api-adultdatalink.p.rapidapi.com/pornpics/search'
    this.version = '1.0.0'
    this.monthlyCap = 5000
    this.ttl = 3 * 24 * 60 * 60 // 3 days
    this.batchSize = 20
  }

  async search(query, options, env) {
    const apiKey = env.ADULTMEDIA_API_KEY

    if (!apiKey) {
      console.warn('AdultMedia API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('adultmedia')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('adultmedia')
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    try {
      const params = new URLSearchParams({
        query: query,
        // The 'count' parameter is correct for this API
        count: Math.min(options.limit || 10, this.batchSize)
      })

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          // Host header now matches the working endpoint
          'X-RapidAPI-Host': 'porn-api-adultdatalink.p.rapidapi.com'
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
          if (ledger) ledger.markQuotaExceeded('adultmedia')
          throw new Error('RATE_LIMIT')
        }
        if (response.status >= 500) {
          throw new Error('UPSTREAM_ERROR')
        }
        throw new Error('UPSTREAM_ERROR') // Default to upstream error for unknown status codes
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('adultmedia')
        ledger.incrementMonthlyUsed('adultmedia')
      }

      // Use the new, specific normalizer for this API's data
      return this.normalizeResults(data.images || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('adultmedia')
        } else if (error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('adultmedia')
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5')) {
          ledger.recordError('adultmedia', '5xx')
        } else {
          ledger.recordError('adultmedia', '4xx')
        }
      }
      throw error
    }
  }

  /**
   * Rewritten to handle the data structure from the porn-api-adultdatalink endpoint.
   */
  normalizeResults(results, options) {
    return results.map(item => ({
      title: item.title || 'No title',
      url: item.image_url || item.url || '#',
      snippet: item.source || '',
      published_at: null, // This data is not available from this API
      author: item.source || null,
      thumbnail: item.thumb_url || item.image_url || null,
      score: 0.5,
      extra: {
        provider: 'adultmedia',
        image_id: item.id,
        source: item.source
      }
    }))
  }
}
