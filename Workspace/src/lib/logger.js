/**
 * Logging utilities for Jack Portal
 */

/**
 * Log levels
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

/**
 * Current log level (can be set via environment variable)
 */
let currentLogLevel = LOG_LEVELS.INFO

/**
 * Sets the current log level
 * @param {string} level - Log level string
 */
export function setLogLevel(level) {
  const upperLevel = level.toUpperCase()
  if (LOG_LEVELS[upperLevel] !== undefined) {
    currentLogLevel = LOG_LEVELS[upperLevel]
  }
}

/**
 * Formats a log entry
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @returns {Object} - Formatted log entry
 */
function formatLogEntry(level, message, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
    service: 'jack-portal',
    version: '2.0.0'
  }
}

/**
 * Logs an error message
 * @param {string} message - Error message
 * @param {Object} data - Additional error data
 */
export function logError(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    const logEntry = formatLogEntry('ERROR', message, data)
    console.error(JSON.stringify(logEntry))
  }
}

/**
 * Logs a warning message
 * @param {string} message - Warning message
 * @param {Object} data - Additional warning data
 */
export function logWarn(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    const logEntry = formatLogEntry('WARN', message, data)
    console.warn(JSON.stringify(logEntry))
  }
}

/**
 * Logs an info message
 * @param {string} message - Info message
 * @param {Object} data - Additional info data
 */
export function logInfo(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    const logEntry = formatLogEntry('INFO', message, data)
    console.log(JSON.stringify(logEntry))
  }
}

/**
 * Logs a debug message
 * @param {string} message - Debug message
 * @param {Object} data - Additional debug data
 */
export function logDebug(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    const logEntry = formatLogEntry('DEBUG', message, data)
    console.debug(JSON.stringify(logEntry))
  }
}

/**
 * Logs request metrics
 * @param {Object} metrics - Request metrics
 */
export function logRequestMetrics(metrics) {
  logInfo('Request completed', {
    type: 'request_metrics',
    ...metrics
  })
}

/**
 * Logs API provider performance
 * @param {string} provider - API provider name
 * @param {Object} metrics - Provider metrics
 */
export function logProviderMetrics(provider, metrics) {
  logInfo('Provider performance', {
    type: 'provider_metrics',
    provider,
    ...metrics
  })
}

/**
 * Logs cache performance
 * @param {Object} metrics - Cache metrics
 */
export function logCacheMetrics(metrics) {
  logDebug('Cache operation', {
    type: 'cache_metrics',
    ...metrics
  })
}

/**
 * Logs rate limiting events
 * @param {Object} event - Rate limiting event data
 */
export function logRateLimitEvent(event) {
  logWarn('Rate limit event', {
    type: 'rate_limit',
    ...event
  })
}

/**
 * Logs validation errors
 * @param {Array} errors - Validation errors
 * @param {Object} context - Validation context
 */
export function logValidationErrors(errors, context = {}) {
  logWarn('Validation failed', {
    type: 'validation_error',
    errors,
    ...context
  })
}

/**
 * Creates a request context for logging
 * @param {Request} request - The incoming request
 * @returns {Object} - Request context
 */
export function createRequestContext(request) {
  const url = new URL(request.url)

  return {
    requestId: crypto.randomUUID(),
    method: request.method,
    path: url.pathname,
    query: url.search,
    ip: request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For') ||
        request.headers.get('X-Real-IP') ||
        'unknown',
    userAgent: request.headers.get('User-Agent'),
    referer: request.headers.get('Referer'),
    origin: request.headers.get('Origin')
  }
}

/**
 * Logs the start of a request
 * @param {Object} context - Request context
 */
export function logRequestStart(context) {
  logInfo('Request started', {
    type: 'request_start',
    ...context
  })
}

/**
 * Logs the end of a request
 * @param {Object} context - Request context
 * @param {number} duration - Request duration in ms
 * @param {number} status - Response status code
 */
export function logRequestEnd(context, duration, status) {
  logInfo('Request completed', {
    type: 'request_end',
    duration,
    status,
    ...context
  })
}

/**
 * Logs an error with full context
 * @param {Error} error - The error object
 * @param {Object} context - Request context
 */
export function logErrorWithContext(error, context = {}) {
  logError('Application error', {
    type: 'application_error',
    error: error.message,
    stack: error.stack,
    ...context
  })
}
