export class ApifyProvider {
  constructor() {
    this.name = 'Apify'
    this.baseUrl = 'https://api.apify.com/v2'
    this.version = '1.0.0'
    this.monthlyCap = 1428
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 50
  }

  async search(query, options, env) {
    const apiKey = env.APIFY_TOKEN

    if (!apiKey) {
      console.warn('Apify API token not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('apify')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('apify', this.getNextMonthlyReset())
        throw new Error('QUOTA_EXCEEDED_MONTHLY')
      }
    }

    try {
      const runParams = {
        queries: [query],
        maxPagesPerQuery: 1,
        resultsPerPage: Math.min(options.limit || 10, this.batchSize),
        languageCode: 'en',
        regionCode: 'us',
        mobileResults: false
      }

      if (options.fresh && options.fresh !== 'all') {
        const days = options.fresh.replace('d', '')
        runParams.dateRange = `d${days}`
      }

      // Use synchronous endpoint to avoid 400 errors
      const response = await fetch(`${this.baseUrl}/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        body: JSON.stringify(runParams),
        cf: { timeout: 30000 }
      })

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('apify', this.getNextMonthlyReset())
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
        throw new Error(`Apify error: ${response.status} - Query: ${query}`)
      }

      const results = await response.json()

      if (ledger) {
        ledger.recordSuccess('apify')
        ledger.incrementMonthlyUsed('apify')
      }

      return this.normalizeResults(results, options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA') || error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('apify', this.getNextMonthlyReset())
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5xx')) {
          ledger.recordError('apify', '5xx')
        } else {
          ledger.recordError('apify', '5xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    return results.map(item => ({
      title: item.title || 'No title',
      url: item.url || '#',
      snippet: item.snippet || item.description || '',
      published_at: item.date || null,
      author: item.displayedLink || null,
      thumbnail: item.thumbnail || null,
      score: 0.5,
      extra: {
        provider: 'apify',
        position: item.position,
        domain: item.domain
      }
    }))
  }
}
