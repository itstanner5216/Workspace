export class BraveProvider {
  constructor() {
    this.name = 'Brave'
    this.baseUrl = 'https://api.search.brave.com/res/v1/web/search'
  }

  async search(query, options, env) {
    const apiKey = env.BRAVE_API_KEY

    if (!apiKey) {
      console.warn('Brave API key not configured')
      return []
    }

    try {
      const params = new URLSearchParams({
        q: query,
        count: Math.min(options.limit || 10, 20),
        safesearch: options.safeMode ? 'strict' : 'off'
      })

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Brave API error: ${response.status}`)
      }

      return (data.web?.results || []).map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        score: result.score || 1,
        thumbnail: result.thumbnail?.src || null,
        published_at: null,
        author: result.meta_url?.hostname || null
      }))

    } catch (error) {
      console.warn('Brave search error:', error.message)
      return []
    }
  }
}
