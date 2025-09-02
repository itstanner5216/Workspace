export class AdultMediaProvider {
  constructor() {
    this.name = 'AdultMedia'
    this.baseUrl = 'https://adultdatalink.p.rapidapi.com'
  }

  async search(query, options, env) {
    const apiKey = env.ADULTMEDIA_API_KEY

    if (!apiKey) {
      console.warn('AdultMedia API key not configured')
      return []
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'adultdatalink.p.rapidapi.com'
        },
        body: JSON.stringify({
          query: query,
          limit: Math.min(options.limit || 10, 20),
          safemode: options.safeMode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`AdultMedia API error: ${response.status}`)
      }

      return (data.results || []).map(item => ({
        title: item.title || 'No title',
        url: item.url || '#',
        snippet: item.description || '',
        score: item.score || 0,
        thumbnail: item.thumbnail || null,
        published_at: item.published_at || null,
        author: item.author || null,
        extra: {
          category: item.category,
          tags: item.tags
        }
      }))

    } catch (error) {
      console.warn('AdultMedia search error:', error.message)
      return []
    }
  }
}
