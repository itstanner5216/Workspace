export class GoogleProvider {
  constructor() {
    this.name = 'Google'
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1'
  }

  async search(query, options, env) {
    const apiKey = env.GOOGLE_API_KEY
    const cseId = env.GOOGLE_CSE_ID

    if (!apiKey || !cseId) {
      console.warn('Google API key or CSE ID not configured')
      return []
    }

    try {
      const params = new URLSearchParams({
        key: apiKey,
        cx: cseId,
        q: query,
        num: Math.min(options.limit || 10, 10), // Google limits to 10
        safe: options.safeMode ? 'active' : 'off'
      })

      if (options.site) {
        params.set('siteSearch', options.site)
      }

      const response = await fetch(`${this.baseUrl}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Google API error: ${data.error?.message || response.status}`)
      }

      return (data.items || []).map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        score: 1,
        thumbnail: item.pagemap?.cse_image?.[0]?.src || null,
        published_at: null,
        author: null
      }))

    } catch (error) {
      console.warn('Google search error:', error.message)
      return []
    }
  }
}
