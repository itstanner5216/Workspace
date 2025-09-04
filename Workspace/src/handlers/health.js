/**
 * Health Check Handler
 * Provides parallel health checks for all providers
 */

import { SerpHouseProvider } from '../lib/sources/serphouse.js'
import { QualityPornProvider } from '../lib/sources/qualityporn.js'
import { AdultMediaProvider } from '../lib/sources/adultmedia.js'
import { SeznamProvider } from '../lib/sources/seznam.js'
import { ApifyProvider } from '../lib/sources/apify.js'
import { ProviderLedger } from '../lib/provider-ledger.js'
import { createSuccessResponse } from '../lib/response.js'

/**
 * Handles health check requests
 * @param {Request} request - The incoming HTTP request
 * @param {Object} env - Environment variables and Cloudflare bindings
 * @returns {Promise<Response>} The health check response
 */
export async function handleHealth(request, env) {
  const query = 'hello world'

  // Initialize mock ledger for health checks
  const mockLedger = {
    getProviderState: () => ({
      dailyUsed: 0,
      monthlyUsed: 0,
      requestsDailyUsed: 0,
      objectsDailyUsed: 0
    }),
    recordSuccess: () => {},
    incrementDailyUsed: () => {},
    incrementMonthlyUsed: () => {},
    incrementRequestsDailyUsed: () => {},
    incrementObjectsDailyUsed: () => {},
    recordError: () => {},
    markQuotaExceeded: () => {}
  }

  const options = { limit: 5, ledger: mockLedger }

  // Run all health checks in parallel
  const healthChecks = await Promise.allSettled([
    testProvider(new SerpHouseProvider(), query, options, env),
    testProvider(new QualityPornProvider(), query, options, env),
    testProvider(new AdultMediaProvider(), query, options, env),
    testProvider(new SeznamProvider(), query, options, env),
    testProvider(new ApifyProvider(), query, options, env)
  ])

  const results = {
    serpHouse: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: '❌', error_message: healthChecks[0].reason?.message || 'Unknown error' },
    qualityPorn: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: '❌', error_message: healthChecks[1].reason?.message || 'Unknown error' },
    adultMedia: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: '❌', error_message: healthChecks[2].reason?.message || 'Unknown error' },
    seznam: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { status: '❌', error_message: healthChecks[3].reason?.message || 'Unknown error' },
    apify: healthChecks[4].status === 'fulfilled' ? healthChecks[4].value : { status: '❌', error_message: healthChecks[4].reason?.message || 'Unknown error' }
  }

  return createSuccessResponse(results, {
    cacheStatus: 'BYPASS'
  })
}

/**
 * Test a single provider
 */
async function testProvider(provider, query, options, env) {
  try {
    const results = await provider.search(query, options, env)

    if (!results || results.length === 0) {
      return { status: 'empty', path_used: provider.name.toLowerCase() + ':default' }
    }

    const first = results[0]

    // Handle different provider response formats
    if (provider.name === 'AdultMedia') {
      return {
        status: '✅',
        media_url: first.media_url || first.url || first.thumbnail || 'N/A',
        path_used: first.path_used || 'adultmedia:pornpics-search'
      }
    } else if (first.status === 'empty') {
      return {
        status: 'empty',
        top_level_keys: first.top_level_keys || [],
        array_lengths: first.array_lengths || {},
        path_used: first.path_used || provider.name.toLowerCase() + ':default'
      }
    } else {
      return {
        status: '✅',
        title: first.title || 'No title',
        url: first.url || '#',
        path_used: first.path_used || provider.name.toLowerCase() + ':default'
      }
    }
  } catch (error) {
    // Handle rate limiting with retry
    if (error.message.includes('QUOTA') || error.message.includes('429')) {
      try {
        // Wait 500-800ms then retry
        await new Promise(resolve => setTimeout(resolve, 650))
        const retryResults = await provider.search(query, options, env)

        if (retryResults && retryResults.length > 0) {
          const first = retryResults[0]
          const result = {
            status: '✅',
            retried: true,
            path_used: first.path_used || provider.name.toLowerCase() + ':default'
          }

          if (provider.name === 'AdultMedia') {
            result.media_url = first.media_url || first.url || first.thumbnail || 'N/A'
          } else {
            result.title = first.title || 'No title'
            result.url = first.url || '#'
          }

          return result
        }
      } catch (retryError) {
        return {
          status: '❌',
          error_message: `HTTP ${error.message} / Retry: ${retryError.message}`,
          retried: true,
          path_used: provider.name.toLowerCase() + ':default'
        }
      }
    }

    return {
      status: '❌',
      error_message: error.message,
      path_used: provider.name.toLowerCase() + ':default'
    }
  }
}
