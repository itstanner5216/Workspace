// Example: How to use KV storage in your Jack Portal Worker

// In your worker.js or handlers/aggregate.js, you can now use:

export async function handleAggregate(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response('Missing query parameter', { status: 400 });
  }

  // Create a cache key
  const cacheKey = `search:${query}:${Date.now()}`;

  // Try to get from cache first
  try {
    const cachedResult = await env.CACHE.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit for:', query);
      return new Response(cachedResult, {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }

  // If not in cache, perform the search
  // ... your existing search logic here ...

  // Example search result
  const searchResults = {
    results: [
      { title: 'Example Result', url: 'https://example.com', snippet: 'Example snippet' }
    ],
    timestamp: Date.now()
  };

  // Cache the result for 1 hour (3600 seconds)
  try {
    await env.CACHE.put(cacheKey, JSON.stringify(searchResults), {
      expirationTtl: 3600
    });
    console.log('Cached result for:', query);
  } catch (error) {
    console.warn('Cache write error:', error);
  }

  return new Response(JSON.stringify(searchResults), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Additional KV operations you can use:

// Store user preferences
// await env.CACHE.put(`user:${userId}:prefs`, JSON.stringify(preferences));

// Get user preferences
// const prefs = await env.CACHE.get(`user:${userId}:prefs`);

// Delete from cache
// await env.CACHE.delete(cacheKey);

// List keys (for debugging)
// const keys = await env.CACHE.list({ prefix: 'search:' });
