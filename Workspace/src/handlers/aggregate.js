/**
 * Aggregate Search Handler
 * Handles search requests across multiple providers with caching
 *
 * @module handlers/aggregate
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
    safeMode
  } = validation.data

  // Create cache key with validated parameters
  const cacheKey = `search:${query}:${mode}:${fresh}:${limit}:${provider || 'all'}:${Date.now()}`

  // Try to get from cache first
  try {
    const cachedResult = await env.CACHE.get(cacheKey)
    if (cachedResult) {
      console.log('Cache hit for query:', query, 'from IP:', ip)
      const cachedData = JSON.parse(cachedResult)
      return createSuccessResponse(cachedData, {
        cacheStatus: 'HIT',
        validationStatus: 'PASSED'
      })
    }
  } catch (cacheError) {
    console.warn('Cache read error for query:', query, 'Error:', cacheError.message)
  }

  console.log('Cache miss for query:', query, 'from IP:', ip)

  try {
    const searchService = new SearchService(env)

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
      ip
    })

    const response = {
      results,
      query,
      mode,
      timestamp: Date.now(),
      cached: false,
      requestId: crypto.randomUUID()
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
