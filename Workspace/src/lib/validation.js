/**
 * Input validation and sanitization utilities for Jack Portal
 */

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param {string} input - The input string to sanitize
 * @returns {string} - The sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return ''

  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove HTML/XML injection characters
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 500) // Limit length to prevent abuse
}

/**
 * Validates and sanitizes search query
 * @param {string} query - The search query
 * @returns {Object} - {isValid: boolean, value: string, error?: string}
 */
export function validateQuery(query) {
  if (!query || typeof query !== 'string') {
    return { isValid: false, value: '', error: 'Query parameter is required' }
  }

  const sanitized = sanitizeString(query)

  if (sanitized.length === 0) {
    return { isValid: false, value: '', error: 'Query cannot be empty after sanitization' }
  }

  if (sanitized.length < 2) {
    return { isValid: false, value: '', error: 'Query must be at least 2 characters long' }
  }

  if (sanitized.length > 200) {
    return { isValid: false, value: '', error: 'Query cannot exceed 200 characters' }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Validates mode parameter
 * @param {string} mode - The mode parameter
 * @returns {Object} - {isValid: boolean, value: string}
 */
export function validateMode(mode) {
  const allowedModes = ['normal', 'deep_niche']
  const sanitized = sanitizeString(mode || 'normal')

  // Handle legacy 'niche' mode by converting to 'normal'
  if (sanitized === 'niche') {
    return { isValid: true, value: 'normal' }
  }

  if (!allowedModes.includes(sanitized)) {
    return { isValid: true, value: 'normal' } // Default to normal if invalid
  }

  return { isValid: true, value: sanitized }
}

/**
 * Validates fresh parameter (time range)
 * @param {string} fresh - The fresh parameter
 * @returns {Object} - {isValid: boolean, value: string}
 */
export function validateFresh(fresh) {
  const allowedFresh = ['d1', 'd7', 'd30', 'd365', 'all']
  const sanitized = sanitizeString(fresh || 'd7')

  if (!allowedFresh.includes(sanitized)) {
    return { isValid: true, value: 'd7' } // Default to d7 if invalid
  }

  return { isValid: true, value: sanitized }
}

/**
 * Validates limit parameter
 * @param {string|number} limit - The limit parameter
 * @returns {Object} - {isValid: boolean, value: number}
 */
export function validateLimit(limit, env) {
  const maxLimit = parseInt(env.MAX_LIMIT) || 20
  const minLimit = parseInt(env.MIN_LIMIT) || 3
  const defaultLimit = parseInt(env.DEFAULT_LIMIT) || 10

  let numLimit = defaultLimit

  if (typeof limit === 'string') {
    numLimit = parseInt(limit, 10)
  } else if (typeof limit === 'number') {
    numLimit = limit
  }

  if (isNaN(numLimit)) {
    return { isValid: true, value: defaultLimit }
  }

  if (numLimit < minLimit) {
    return { isValid: true, value: minLimit }
  }

  if (numLimit > maxLimit) {
    return { isValid: true, value: maxLimit }
  }

  return { isValid: true, value: numLimit }
}

/**
 * Validates provider parameter
 * @param {string} provider - The provider parameter
 * @returns {Object} - {isValid: boolean, value: string}
 */
export function validateProvider(provider) {
  const allowedProviders = ['google', 'brave', 'yandex', 'adultmedia']
  const sanitized = sanitizeString(provider || '')

  if (sanitized && !allowedProviders.includes(sanitized)) {
    return { isValid: true, value: '' } // Empty means all providers
  }

  return { isValid: true, value: sanitized }
}

/**
 * Validates host mode parameter
 * @param {string} hostMode - The host mode parameter
 * @returns {Object} - {isValid: boolean, value: string}
 */
export function validateHostMode(hostMode) {
  const allowedModes = ['normal', 'strict', 'permissive']
  const sanitized = sanitizeString(hostMode || 'normal')

  if (!allowedModes.includes(sanitized)) {
    return { isValid: true, value: 'normal' }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Validates boolean-like parameters
 * @param {string} param - The parameter value
 * @param {boolean} defaultValue - Default value if invalid
 * @returns {boolean}
 */
export function validateBoolean(param, defaultValue = true) {
  if (typeof param === 'string') {
    const lower = param.toLowerCase()
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false
    }
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true
    }
  }

  return defaultValue
}

/**
 * Validates site parameter (domain restriction)
 * @param {string} site - The site parameter
 * @returns {Object} - {isValid: boolean, value: string}
 */
export function validateSite(site) {
  if (!site) return { isValid: true, value: '' }

  const sanitized = sanitizeString(site)

  // Basic domain validation regex
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!domainRegex.test(sanitized)) {
    return { isValid: false, value: '', error: 'Invalid domain format' }
  }

  return { isValid: true, value: sanitized }
}

/**
 * Comprehensive input validation for all request parameters
 * @param {URLSearchParams} params - URL search parameters
 * @param {Object} env - Environment variables
 * @returns {Object} - {isValid: boolean, data: Object, errors: Array}
 */
export function validateAllInputs(params, env) {
  const errors = []
  const data = {}

  // Validate query (required)
  const queryValidation = validateQuery(params.get('q'))
  if (!queryValidation.isValid) {
    errors.push(queryValidation.error)
  }
  data.query = queryValidation.value

  // Validate optional parameters
  data.mode = validateMode(params.get('mode')).value
  data.fresh = validateFresh(params.get('fresh')).value
  data.limit = validateLimit(params.get('limit'), env).value
  data.provider = validateProvider(params.get('provider')).value
  data.hostMode = validateHostMode(params.get('hostMode')).value

  // Validate site parameter
  const siteValidation = validateSite(params.get('site'))
  if (!siteValidation.isValid) {
    errors.push(siteValidation.error)
  }
  data.site = siteValidation.value

  // Validate boolean parameters
  data.showThumbs = validateBoolean(params.get('showThumbs'), true)
  data.safeMode = validateBoolean(params.get('safeMode'), true)
  data.debug = validateBoolean(params.get('debug'), false)

  // Optional parameters that don't need validation
  data.duration = sanitizeString(params.get('duration') || '')
  data.durationMode = sanitizeString(params.get('durationMode') || 'normal')

  return {
    isValid: errors.length === 0,
    data,
    errors
  }
}
