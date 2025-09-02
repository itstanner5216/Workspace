export class YandexProvider {
  constructor() {
    this.name = 'Yandex';
    this.baseUrl = 'https://yandex.com/search/xml';
  }

  async search(query, options, env) {
    const { limit = 10, fresh } = options;
    const params = new URLSearchParams({
      query: query,
      lr: '213', // Russia, adjust as needed
      l10n: 'en',
      maxpassages: limit,
      page: 0,
      user: env.YANDEX_USER || 'your-yandex-user',
      key: env.YANDEX_API_KEY
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'User-Agent': env.USER_AGENT || 'Jack-Portal/2.0.0'
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 10000)
      });

      if (!response.ok) {
        console.warn(`Yandex search failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.response?.results?.grouping?.group?.map(item => ({
        title: item.doc.title,
        url: item.doc.url,
        snippet: item.doc.passages?.passage?.[0]?.text || '',
        source: 'yandex',
        score: item.doc.relevance || 0,
        published_at: item.doc.properties?.date || null,
        thumbnail: item.doc.properties?.img?.[0] || null,
        author: item.doc.properties?.author || null,
        extra: {
          mime: item.doc.mime,
          size: item.doc.size
        }
      })) || [];
    } catch (error) {
      console.warn('Yandex search error:', error.message);
      return [];
    }
  }
}
