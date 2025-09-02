export class YandexProvider {
  constructor() {
    this.name = 'Yandex'
    this.baseUrl = 'https://yandex.com/search/xml'
  }

  async search(query, options, env) {
    const apiKey = env.YANDEX_API_KEY

    if (!apiKey) {
      console.warn('Yandex API key not configured')
      return []
    }

    try {
      const params = new URLSearchParams({
        query: query,
        key: apiKey,
        l10n: 'en',
        sortby: 'rlv',
        filter: 'none',
        maxpassages: '2',
        groupby: `attr=d.mode=deep.groups-on-page=${Math.min(options.limit || 10, 10)}.docs-in-group=1`
      })

      const response = await fetch(`${this.baseUrl}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Yandex API error: ${response.status}`)
      }

      // Note: Yandex XML API has a different response format
      // This is a simplified implementation
      return (data.response?.results?.grouping?.group || []).map(group => ({
        title: group.doc?.title || 'No title',
        url: group.doc?.url || '#',
        snippet: group.doc?.headline || '',
        score: 1,
        thumbnail: null,
        published_at: null,
        author: null
      }))

    } catch (error) {
      console.warn('Yandex search error:', error.message)
      return []
    }
  }
}
