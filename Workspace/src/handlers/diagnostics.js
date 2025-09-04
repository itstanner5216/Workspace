/**
 * Diagnostics Handler
 * Provides monitoring and health information for providers
 */

import { ProviderLedger } from '../lib/provider-ledger.js'
import { AdapterRegistry } from '../lib/adapter-registry.js'
import { createSuccessResponse } from '../lib/response.js'

/**
 * Handles diagnostics requests
 * @param {Request} request - The incoming HTTP request
 * @param {Object} env - Environment variables and Cloudflare bindings
 * @returns {Promise<Response>} The diagnostics response
 */
export async function handleDiagnostics(request, env) {
  try {
    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')

    // Initialize provider ledger
    const ledger = new ProviderLedger(env)
    await ledger.loadStates()

    // Initialize adapter registry for metadata
    const registry = new AdapterRegistry()
    // Note: Registry is populated in SearchService constructor

    let diagnostics

    if (provider) {
      // Single provider diagnostics
      diagnostics = {
        provider: ledger.getProviderState(provider),
        registry: registry.getMetadata(provider),
        ledger_state: ledger.getDiagnostics(provider)
      }
    } else {
      // All providers diagnostics
      diagnostics = {
        providers: ledger.getDiagnostics(),
        registry: registry.getAllMetadata(),
        system: {
          timestamp: new Date().toISOString(),
          version: '2.1.0',
          environment: env.ENVIRONMENT || 'development'
        },
        cache: {
          status: env.CACHE ? 'available' : 'unavailable'
        },
        provider_ledger: {
          status: env.PROVIDER_LEDGER ? 'available' : 'unavailable'
        },
        alerts: _computeAlertFlags(ledger.getDiagnostics())
      }
    }

    return createSuccessResponse(diagnostics, {
      cacheStatus: 'BYPASS'
    })

  } catch (error) {
    console.error('Diagnostics error:', error)
    return createSuccessResponse({
      error: 'Diagnostics unavailable',
      timestamp: new Date().toISOString()
    }, {
      cacheStatus: 'BYPASS'
    })
  }
}

/**
 * Compute alert flags for monitoring
 */
function _computeAlertFlags(providerStates) {
  const now = Date.now()
  const tenMinutesAgo = now - (10 * 60 * 1000)

  // Check Google quota stale alert
  const googleState = providerStates.google
  const googleQuotaStale = googleState &&
    googleState.status === 'QUOTA_EXCEEDED' &&
    googleState.resetAt &&
    now > new Date(googleState.resetAt).getTime()

  // Calculate system-wide fallback rate
  let totalRequests = 0
  let fallbackRequests = 0

  for (const [providerName, state] of Object.entries(providerStates)) {
    if (providerName === 'google') continue // Skip primary provider

    const providerRequests = (state.rolling?.successCount || 0) +
                            (state.rolling?.timeoutCount || 0) +
                            (state.rolling?.error4xxCount || 0) +
                            (state.rolling?.error5xxCount || 0)

    totalRequests += providerRequests

    // Consider requests to non-Google providers as fallbacks
    if (providerName !== 'google') {
      fallbackRequests += providerRequests
    }
  }

  const fallbackRate = totalRequests > 0 ? (fallbackRequests / totalRequests) * 100 : 0
  const fallbackRateHigh = fallbackRate > 15

  return {
    google_quota_stale: googleQuotaStale || false,
    fallback_rate_high: fallbackRateHigh,
    fallback_rate_percent: fallbackRate.toFixed(1),
    last_checked: new Date().toISOString()
  }
}
