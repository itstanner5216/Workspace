/**
 * Aggregate Search Handler
 * Handles search requests across multiple providers with caching
 */

import { SearchService } from '../lib/search-service.js'
import { validateAllInputs } from '../lib/validation.js'
import { createCORSResponse, createErrorResponse, createSuccessResponse } from '../lib/response.js'
import { checkRateLimit, createRateLimitResponse } from '../lib/rate-limit.js'

/**
 * Handles aggregate search requests
 * @param {Request} request - The incoming HTTP request
 * @param {Object} env - Environment variables and Cloudflare bindings
 * @returns {Promise<Response>} The search results response
 */
export async function handleAggregate(request, env) {
  const url = new URL(request.url)
  const ip = request.headers.get('CF-Connecting-IP') ||
             request.headers.get('X-Forwarded-For') ||
             request.headers.get('X-Real-IP') ||
             'unknown'

  // Check rate limits
  const rateLimitResult = await checkRateLimit(env, ip, 'aggregate')
  if (!rateLimitResult.allowed) {
    console.warn('Rate limit exceeded for IP:', ip)
    return createRateLimitResponse(rateLimitResult)
  }

  // Comprehensive input validation
  const validation = validateAllInputs(url.searchParams, env)

  if (!validation.isValid) {
    console.warn('Input validation failed:', validation.errors)
    return createErrorResponse(
      'Invalid input parameters',
      400,
      {
        details: validation.errors,
        type: 'ValidationError'
      }
    )
  }

  const {
    query,
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
    debug
  } = validation.data

  // Extract proxy parameters
  const region = url.searchParams.get('region') || ''
  const proxyType = url.searchParams.get('proxyType') || 'residential'

  // Create cache key with validated parameters (without timestamp to enable proper caching)
  // Include proxyType and region to prevent cache collisions with different proxy settings
  const cacheKey = `search:${query}:${mode}:${fresh}:${limit}:${provider || 'all'}:${safeMode}:${debug || false}:${region}:${proxyType}`

  // Try to get from cache first
  try {
    const cachedResult = await env.CACHE.get(cacheKey)
    if (cachedResult) {
      console.log('Cache hit for query:', query, 'from IP:', ip, 'region:', region)
      const cachedData = JSON.parse(cachedResult)
      return createSuccessResponse(cachedData, {
        cacheStatus: 'HIT',
        validationStatus: 'PASSED'
      })
    }
  } catch (cacheError) {
    console.warn('Cache read error for query:', query, 'Error:', cacheError.message)
  }

  console.log('Cache miss for query:', query, 'from IP:', ip, 'region:', region)

  try {
    const searchService = new SearchService(env)

    // Get proxy info if region specified
    let proxyInfo = null;
    if (region) {
      try {
        const { ProxyService } = await import('../lib/proxy-service.js')
        const proxyService = new ProxyService(env)
        proxyInfo = proxyService.selectProxy(region, proxyType)
        console.log('Using proxy:', proxyInfo?.url, 'for region:', region)
      } catch (proxyError) {
        console.warn('Proxy selection error:', proxyError.message)
      }
    }

    // Perform the search
    const results = await searchService.search({
      query,
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
      debug,
      ip,
      proxy: proxyInfo
    })

    const response = {
      results,
      query,
      mode,
      timestamp: Date.now(),
      cached: false,
      requestId: crypto.randomUUID(),
      totalUnique: results.totalUnique,
      dedupedCount: results.dedupedCount,
      ...(region && proxyInfo && { proxy: { region: proxyInfo.region, type: proxyInfo.type } }),
      ...(debug && results.providerBreakdown && { providerBreakdown: results.providerBreakdown }),
      ...(debug && results.ledgerState && { ledgerState: results.ledgerState })
    }

    // Cache the result for 30 minutes (1800 seconds)
    try {
      await env.CACHE.put(cacheKey, JSON.stringify(response), {
        expirationTtl: 1800 // 30 minutes
      })
      console.log('Cached result for query:', query, 'TTL: 1800s')
    } catch (cacheWriteError) {
      console.warn('Cache write error for query:', query, 'Error:', cacheWriteError.message)
    }

    return createSuccessResponse(response, {
      cacheStatus: 'MISS',
      validationStatus: 'PASSED'
    })

  } catch (error) {
    const requestId = crypto.randomUUID()
    console.error('Search error:', {
      requestId,
      query,
      ip,
      mode,
      provider,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return createErrorResponse(
      'Search failed',
      500,
      {
        message: error.message,
        type: error.name || 'SearchError',
        requestId
      }
    )
  }
}
