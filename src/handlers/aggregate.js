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

  try {
    const searchService = new SearchService(env)
    const results = await searchService.search({
      q, mode, fresh, limit, duration, site, hostMode, durationMode, showThumbs, provider, safeMode, ip
    }, env)

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
