export class RedditProvider {
  constructor() {
    this.name = 'Reddit';
    this.baseUrl = 'https://www.reddit.com';
  }

  async search(query, options, env) {
    const { limit = 10, fresh, safeMode = true } = options;
    const subreddit = options.subreddit || 'all';
    const sort = options.sort || 'relevance';

    try {
      const response = await fetch(`${this.baseUrl}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=${sort}&limit=${limit}&restrict_sr=${subreddit !== 'all'}`, {
        headers: {
          'User-Agent': env.USER_AGENT || 'Jack-Portal/2.0.0'
        },
        signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS || 10000)
      });

      if (!response.ok) {
        console.warn(`Reddit search failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.data?.children?.map(post => ({
        title: post.data.title,
        url: `https://reddit.com${post.data.permalink}`,
        snippet: post.data.selftext || post.data.url,
        source: 'reddit',
        score: post.data.score || 0,
        published_at: new Date(post.data.created_utc * 1000).toISOString(),
        thumbnail: post.data.thumbnail && post.data.thumbnail !== 'self' ? post.data.thumbnail : null,
        author: post.data.author,
        extra: {
          subreddit: post.data.subreddit,
          num_comments: post.data.num_comments,
          ups: post.data.ups,
          nsfw: post.data.over_18
        }
      })).filter(item => !safeMode || !item.extra.nsfw) || [];
    } catch (error) {
      console.warn('Reddit search error:', error.message);
      return [];
    }
  }
}
