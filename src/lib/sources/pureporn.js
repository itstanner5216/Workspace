// src/lib/sources/pureporn.js

export class PurepornProvider {
  constructor() {
    this.name = 'Pureporn'
    this.baseUrl = 'https://pureporn-api1.p.rapidapi.com'
    this.version = '1.0.0'
    this.monthlyCap = 1000
    this.ttl = 24 * 60 * 60 // 24 hours
    this.batchSize = 15
  }

  async search(query, options, env) {
    const apiKey = env.PUREPORN_API_KEY

    if (!apiKey) {
      console.warn('Pureporn API key not configured')
      return []
    }

    const ledger = options.ledger
    if (ledger) {
      const state = ledger.getProviderState('pureporn')
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded('pureporn')
        throw new Error('RATE_LIMIT')
      }
    }

    try {
      // Use Videos/list endpoint for search
      const filterBody = {
        searchTerm: query,
        purpose: 'Gay', // Default purpose
        languageCode: options.languageCode || 'English',
        page: 1,
        count: Math.min(options.limit || 10, this.batchSize)
      }

      const response = await fetch(`${this.baseUrl}/api/Videos/list`, {
        method: 'POST',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'pureporn-api1.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filterBody),
        cf: {
          cacheTtl: this.ttl,
          cacheEverything: true
        }
      })

      if (!response.ok) {
        if (response.status === 400 || response.status === 422) {
          throw new Error('BAD_PARAMS')
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('BAD_PARAMS') // API key issues
        }
        if (response.status === 404) {
          throw new Error('BAD_HOST')
        }
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded('pureporn')
          throw new Error('RATE_LIMIT')
        }
        if (response.status >= 500) {
          throw new Error('UPSTREAM_ERROR')
        }
        throw new Error(`UPSTREAM_ERROR`) // Default to upstream error for unknown status codes
      }

      const data = await response.json()

      if (ledger) {
        ledger.recordSuccess('pureporn')
        ledger.incrementMonthlyUsed('pureporn')
      }

      // Add lightweight telemetry for max results detection
      console.log(`Pureporn telemetry: items_returned=${data.videos?.length || data.results?.length || 0}, pages_requested=1, server_pagination_hints=${data.totalPages || 'unknown'}`)

      return this.normalizeResults(data.videos || data.results || data || [], options)

    } catch (error) {
      if (ledger) {
        if (error.message.includes('QUOTA')) {
          ledger.markQuotaExceeded('pureporn')
        } else if (error.message.includes('RATE_LIMIT')) {
          ledger.markQuotaExceeded('pureporn')
        } else if (error.message.includes('UPSTREAM_ERROR') || error.message.includes('5')) {
          ledger.recordError('pureporn', '5xx')
        } else {
          ledger.recordError('pureporn', '4xx')
        }
      }
      throw error
    }
  }

  normalizeResults(results, options) {
    if (!Array.isArray(results)) return []

    // Combine filtering and mapping for performance
    return results.reduce((acc, item) => {
      if (
        (!item.imageUrl || item.imageUrl.startsWith('https://')) &&
        (!item.embeddingUrl || item.embeddingUrl.startsWith('https://'))
      ) {
        acc.push({
          title: item.title || 'No title',
          url: item.embeddingUrl || item.imageUrl || '#',
          snippet: item.title || '',
          published_at: item.publishDate || null,
          author: item.creator || null,
          thumbnail: item.imageUrl || null,
          score: 0.5,
          extra: {
            provider: 'pureporn',
            duration: item.duration,
            views: item.views,
            tags: item.tags ? item.tags.map(tag => tag.name || tag) : [],
            embed_url: item.embeddingUrl
          }
        });
      }
      return acc;
    }, []);
  }
}
