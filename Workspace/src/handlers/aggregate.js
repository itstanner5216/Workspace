import { SearchService } from '../lib/search-service.js'

export async function handleAggregate(request, env) {
  const url = new URL(request.url)

  const q = url.searchParams.get('q')
  const mode = url.searchParams.get('mode') || 'niche'
  const fresh = url.searchParams.get('fresh') || 'd7'
  const limit = parseInt(url.searchParams.get('limit')) || 10
  const duration = url.searchParams.get('duration')
  const site = url.searchParams.get('site')
  const hostMode = url.searchParams.get('hostMode') || 'normal'
  const durationMode = url.searchParams.get('durationMode') || 'normal'
  const showThumbs = url.searchParams.get('showThumbs') !== 'false'
  const provider = url.searchParams.get('provider')
  const safeMode = url.searchParams.get('safeMode') !== 'false'
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'

  // Validate input
  if (!q || q.trim().length === 0) {
    return new Response(JSON.stringify({
      error: 'Missing or empty query parameter',
      status: 400
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Create cache key
  const cacheKey = `search:${q.trim()}:${mode}:${fresh}:${limit}:${provider || 'all'}:${Date.now()}`

  // Try to get from cache first
  try {
    const cachedResult = await env.CACHE.get(cacheKey)
    if (cachedResult) {
      console.log('Cache hit for query:', q)
      return new Response(cachedResult, {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Status': 'HIT'
        }
      })
    }
  } catch (cacheError) {
    console.warn('Cache read error:', cacheError)
  }

  console.log('Cache miss for query:', q)

  try {
    const searchService = new SearchService(env)

    // Perform the search
    const results = await searchService.search({
      query: q.trim(),
      mode,
      fresh,
      limit,
      duration,
      site,
      hostMode,
      durationMode,
      showThumbs,
      provider,
      safeMode,
      ip
    })

    const response = {
      results,
      query: q.trim(),
      mode,
      timestamp: Date.now(),
      cached: false
    }

    // Cache the result for 30 minutes (1800 seconds)
    try {
      await env.CACHE.put(cacheKey, JSON.stringify(response), {
        expirationTtl: 1800 // 30 minutes
      })
      console.log('Cached result for query:', q)
    } catch (cacheWriteError) {
      console.warn('Cache write error:', cacheWriteError)
    }

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Status': 'MISS'
      }
    })

  } catch (error) {
    console.error('Search error:', error)

    return new Response(JSON.stringify({
      error: 'Search failed',
      message: error.message,
      status: 500
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
