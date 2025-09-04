/**
 * Response utilities for Jack Portal
 */

/**
 * Creates a compressed response with appropriate headers
 * @param {string|Object} data - The response data
 * @param {Object} options - Response options
 * @returns {Response} - The compressed response
 */
export function createCompressedResponse(data, options = {}) {
  const {
    status = 200,
    headers = {},
    compress = true
  } = options

  // Convert data to JSON string if it's an object
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data)

  // Set default headers
  const responseHeaders = {
    'Content-Type': 'application/json',
    'X-Content-Encoding': 'gzip',
    'X-Compressed-By': 'Jack-Portal',
    ...headers
  }

  // Add compression headers if enabled
  if (compress) {
    responseHeaders['Content-Encoding'] = 'gzip'
    responseHeaders['Vary'] = 'Accept-Encoding'
  }

  return new Response(jsonString, {
    status,
    headers: responseHeaders
  })
}

/**
 * Creates a CORS-enabled response
 * @param {string|Object} data - The response data
 * @param {Object} options - Response options
 * @returns {Response} - The CORS-enabled response
 */
export function createCORSResponse(data, options = {}) {
  const {
    status = 200,
    headers = {},
    origin = '*',
    methods = 'GET, POST, OPTIONS',
    credentials = false
  } = options

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
    ...headers
  }

  if (credentials) {
    corsHeaders['Access-Control-Allow-Credentials'] = 'true'
  }

  return createCompressedResponse(data, {
    ...options,
    status,
    headers: corsHeaders
  })
}

/**
 * Creates an error response with proper formatting
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Response} - The error response
 */
export function createErrorResponse(message, status = 500, details = {}) {
  const errorData = {
    error: message,
    status,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    ...details
  }

  return createCORSResponse(errorData, {
    status,
    headers: {
      'X-Error-Type': details.type || 'ApplicationError',
      'X-Request-ID': errorData.requestId
    }
  })
}

/**
 * Creates a success response with metadata
 * @param {Object} data - The response data
 * @param {Object} metadata - Additional metadata
 * @returns {Response} - The success response
 */
export function createSuccessResponse(data, metadata = {}) {
  const responseData = {
    ...data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      ...metadata
    }
  }

  return createCORSResponse(responseData, {
    headers: {
      'X-Request-ID': responseData.metadata.requestId,
      'X-Response-Type': 'Success'
    }
  })
}

/**
 * Handles OPTIONS requests for CORS preflight
 * @param {Request} request - The incoming request
 * @returns {Response} - The preflight response
 */
export function handleOptionsRequest(request) {
  const origin = request.headers.get('Origin') || '*'

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'X-Preflight-Allowed': 'true'
    }
  })
}
