export class ApifyProvider {
  constructor() {
    this.name = 'Apify'
    this.baseUrl = 'https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items'
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
        ledger.markQuotaExceeded('apify')
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

      // Use synchronous endpoint
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        body: JSON.stringify(runParams),
        cf: { timeout: 30000 }
      })

      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('apify')
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`Apify error: ${response.status}`)
      }

      const results = await response.json()

      if (ledger) {
        ledger.recordSuccess('apify')
        ledger.incrementMonthlyUsed('apify')
      }

      return this.normalizeResults(results, options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('apify')
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
