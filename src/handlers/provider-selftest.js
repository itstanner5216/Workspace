/**
 * Provider Self-Test Handler
 * Comprehensive health check across all providers with detailed diagnostics
 */

import {
  GoogleProvider,
  SerpApiProvider,
  SerperProvider,
  YandexProvider,
  BraveProvider,
  SerpHouseProvider,
  AdultMediaProvider,
  QualityPornProvider,
  ApifyProvider,
  ScrapersProvider,
  AdaptersProvider,
  SeznamProvider
} from '../lib/sources/index.js'
import { ProviderLedger } from '../lib/provider-ledger.js'
import { createSuccessResponse, createErrorResponse } from '../lib/response.js'
import { logInfo } from '../lib/logger.js'

/**
 * Canonical error codes for provider testing
 */
const ERROR_CODES = {
  INVALID_AUTH: 'INVALID_AUTH',
  BAD_HOST: 'BAD_HOST',
  BAD_PARAMS: 'BAD_PARAMS',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  QUOTA_EXCEEDED_DAILY: 'QUOTA_EXCEEDED_DAILY',
  QUOTA_EXCEEDED_MONTHLY: 'QUOTA_EXCEEDED_MONTHLY',
  UNKNOWN: 'UNKNOWN'
}

/**
 * Provider configuration requirements
 */
const PROVIDER_CONFIGS = {
  google: {
    required: ['GOOGLE_API_KEY', 'GOOGLE_CSE_ID'],
    headers: [],
    queryParams: ['key', 'cx']
  },
  serpapi: {
    required: ['SERPAPI_KEY'],
    headers: [],
    queryParams: ['api_key']
  },
  serper: {
    required: ['SERPER_KEY'],
    headers: ['X-API-KEY'],
    queryParams: []
  },
  yandex: {
    required: ['SERPWOW_API_KEY'],
    headers: [],
    queryParams: ['api_key']
  },
  brave: {
    required: ['BRAVE_API_KEY'],
    headers: ['X-Subscription-Token'],
    queryParams: []
  },
  serphouse: {
    required: ['SERPHOUSE_KEY'],
    headers: [],
    queryParams: ['api_token', 'q', 'num_results', 'domain', 'lang', 'device', 'serp_type']
  },
  adultmedia: {
    required: ['RAPIDAPI_KEY'],
    headers: ['x-rapidapi-key', 'x-rapidapi-host'],
    queryParams: ['q', 'limit']
  },
  qualityporn: {
    required: ['RAPIDAPI_KEY'],
    headers: ['x-rapidapi-key', 'x-rapidapi-host'],
    queryParams: []
  },
  seznam: {
    required: ['RAPIDAPI_KEY'],
    headers: ['x-rapidapi-key', 'x-rapidapi-host'],
    queryParams: ['q', 'count', 'format', 'lang']
  },
  apify: {
    required: ['APIFY_TOKEN'],
    headers: [],
    queryParams: []
  },
  scrapers: {
    required: ['SCRAPERS_API_KEY'],
    headers: ['Authorization'],
    queryParams: []
  },
  adapters: {
    required: ['ADAPTERS_API_KEY'],
    headers: ['Authorization'],
    queryParams: []
  }
}

/**
 * Handle provider self-test requests
 * @param {Request} request - The incoming HTTP request
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Response>} The self-test response
 */
