/**
 * Request Wrapper - Standardized HTTP Requests with Auth, Timeout, and Retry
 * Provides consistent error handling and ledger integration
 */

import { ProviderLedger } from './provider-ledger.js'

export class RequestWrapper {
  constructor(env, ledger = null) {
    this.env = env
    this.ledger = ledger || new ProviderLedger(env)

    // Configuration
    this.defaultTimeoutMs = parseInt(env.FETCH_TIMEOUT_MS || '10000')
    this.maxRetries = parseInt(env.RETRY_MAX || '3')
    this.backoffBaseMs = parseInt(env.BACKOFF_BASE_MS || '1000')
    this.userAgent = env.USER_AGENT || 'Jack-Portal/2.0.0'
  }

  /**
   * Make HTTP request with retry logic and ledger integration
   */
  async request(providerName, options) {
    const {
      url,
      method = 'GET',
      headers = {},
      body = null,
      timeoutMs = this.defaultTimeoutMs,
      retries = this.maxRetries,
      backoffBaseMs = this.backoffBaseMs
    } = options

    let lastError = null
    const startTime = Date.now()

    // Add default headers
    const requestHeaders = {
      'User-Agent': this.userAgent,
      ...headers
    }

    // Redact sensitive headers for logging
    const safeHeaders = this._redactHeaders(requestHeaders)

    for (let attempt = 0; attempt <= retries; attempt++) {
      const attemptStart = Date.now()
      let controller = null
      let timeoutId = null

      try {
        // Create abort controller for timeout
        controller = new AbortController()
        timeoutId = setTimeout(() => controller.abort(), timeoutMs)

        const fetchOptions = {
          method,
          headers: requestHeaders,
          signal: controller.signal
        }

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
        }

        console.log(`Request attempt ${attempt + 1}/${retries + 1} for ${providerName}:`, {
          url: this._redactUrl(url),
          method,
          headers: safeHeaders,
          timeoutMs
        })

        const response = await fetch(url, fetchOptions)
        const latencyMs = Date.now() - attemptStart

        clearTimeout(timeoutId)

        // Record success in ledger
        this.ledger.recordSuccess(providerName, latencyMs)

        return {
          response,
          latencyMs,
          attempt: attempt + 1
        }

      } catch (error) {
        clearTimeout(timeoutId)
        lastError = error
        const latencyMs = Date.now() - attemptStart

        console.warn(`Request attempt ${attempt + 1} failed for ${providerName}:`, {
          error: error.message,
          latencyMs,
          url: this._redactUrl(url)
        })

        // Categorize error and record in ledger
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          this.ledger.recordTimeout(providerName)
        } else if (error.message === 'QUOTA_EXCEEDED' || (error.status && error.status === 429)) {
          this.ledger.markQuotaExceeded(providerName)
          // Don't retry on quota exceeded
          break
        } else if (error.status && error.status >= 400 && error.status < 500) {
          this.ledger.recordError(providerName, '4xx')
        } else if (error.status && error.status >= 500) {
          this.ledger.recordError(providerName, '5xx')
        } else {
          // Network or other error
          this.ledger.recordError(providerName, '5xx')
        }

        // Don't retry on certain errors
        if (error.message === 'QUOTA_EXCEEDED' ||
            (error.status && error.status >= 400 && error.status < 500 && error.status !== 429)) {
          break
        }

        // Wait before retry (only for GET requests and non-last attempt)
        if (attempt < retries && method === 'GET') {
          const backoffMs = backoffBaseMs * Math.pow(2, attempt) + Math.random() * 1000
          console.log(`Waiting ${backoffMs}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, backoffMs))
        }
      }
    }

    // All attempts failed
    const totalLatencyMs = Date.now() - startTime
    throw new Error(`Request failed after ${retries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Make GET request
   */
  async get(providerName, url, options = {}) {
    return this.request(providerName, {
      url,
      method: 'GET',
      ...options
    })
  }

  /**
   * Make POST request
   */
  async post(providerName, url, body, options = {}) {
    return this.request(providerName, {
      url,
      method: 'POST',
      body,
      ...options
    })
  }

  /**
   * Redact sensitive information from URLs
   */
  _redactUrl(url) {
    try {
      const urlObj = new URL(url)
      // Redact API keys from query parameters
      const params = urlObj.searchParams
      for (const [key, value] of params) {
        if (key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret')) {
          params.set(key, '[REDACTED]')
        }
      }
      return urlObj.toString()
    } catch {
      return url.replace(/([?&])(key|token|secret|api_key)=[^&]*/gi, '$1$2=[REDACTED]')
    }
  }

  /**
   * Redact sensitive headers
   */
  _redactHeaders(headers) {
    const sensitiveKeys = ['authorization', 'x-api-key', 'x-auth-token', 'cookie']
    const safeHeaders = {}

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        safeHeaders[key] = '[REDACTED]'
      } else {
        safeHeaders[key] = value
      }
    }

    return safeHeaders
  }
}
