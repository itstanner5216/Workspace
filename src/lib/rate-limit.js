/**
 * Rate limiting utilities for Jack Portal
 */

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  // Per IP limits
  ip: {
    window: 60, // 1 minute
    maxRequests: 10 // 10 requests per minute
  },
  // Per endpoint limits
  endpoint: {
    window: 60,
    maxRequests: 30
  },
  // Global limits
  global: {
    window: 60,
    maxRequests: 100
  }
}

/**
 * Generates a rate limit key
 * @param {string} type - Type of rate limit (ip, endpoint, global)
 * @param {string} identifier - Identifier for the limit (IP, endpoint, etc.)
 * @returns {string} - The rate limit key
 */
function generateRateLimitKey(type, identifier) {
  return `ratelimit:${type}:${identifier}:${Math.floor(Date.now() / (RATE_LIMITS[type].window * 1000))}`
}

/**
 * Checks if a request exceeds rate limits
 * @param {Object} env - Environment variables
 * @param {string} ip - Client IP address
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} - {allowed: boolean, remaining: number, resetTime: number}
 */
export async function checkRateLimit(env, ip, endpoint = 'search') {
  const now = Date.now()
  try {
    const results = await Promise.all([
      // Check IP-based rate limit
      checkSpecificRateLimit(env, 'ip', ip),
      // Check endpoint-based rate limit
      checkSpecificRateLimit(env, 'endpoint', endpoint),
      // Check global rate limit
      checkSpecificRateLimit(env, 'global', 'global')
    ])

    const ipResult = results[0]
    const endpointResult = results[1]
    const globalResult = results[2]

    // If any limit is exceeded, deny the request
    if (!ipResult.allowed || !endpointResult.allowed || !globalResult.allowed) {
      return {
        allowed: false,
        remaining: Math.min(ipResult.remaining, endpointResult.remaining, globalResult.remaining),
        resetTime: Math.max(ipResult.resetTime, endpointResult.resetTime, globalResult.resetTime),
        exceeded: {
          ip: !ipResult.allowed,
          endpoint: !endpointResult.allowed,
          global: !globalResult.allowed
        }
      }
    }

    return {
      allowed: true,
      remaining: Math.min(ipResult.remaining, endpointResult.remaining, globalResult.remaining),
      resetTime: Math.min(ipResult.resetTime, endpointResult.resetTime, globalResult.resetTime)
    }

  } catch (error) {
    console.warn('Rate limit check error:', error)
    // Allow request on error to avoid blocking legitimate traffic
    return {
      allowed: true,
      remaining: 999,
      resetTime: now + 60000
    }
  }
}

/**
 * Checks a specific rate limit
 * @param {Object} env - Environment variables
 * @param {string} type - Type of rate limit
 * @param {string} identifier - Identifier for the limit
 * @returns {Promise<Object>} - {allowed: boolean, remaining: number, resetTime: number}
 */
async function checkSpecificRateLimit(env, type, identifier) {
  const key = generateRateLimitKey(type, identifier)
  const config = RATE_LIMITS[type]
  const now = Date.now()
  const windowStart = Math.floor(now / (config.window * 1000)) * (config.window * 1000)
  const resetTime = windowStart + (config.window * 1000)

  try {
    // Get current count
    const currentCount = parseInt(await env.CACHE.get(key)) || 0

    if (currentCount >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime
      }
    }

    // Increment count
    const newCount = currentCount + 1
    await env.CACHE.put(key, newCount.toString(), {
      expirationTtl: config.window
    })

    return {
      allowed: true,
      remaining: config.maxRequests - newCount,
      resetTime
    }

  } catch (error) {
    console.warn(`Rate limit error for ${type}:${identifier}:`, error)
    // Allow request on error
    return {
      allowed: true,
      remaining: 999,
      resetTime: now + 60000
    }
  }
}

/**
 * Creates a rate limit exceeded response
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {Response} - The rate limit response
 */
export function createRateLimitResponse(rateLimitInfo) {
  const resetDate = new Date(rateLimitInfo.resetTime)

  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000),
    resetTime: resetDate.toISOString(),
    limits: rateLimitInfo.exceeded,
    status: 429
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-Rate-Limit-Remaining': rateLimitInfo.remaining.toString(),
      'X-Rate-Limit-Reset': resetDate.toISOString(),
      'X-Rate-Limit-Retry-After': Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000).toString(),
      'Retry-After': Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000).toString()
    }
  })
}

/**
 * Middleware function for rate limiting
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Function} next - Next middleware function
 * @returns {Response} - The response or rate limit response
 */
export async function rateLimitMiddleware(request, env, next) {
  const url = new URL(request.url)
  const ip = request.headers.get('CF-Connecting-IP') ||
             request.headers.get('X-Forwarded-For') ||
             request.headers.get('X-Real-IP') ||
             'unknown'

  const endpoint = url.pathname.replace('/api/', '').replace('/', '') || 'search'

  const rateLimitResult = await checkRateLimit(env, ip, endpoint)

  if (!rateLimitResult.allowed) {
    console.warn('Rate limit exceeded:', {
      ip,
      endpoint,
      remaining: rateLimitResult.remaining,
      resetTime: new Date(rateLimitResult.resetTime).toISOString()
    })

    return createRateLimitResponse(rateLimitResult)
  }

  // Add rate limit headers to successful requests
  const response = await next()
  const resetDate = new Date(rateLimitResult.resetTime)

  // Clone the response to add headers
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('X-Rate-Limit-Remaining', rateLimitResult.remaining.toString())
  newResponse.headers.set('X-Rate-Limit-Reset', resetDate.toISOString())

  return newResponse
}
