// Utility functions

// JWT generation
export function generateJWT(payload, secret) {
  // Simple JWT implementation for demo
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  const signature = btoa('signature') // Placeholder
  return `${header}.${body}.${signature}`
}

// URL validation
export function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Duration parsing
export function parseDuration(duration) {
  if (!duration) return null
  const match = duration.match(/(\d+)([mhs])/i)
  if (!match) return null
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    default: return null
  }
}

// Cache key generation
export function generateCacheKey(params) {
  return JSON.stringify(params)
}

// Random user agent
export function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    // Add more
  ]
  return agents[Math.floor(Math.random() * agents.length)]
}

// Sleep function
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
