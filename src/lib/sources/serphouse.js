/**
 * SerpHouse Provider
 * SERP API via SerpHouse
 */

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
    if (ledger) {
      const state = ledger.getProviderState('serphouse')
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
        throw new Error('QUOTA_EXCEEDED_DAILY')
      }
    }

    // Retry logic for network errors only
    let lastError = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const params = new URLSearchParams({
          api_token: apiKey,
          q: query,
          num_results: Math.min(options.limit || 10, this.batchSize),
          domain: 'google.com',
          lang: 'en',
          device: 'desktop',
          serp_type: 'web'
        })

        if (options.fresh && options.fresh !== 'all') {
          const days = options.fresh.replace('d', '')
          params.append('time_period', `past_${days}_days`)
        }

        const response = await fetch(`${this.baseUrl}?${params}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Jack-Portal/2.0.0'
          },
          cf: { timeout: 15000 }
        })

        if (!response.ok) {
          if (response.status === 429) {
            if (ledger) ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
            throw new Error('RATE_LIMIT')
          }
          if (response.status === 400 || response.status === 422) {
            throw new Error('BAD_PARAMS')
          }
          if (response.status === 404) {
            throw new Error('BAD_HOST')
          }
          if (response.status >= 500) {
            throw new Error('UPSTREAM_ERROR')
          }
          const safeUrl = `${this.baseUrl}?${params.toString()}`.replace(new RegExp(apiKey, 'g'), '[REDACTED]')
          throw new Error(`SerpHouse error: ${response.status} - URL: ${safeUrl}`)
        }

        const data = await response.json()

        if (ledger) {
          ledger.recordSuccess('serphouse')
          ledger.incrementDailyUsed('serphouse')
        }

        return this.normalizeResults(data.results || data || [], options)

        return this.normalizeResults(data.results || data || [], options)

      } catch (error) {
        lastError = error
        
        // Only retry on network errors, not HTTP errors
        const isNetworkError = error.name === 'TypeError' || 
                              error.message.includes('fetch') || 
                              error.message.includes('network') ||
                              error.message.includes('ECONNRESET') ||
                              error.message.includes('ENOTFOUND')
        
        if (!isNetworkError || attempt === 1) {
          // Not a network error or this was the second attempt
          break
        }
        
        // Wait with exponential backoff before retry
        const backoff = Math.pow(2, attempt) * 1000 // 1s, 2s, etc.
        await new Promise(resolve => setTimeout(resolve, backoff))
      }
    }

    // Handle final error
    if (ledger) {
      if (lastError.message.includes('QUOTA') || lastError.message.includes('RATE_LIMIT')) {
        ledger.markQuotaExceeded('serphouse', this.getNextDailyReset())
      } else if (lastError.message.includes('UPSTREAM_ERROR') || lastError.message.includes('5xx')) {
        ledger.recordError('serphouse', '5xx')
      } else {
        ledger.recordError('serphouse', '5xx')
      }
    }
    throw lastError
  }

  normalizeResults(results, options) {
    if (!Array.isArray(results)) {
      console.warn('SerpHouse results is not an array:', results)
      return []
    }
    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || '#',
      snippet: item.description || '',
      published_at: item.date || null,
      author: item.domain || null,
      thumbnail: null,
      score: 0.7,
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
