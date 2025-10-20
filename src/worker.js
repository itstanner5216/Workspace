/**
 * Jack Portal - Cloudflare Worker
 * Multi-provider search API with intelligent caching
 *
 * @version 2.0.0
 * @author Jack Portal Team
 * @license MIT
 */

import { PORTAL_HTML } from './html.js'
import { handleAggregate } from './handlers/aggregate.js'
import { handleDiagnostics } from './handlers/diagnostics.js'
import { handleHealth } from './handlers/health.js'
import { handleProviderSelfTest } from './handlers/provider-selftest.js'
import { handleProxyStats } from './handlers/proxy-stats.js'
import { handleOptionsRequest, createErrorResponse } from './lib/response.js'
import {
  logInfo,
  logError,
  logRequestStart,
  logRequestEnd,
  createRequestContext,
  initLogLevel
} from './lib/logger.js'

/**
 * Main Cloudflare Worker export
 * Handles all incoming requests and routes them appropriately
 */
export default {
  /**
   * Fetch handler for all incoming requests
   * @param {Request} request - The incoming HTTP request
   * @param {Object} env - Environment variables and bindings
   * @param {Object} ctx - Execution context
   * @returns {Promise<Response>} The HTTP response
   */
  async fetch(request, env, ctx) {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()
    const url = new URL(request.url)
    const method = request.method
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For') ||
               request.headers.get('X-Real-IP') ||
               'unknown'

    // Initialize log level from environment
    initLogLevel(env)

    // Log incoming request
    logRequestStart({
      requestId,
      method,
      path: url.pathname,
      ip,
      userAgent: request.headers.get('User-Agent')?.substring(0, 100)
    })

    try {
      // Handle CORS preflight requests
      if (method === 'OPTIONS') {
        const response = handleOptionsRequest(request)
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status)
        return response
      }

      // Handle health check endpoint
      if (url.pathname === '/health') {
        const response = await handleHealth(request, env)
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status)
        return response
      }

      // Route to appropriate handler
      if (url.pathname === '/api/search') {
        const response = await handleAggregate(request, env)

        // Add request tracking headers
        const newResponse = new Response(response.body, response)
        newResponse.headers.set('X-Request-ID', requestId)
        newResponse.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
        newResponse.headers.set('X-Powered-By', 'Jack-Portal/2.0.0')

        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, newResponse.status)
        return newResponse
      }

      // Handle diagnostics endpoint for DEBUG mode
      if (url.pathname === '/api/diagnostics' && url.searchParams.get('debug') === 'true') {
        const response = await handleDiagnostics(request, env)
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status)
        return response
      }

      // Handle provider self-test endpoint (requires DEBUG mode or X-Diag-Token)
      if (url.pathname === '/api/provider-selftest') {
        const response = await handleProviderSelfTest(request, env)
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status)
        return response
      }

      // Handle provider self-test-all endpoint (alias for comprehensive testing)
      if (url.pathname === '/api/provider-selftest-all') {
        const response = await handleProviderSelfTest(request, env)
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status)
        return response
      }

      // Handle proxy stats endpoint
      if (url.pathname === '/api/proxy-stats') {
        const response = await handleProxyStats(request, env)
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status)
        return response
      }

      // Serve Service Worker
      if (url.pathname === '/sw.js') {
        const response = new Response('// Service Worker is handled by the platform', {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=86400',
            'X-Request-ID': requestId
          }
        })
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status)
        return response
      }

      // Serve static HTML for root and other routes
      const htmlResponse = new Response(PORTAL_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': 'public, max-age=300' // Cache HTML for 5 minutes
        }
      })

      logRequestEnd({
        requestId,
        method,
        path: url.pathname,
        ip
      }, Date.now() - startTime, htmlResponse.status)
      return htmlResponse

    } catch (error) {
      logError('Worker error', {
        requestId,
        method,
        path: url.pathname,
        ip,
        error: error.message,
        stack: error.stack,
        responseTime: Date.now() - startTime
      })

      const errorResponse = createErrorResponse(
        'Internal server error',
        500,
        {
          requestId,
          type: 'WorkerError'
        }
      )

      logRequestEnd({
        requestId,
        method,
        path: url.pathname,
        ip
      }, Date.now() - startTime, errorResponse.status)
      return errorResponse
    }
  }
}
