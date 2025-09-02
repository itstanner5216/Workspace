export class AdultMediaProvider {
  constructor() {
    this.name = 'AdultMedia';
    this.baseUrl = 'https://adultdatalink.p.rapidapi.com';
  }

  async search(query, options, env) {
    const { limit = 10, fresh } = options;
    const params = new URLSearchParams({
      query: query,
      limit: limit,
      safe: false // Adult content
    });

    try {
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'X-RapidAPI-Key': env.ADULTMEDIA_API_KEY,
          'X-RapidAPI-Host': 'adultdatalink.p.rapidapi.com',
          'User-Agent': env.USER_AGENT || 'Jack-Portal/2.0.0'
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 10000)
      });

      if (!response.ok) {
        console.warn(`AdultMedia search failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.results?.map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.description || '',
        source: 'adultmedia',
        score: item.score || 0,
        published_at: item.published_at || null,
        thumbnail: item.thumbnail || null,
        author: item.author || null,
        extra: {
          category: item.category,
          tags: item.tags
        }
      })) || [];
    } catch (error) {
      console.warn('AdultMedia search error:', error.message);
      return [];
    }
  }
}
