import { GoogleProvider } from './sources/google.js'
import { BraveProvider } from './sources/brave.js'
import { YandexProvider } from './sources/yandex.js'
import { AdultMediaProvider } from './sources/adultmedia.js'

export class SearchService {
  constructor(env) {
    this.env = env
    this.providers = {
      google: new GoogleProvider(),
      brave: new BraveProvider(),
      yandex: new YandexProvider(),
      adultmedia: new AdultMediaProvider()
    }
  }

  async search(options) {
    const { provider, query, limit = 10 } = options

    try {
      // If specific provider requested
      if (provider && this.providers[provider]) {
        console.log(`Searching with ${provider} provider`)
        const results = await this.providers[provider].search(query, options, this.env)
        return this.formatResults(results, limit)
      }

      // Multi-provider search (default behavior)
      console.log('Performing multi-provider search')
      const allResults = []

      // Search all providers in parallel
      const searchPromises = Object.entries(this.providers).map(async ([name, providerInstance]) => {
        try {
          const results = await providerInstance.search(query, options, this.env)
          return results.map(result => ({ ...result, source: name }))
        } catch (error) {
          console.warn(`${name} provider error:`, error.message)
          return []
        }
      })

      const providerResults = await Promise.all(searchPromises)

      // Flatten and combine results
      providerResults.forEach(results => {
        allResults.push(...results)
      })

      // Sort by score and return top results
      return this.formatResults(
        allResults.sort((a, b) => (b.score || 0) - (a.score || 0)),
        limit
      )

    } catch (error) {
      console.error('Search service error:', error)
      throw error
    }
  }

  formatResults(results, limit) {
    return results.slice(0, limit).map(result => ({
      title: result.title || 'No title',
      url: result.url || '#',
      snippet: result.snippet || '',
      source: result.source || 'unknown',
      score: result.score || 0,
      thumbnail: result.thumbnail || null,
      published_at: result.published_at || null,
      author: result.author || null
    }))
  }
}
