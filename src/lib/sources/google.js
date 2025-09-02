export class GoogleProvider {
  constructor() {
    this.name = 'Google';
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
  }

  async search(query, options, env) {
    const { limit = 10, fresh } = options;
    const params = new URLSearchParams({
      key: env.GOOGLE_API_KEY,
      cx: env.GOOGLE_CSE_ID,
      q: query,
      num: limit,
      dateRestrict: fresh,
      safe: options.safe ? 'active' : 'off'
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'User-Agent': env.USER_AGENT || 'Jack-Portal/2.0.0'
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 10000)
      });

      if (!response.ok) {
        console.warn(`Google search failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.items?.map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: 'google',
        score: item.pagemap?.metatags?.[0]?.['og:score'] || 0,
        published_at: item.pagemap?.metatags?.[0]?.['article:published_time'] || null,
        thumbnail: item.pagemap?.cse_image?.[0]?.src || null,
        author: item.pagemap?.metatags?.[0]?.['article:author'] || null,
        extra: {
          displayLink: item.displayLink,
          kind: item.kind
        }
      })) || [];
    } catch (error) {
      console.warn('Google search error:', error.message);
      return [];
    }
  }
}
