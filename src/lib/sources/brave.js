export class BraveProvider {
  constructor() {
    this.name = 'Brave';
    this.baseUrl = 'https://api.search.brave.com/res/v1/web/search';
  }

  async search(query, options, env) {
    const { limit = 10, fresh } = options;
    const params = new URLSearchParams({
      q: query,
      count: limit,
      freshness: fresh,
      safe_search: options.safe ? 'strict' : 'off'
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'X-Subscription-Token': env.BRAVE_API_KEY,
          'User-Agent': env.USER_AGENT || 'Jack-Portal/2.0.0'
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 10000)
      });

      if (!response.ok) {
        console.warn(`Brave search failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.web?.results?.map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.description,
        source: 'brave',
        score: item.score || 0,
        published_at: item.age || null,
        thumbnail: item.thumbnail?.src || null,
        author: item.meta_url?.hostname || null,
        extra: {
          subtype: item.subtype,
          age: item.age
        }
      })) || [];
    } catch (error) {
      console.warn('Brave search error:', error.message);
      return [];
    }
  }
}
