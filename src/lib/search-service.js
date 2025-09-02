import { providers } from './sources/index.js'
import { getConfig } from '../config/index.js'
import { generateCacheKey, parseDuration } from '../utils/index.js'

export class SearchService {
  constructor(env) {
    this.providers = providers
    this.config = getConfig(env)
    this.cache = new Map()
    this.rateLimitCache = new Map()
    this.env = env
  }

  async search(params, env) {
    const { q, mode, fresh, limit = 10, duration, site, hostMode, durationMode, showThumbs, provider, safeMode = true } = params
    if (!q) {
      throw new Error('Query is required')
    }

    // Rate limiting
    const clientIP = this.getClientIP(params)
    if (!this.checkRateLimit(clientIP)) {
      throw new Error('Rate limit exceeded')
    }

    const cacheKey = generateCacheKey(params)
    
    // KV cache check
    if (!fresh && this.env.JACK_STORAGE) {
      const cached = await this.env.JACK_STORAGE.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    // In-memory cache check
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    let results = []

    if (provider) {
      // Single provider
      const selectedProvider = this.providers.find(p => p.name.toLowerCase() === provider.toLowerCase())
      if (!selectedProvider) {
        throw new Error(`Provider ${provider} not found`)
      }
      results = await selectedProvider.search(q, { limit, fresh, safeMode }, this.env)
    } else {
      // Multi-provider search with weighted order
      const providerOrder = this.getProviderOrder(mode, safeMode)
      const searchPromises = providerOrder.map(async (provider) => {
        try {
          const providerResults = await provider.search(q, { limit: Math.ceil(limit / providerOrder.length), fresh, safeMode }, this.env)
          return providerResults
        } catch (error) {
          console.warn(`${provider.name} search error:`, error.message)
          return []
        }
      })

      const allResults = await Promise.allSettled(searchPromises)
      results = allResults.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    }

    // Filter and sort results
    let filteredResults = this.filterResults(results, { duration, hostMode, durationMode, safeMode })
    
    // Deduplicate by normalized URL
    const seen = new Set()
    filteredResults = filteredResults.filter(result => {
      const normalized = this.normalizeUrl(result.url)
      if (seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })

    // Sort by score
    filteredResults.sort((a, b) => (b.score || 0) - (a.score || 0))

    // Link following/enrichment
    if (this.env.FOLLOW_LINKS && filteredResults.length > 0) {
      filteredResults = await this.enrichResults(filteredResults.slice(0, 5), this.env)
    }

    // Limit results
    filteredResults = filteredResults.slice(0, limit)

    // Cache results
    this.cache.set(cacheKey, filteredResults)
    setTimeout(() => this.cache.delete(cacheKey), this.config.CACHE_TTL * 1000)
    
    // KV cache store
    if (this.env.JACK_STORAGE) {
      await this.env.JACK_STORAGE.put(cacheKey, JSON.stringify(filteredResults), { expirationTtl: this.config.CACHE_TTL })
    }

    return filteredResults
  }

  getProviderOrder(mode, safeMode) {
    const baseOrder = [this.providers.find(p => p.name === 'Google'), 
                       this.providers.find(p => p.name === 'Brave'),
                       this.providers.find(p => p.name === 'Yandex')]
    
    if (!safeMode) {
      baseOrder.push(this.providers.find(p => p.name === 'AdultMedia'))
    }
    
    if (this.env.INCLUDE_REDDIT) {
      baseOrder.push(this.providers.find(p => p.name === 'Reddit'))
    }
    
    return baseOrder.filter(Boolean)
  }

  getClientIP(params) {
    // Extract IP from request headers or params
    return params.ip || 'unknown'
  }

  checkRateLimit(clientIP) {
    const now = Date.now()
    const windowMs = 60000 // 1 minute
    const maxRequests = 10

    if (!this.rateLimitCache.has(clientIP)) {
      this.rateLimitCache.set(clientIP, [])
    }

    const requests = this.rateLimitCache.get(clientIP)
    requests.push(now)
    
    // Remove old requests
    const validRequests = requests.filter(time => now - time < windowMs)
    this.rateLimitCache.set(clientIP, validRequests)
    
    return validRequests.length <= maxRequests
  }

  normalizeUrl(url) {
    try {
      const u = new URL(url)
      return u.host + u.pathname
    } catch {
      return url
    }
  }

  filterResults(results, { duration, hostMode, durationMode, safeMode }) {
    return results.filter(result => {
      // Host filtering
      if (hostMode === 'relaxed' && this.config.ALLOWED_HOSTS && 
          !this.config.ALLOWED_HOSTS.some(host => result.url.includes(host))) {
        return false
      }
      
      if (hostMode === 'strict' && this.config.BLOCKED_HOSTS && 
          this.config.BLOCKED_HOSTS.some(host => result.url.includes(host))) {
        return false
      }

      // Duration filtering
      if (duration) {
        const parsedDuration = parseDuration(duration)
        if (parsedDuration && result.duration > parsedDuration) {
          return false
        }
      }

      // Safe mode filtering
      if (safeMode && result.extra?.nsfw) {
        return false
      }

      return true
    })
  }

  async enrichResults(results, env) {
    // Simple enrichment - could be expanded to follow links
    return results.map(result => ({
      ...result,
      enriched: true
    }))
  }
}
