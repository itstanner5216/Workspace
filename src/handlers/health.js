/**
 * Health Check Handler
 * Provides system health status and basic diagnostics
 */

import { createSuccessResponse, createErrorResponse } from '../lib/response.js'
import { logInfo } from '../lib/logger.js'

/**
 * Handle health check requests
 * @param {Request} request - The incoming HTTP request
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Response>} Health status response
 */
export async function handleHealth(request, env) {
  try {
    const url = new URL(request.url)
    const timestamp = new Date().toISOString()

    // Basic health check data
    const healthData = {
      status: 'healthy',
      timestamp,
      version: '2.0.0',
      uptime: null, // Not available in Cloudflare Workers
      environment: {
        node_version: 'Cloudflare Worker',
        platform: 'cloudflare'
      },
      endpoints: {
        search: '/api/search',
        diagnostics: '/api/diagnostics?debug=true'
      }
    }

    // Check if KV namespace is available (basic connectivity test)
    if (env.PROVIDER_LEDGER) {
      try {
        // Simple KV test - try to get a non-existent key
        await env.PROVIDER_LEDGER.get('health-check-test')
        healthData.kv_status = 'connected'
      } catch (kvError) {
        healthData.kv_status = 'error'
        healthData.kv_error = kvError.message
        healthData.status = 'degraded'
      }
    } else {
      healthData.kv_status = 'not_configured'
    }

    // Log health check
    logInfo('Health check performed', {
      status: healthData.status,
      kv_status: healthData.kv_status,
      timestamp
    })

    // Return appropriate status code based on health
    const statusCode = healthData.status === 'healthy' ? 200 : 503

    return createSuccessResponse(healthData, statusCode)

  } catch (error) {
    logInfo('Health check failed', {
      error: error.message,
      timestamp: new Date().toISOString()
    })

    return createErrorResponse(
      'Health check failed',
      503,
      {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    )
  }
}