export async function handleProviderSelfTest(request, env) {
  const url = new URL(request.url)
  const debug = url.searchParams.get('debug') === 'true'
  const diagToken = request.headers.get('X-Diag-Token')

  // Security check - require DEBUG mode or X-Diag-Token
  if (!debug && !diagToken) {
    return createErrorResponse(
      'Provider self-test requires DEBUG mode or X-Diag-Token header',
      403,
      {
        type: 'SecurityError',
        required: 'debug=true or X-Diag-Token header'
      }
    )
  }

  try {
    logInfo('Starting provider self-test', {
      debug,
      hasDiagToken: !!diagToken,
      timestamp: new Date().toISOString()
    })

    // Initialize provider instances
    const providers = createProviderInstances()

    // Run comprehensive health check
    const results = await runProviderHealthCheck(providers, env, debug)

    // Generate consolidated report
    const report = generateConsolidatedReport(results)

    logInfo('Provider self-test completed', {
      totalProviders: Object.keys(results).length,
      healthyCount: Object.values(results).filter(r => r.status === 'ok').length,
      failedCount: Object.values(results).filter(r => r.status === 'fail').length,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse(report, {
      cacheStatus: 'BYPASS'
    })

  } catch (error) {
    logInfo('Provider self-test failed', {
      error: error.message,
      timestamp: new Date().toISOString()
    })

    return createErrorResponse(
      'Provider self-test failed',
      500,
      {
        error: error.message,
        type: 'SelfTestError'
      }
    )
  }
}

/**
 * Create provider instances for testing
 */
function createProviderInstances() {
  return {
    google: new GoogleProvider(),
    serpapi: new SerpApiProvider(),
    serper: new SerperProvider(),
    yandex: new YandexProvider(),
    brave: new BraveProvider(),
    serphouse: new SerpHouseProvider(),
    adultmedia: new AdultMediaProvider(),
    qualityporn: new QualityPornProvider(),
    apify: new ApifyProvider(),
    scrapers: new ScrapersProvider(),
    adapters: new AdaptersProvider(),
    seznam: new SeznamProvider()
  }
}

/**
 * Run comprehensive health check across all providers
 * @param {Object} providers - Provider instances
 * @param {Object} env - Environment variables
 * @param {boolean} debug - Debug mode flag
 * @returns {Promise<Object>} Test results
 */
async function runProviderHealthCheck(providers, env, debug) {
  const results = {}
  const testQuery = 'jackprobe'

  // Test each provider individually
  for (const [providerName, provider] of Object.entries(providers)) {
    try {
      const startTime = Date.now()
      const result = await testSingleProvider(providerName, provider, env, testQuery, debug)
      result.timing_ms = Date.now() - startTime
      results[providerName] = result
    } catch (error) {
      results[providerName] = {
        provider: providerName,
        status: 'fail',
        mapped_error_code: ERROR_CODES.UNKNOWN,
        skip_reason: null,
        timing_ms: 0,
        sample_payload_preview: null,
        config_status: { missing: [], present: [] },
        last_attempted_url: null,
        explanation: `Unexpected error: ${error.message}`,
        next_action: 'Check application logs for details'
      }
    }
  }

  return results
}

/**
 * Test a single provider
 * @param {string} providerName - Name of the provider
 * @param {Object} provider - Provider instance
 * @param {Object} env - Environment variables
 * @param {string} testQuery - Test query to use
 * @param {boolean} debug - Debug mode flag
 * @returns {Promise<Object>} Test result
 */
async function testSingleProvider(providerName, provider, env, testQuery, debug) {
  const config = PROVIDER_CONFIGS[providerName]
  const configStatus = validateProviderConfig(providerName, env)

  // If config is invalid, skip the call
  if (!configStatus.valid) {
    return {
      provider: providerName,
      status: 'fail',
      mapped_error_code: ERROR_CODES.BAD_PARAMS,
      skip_reason: 'BAD_PARAMS',
      timing_ms: 0,
      sample_payload_preview: null,
      config_status: configStatus,
      last_attempted_url: null,
      explanation: `Missing required configuration: ${configStatus.missing.join(', ')}`,
      next_action: `Set environment variables: ${configStatus.missing.join(', ')}`
    }
  }

  try {
    // Create test options (bypass cache, minimal results)
    const testOptions = {
      limit: 3,
      safeMode: true,
      ledger: null, // Bypass ledger for self-test
      cache_written: false // Ensure no cache writes
    }

    // Execute the test call
    const results = await provider.search(testQuery, testOptions, env)

    // Success case
    const samplePayload = results.length > 0 ?
      redactSecrets(JSON.stringify(results[0]).substring(0, 800)) : null

    return {
      provider: providerName,
      status: 'ok',
      mapped_error_code: null,
      skip_reason: null,
      timing_ms: 0, // Will be set by caller
      sample_payload_preview: samplePayload,
      config_status: configStatus,
      last_attempted_url: null,
      explanation: `Successfully returned ${results.length} results`,
      next_action: null
    }

  } catch (error) {
    const mappedError = mapProviderError(error, providerName)

    return {
      provider: providerName,
      status: 'fail',
      mapped_error_code: mappedError.code,
      skip_reason: null,
      timing_ms: 0, // Will be set by caller
      sample_payload_preview: null,
      config_status: configStatus,
      last_attempted_url: mappedError.last_attempted_url,
      explanation: mappedError.explanation,
      next_action: mappedError.next_action
    }
  }
}

/**
 * Validate provider configuration
 * @param {string} providerName - Name of the provider
 * @param {Object} env - Environment variables
 * @returns {Object} Configuration validation result
 */
function validateProviderConfig(providerName, env) {
  const config = PROVIDER_CONFIGS[providerName]
  const missing = []
  const present = []

  for (const envVar of config.required) {
    const value = env[envVar]
    if (!value || value === `your_${envVar.toLowerCase()}_here` || value.includes('your_')) {
      missing.push(envVar)
    } else {
      present.push(envVar)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    present
  }
}

/**
 * Map provider errors to canonical error codes
 * @param {Error} error - The error object
 * @param {string} providerName - Name of the provider
 * @returns {Object} Mapped error information
 */
function mapProviderError(error, providerName) {
  const message = error.message.toLowerCase()
  const originalMessage = error.message

  // Extract last attempted URL if present
  let last_attempted_url = null
  const urlMatch = originalMessage.match(/URL:\s*(.+)/)
  if (urlMatch) {
    last_attempted_url = urlMatch[1]
  }

  // Authentication errors
  if (message.includes('invalid') && message.includes('key')) {
    return {
      code: ERROR_CODES.INVALID_AUTH,
      explanation: 'API key is invalid or expired',
      next_action: 'Check and rotate API key',
      last_attempted_url
    }
  }

  if (message.includes('unauthorized') || message.includes('403')) {
    return {
      code: ERROR_CODES.INVALID_AUTH,
      explanation: 'Authentication failed - invalid credentials',
      next_action: 'Verify API key and permissions',
      last_attempted_url
    }
  }

  // Host/header errors
  if (message.includes('host') && message.includes('mismatch')) {
    return {
      code: ERROR_CODES.BAD_HOST,
      explanation: 'RapidAPI host header mismatch',
      next_action: 'Correct x-rapidapi-host header value',
      last_attempted_url
    }
  }

  // Parameter errors
  if (message.includes('missing') && message.includes('param')) {
    return {
      code: ERROR_CODES.BAD_PARAMS,
      explanation: 'Required parameters missing or malformed',
      next_action: 'Check API documentation for required parameters',
      last_attempted_url
    }
  }

  // Specific HTTP status codes
  if (message.includes('400')) {
    return {
      code: ERROR_CODES.BAD_PARAMS,
      explanation: 'Bad request - invalid parameters or malformed request',
      next_action: 'Check API documentation for correct parameter format',
      last_attempted_url
    }
  }

  if (message.includes('404')) {
    return {
      code: ERROR_CODES.BAD_HOST,
      explanation: 'Resource not found - invalid endpoint or host',
      next_action: 'Verify API endpoint URL and host configuration',
      last_attempted_url
    }
  }

  if (message.includes('422')) {
    return {
      code: ERROR_CODES.BAD_PARAMS,
      explanation: 'Unprocessable entity - request parameters rejected by server',
      next_action: 'Check parameter values and API documentation',
      last_attempted_url
    }
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('abort')) {
    return {
      code: ERROR_CODES.TIMEOUT,
      explanation: 'Request timed out',
      next_action: 'Check network connectivity or increase timeout',
      last_attempted_url
    }
  }

  // Rate limit errors
  if (message.includes('rate') && message.includes('limit')) {
    return {
      code: ERROR_CODES.RATE_LIMIT,
      explanation: 'Rate limit exceeded',
      next_action: 'Wait for rate limit reset or upgrade plan',
      last_attempted_url
    }
  }

  if (message.includes('429')) {
    return {
      code: ERROR_CODES.RATE_LIMIT,
      explanation: 'Too many requests (HTTP 429)',
      next_action: 'Implement request throttling or upgrade API plan',
      last_attempted_url
    }
  }

  // Quota errors
  if (message.includes('quota') && message.includes('daily')) {
    return {
      code: ERROR_CODES.QUOTA_EXCEEDED_DAILY,
      explanation: 'Daily quota exceeded',
      next_action: 'Wait for daily reset or upgrade API plan',
      last_attempted_url
    }
  }

  if (message.includes('quota') && message.includes('monthly')) {
    return {
      code: ERROR_CODES.QUOTA_EXCEEDED_MONTHLY,
      explanation: 'Monthly quota exceeded',
      next_action: 'Upgrade API plan or wait for monthly reset',
      last_attempted_url
    }
  }

  // Network errors
  if (message.includes('network') || message.includes('connection')) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      explanation: 'Network connectivity issue',
      next_action: 'Check internet connection and DNS resolution',
      last_attempted_url
    }
  }

  // Upstream errors
  if (message.includes('5') && message.includes('x')) {
    return {
      code: ERROR_CODES.UPSTREAM_ERROR,
      explanation: 'Upstream API server error',
      next_action: 'Check provider status page or try again later',
      last_attempted_url
    }
  }

  // Default to unknown
  return {
    code: ERROR_CODES.UNKNOWN,
    explanation: `Unknown error: ${error.message}`,
    next_action: 'Check application logs and API documentation',
    last_attempted_url
  }
}

/**
 * Redact secrets from payload preview
 * @param {string} payload - The payload string
 * @returns {string} Redacted payload
 */
function redactSecrets(payload) {
  if (!payload) return null

  return payload
    .replace(/("key"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("token"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("api_key"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("Authorization"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("X-API-KEY"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("x-rapidapi-key"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
}

/**
 * Generate consolidated report
 * @param {Object} results - Test results
 * @returns {Object} Consolidated report
 */
function generateConsolidatedReport(results) {
  const summary = {
    total_providers: Object.keys(results).length,
    healthy_providers: Object.values(results).filter(r => r.status === 'ok').length,
    failed_providers: Object.values(results).filter(r => r.status === 'fail').length,
    timestamp: new Date().toISOString(),
    test_duration_ms: Date.now() - new Date().getTime() // This will be approximate
  }

  // Create summary table
  const summaryTable = Object.entries(results).map(([provider, result]) => ({
    provider,
    status: result.status.toUpperCase(),
    error_code: result.mapped_error_code || 'N/A',
    timing_ms: result.timing_ms,
    explanation: result.explanation
  }))

  return {
    summary,
    summary_table: summaryTable,
    detailed_results: results,
    human_readable_report: generateHumanReadableReport(results, summary)
  }
}

/**
 * Generate human-readable report
 * @param {Object} results - Test results
 * @param {Object} summary - Summary statistics
 * @returns {string} Human-readable report
 */
function generateHumanReadableReport(results, summary) {
  let report = `🚀 JACK PORTAL PROVIDER HEALTH CHECK REPORT\n`
  report += `═══════════════════════════════════════════════\n\n`

  report += `📊 SUMMARY\n`
  report += `──────────\n`
  report += `Total Providers: ${summary.total_providers}\n`
  report += `✅ Healthy: ${summary.healthy_providers}\n`
  report += `❌ Failed: ${summary.failed_providers}\n`
  report += `⏱️  Generated: ${summary.timestamp}\n\n`

  report += `📋 PROVIDER STATUS\n`
  report += `──────────────────\n`

  for (const [provider, result] of Object.entries(results)) {
    const statusIcon = result.status === 'ok' ? '✅' : '❌'
    const timing = result.timing_ms ? ` (${result.timing_ms}ms)` : ''

    report += `${statusIcon} ${provider.toUpperCase()}${timing}\n`

    if (result.mapped_error_code) {
      report += `   Error: ${result.mapped_error_code}\n`
    }

    report += `   ${result.explanation}\n`

    if (result.next_action) {
      report += `   → ${result.next_action}\n`
    }

    if (result.config_status.missing.length > 0) {
      report += `   Missing config: ${result.config_status.missing.join(', ')}\n`
    }

    report += `\n`
  }

  report += `🔧 TROUBLESHOOTING TIPS\n`
  report += `────────────────────────\n`
  report += `• Check environment variables in .dev.vars or Cloudflare dashboard\n`
  report += `• Verify API keys are valid and have sufficient quota\n`
  report += `• Ensure correct headers are being sent for each provider\n`
  report += `• Check provider status pages for outages\n`
  report += `• Review rate limits and implement backoff strategies\n\n`

  return report
}
