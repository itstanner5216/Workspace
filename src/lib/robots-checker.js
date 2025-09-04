/**
 * Robots.txt Compliance Checker
 * Fetches, parses, and caches robots.txt for domains
 */

export class RobotsChecker {
  constructor(env) {
    this.env = env
    this.cache = env.CACHE
    this.cacheTtl = 6 * 60 * 60 // 6 hours cache for robots.txt
  }

  /**
   * Check if crawling is allowed for a URL
   * @param {string} url - The URL to check
   * @param {string} userAgent - User agent string (defaults to Jack-Portal)
   * @returns {Promise<Object>} - {allowed: boolean, status: string, cached: boolean}
   */
  async isAllowed(url, userAgent = 'Jack-Portal/2.0.0') {
    try {
      const domain = this._extractDomain(url)
      if (!domain) {
        return { allowed: true, status: 'no_domain', cached: false }
      }

      // Check override map first
      const overrideResult = this._checkOverrideMap(domain)
      if (overrideResult) {
        return { ...overrideResult, cached: false }
      }

      // Check cache
      const cacheKey = `robots:${domain}`
      const cached = await this._getCachedRobots(cacheKey)
      if (cached) {
        const allowed = this._checkRobotsRules(cached.rules, url, userAgent)
        return { allowed, status: 'cached', cached: true }
      }

      // Fetch and parse robots.txt
      const robotsUrl = `https://${domain}/robots.txt`
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': userAgent },
        cf: { timeout: 5000 } // 5 second timeout
      })

      if (!response.ok) {
        // If robots.txt doesn't exist or is unreachable, default to allowed
        return { allowed: true, status: 'unavailable', cached: false }
      }

      const robotsText = await response.text()
      const rules = this._parseRobotsTxt(robotsText)

      // Cache the parsed rules
      await this._cacheRobotsRules(cacheKey, rules)

      const allowed = this._checkRobotsRules(rules, url, userAgent)
      return { allowed, status: 'fetched', cached: false }

    } catch (error) {
      console.warn('Robots check error:', error.message)
      return { allowed: true, status: 'error', cached: false }
    }
  }

  /**
   * Extract domain from URL
   */
  _extractDomain(url) {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return null
    }
  }

  /**
   * Check domain override map
   */
  _checkOverrideMap(domain) {
    const override = ROBOTS_OVERRIDE_MAP[domain]
    if (!override) return null

    switch (override) {
      case 'force_allow':
        return { allowed: true, status: 'override_allow' }
      case 'force_block':
        return { allowed: false, status: 'override_block' }
      default:
        return null
    }
  }

  /**
   * Get cached robots rules
   */
  async _getCachedRobots(cacheKey) {
    if (!this.cache) return null

    try {
      const cached = await this.cache.get(cacheKey)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  /**
   * Cache robots rules
   */
  async _cacheRobotsRules(cacheKey, rules) {
    if (!this.cache) return

    try {
      await this.cache.put(cacheKey, JSON.stringify(rules), {
        expirationTtl: this.cacheTtl
      })
    } catch (error) {
      console.warn('Failed to cache robots rules:', error.message)
    }
  }

  /**
   * Parse robots.txt content
   */
  _parseRobotsTxt(text) {
    const lines = text.split('\n').map(line => line.trim())
    const rules = { '*': [], 'Jack-Portal/2.0.0': [] }
    let currentUserAgent = null

    for (const line of lines) {
      if (line.startsWith('#') || line === '') continue

      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const directive = line.substring(0, colonIndex).trim().toLowerCase()
      const value = line.substring(colonIndex + 1).trim()

      if (directive === 'user-agent') {
        currentUserAgent = value
        if (!rules[currentUserAgent]) {
          rules[currentUserAgent] = []
        }
      } else if (directive === 'disallow' && currentUserAgent) {
        rules[currentUserAgent].push({
          type: 'disallow',
          path: value
        })
      } else if (directive === 'allow' && currentUserAgent) {
        rules[currentUserAgent].push({
          type: 'allow',
          path: value
        })
      }
    }

    return rules
  }

  /**
   * Check if URL is allowed by robots rules
   */
  _checkRobotsRules(rules, url, userAgent) {
    // Try specific user agent first, then fall back to *
    const userAgentRules = rules[userAgent] || rules['*'] || []

    // Extract path from URL
    const urlObj = new URL(url)
    const path = urlObj.pathname + urlObj.search

    // Check rules in order (more specific first)
    for (const rule of userAgentRules) {
      if (this._pathMatches(path, rule.path)) {
        return rule.type === 'allow'
      }
    }

    // Default to allowed if no matching rules
    return true
  }

  /**
   * Check if path matches robots rule pattern
   */
  _pathMatches(path, rulePath) {
    if (rulePath === '') return true // Empty path matches everything
    if (rulePath === '/') return path.startsWith('/') // Root matches all paths

    // Simple wildcard matching
    const pattern = rulePath.replace(/\*/g, '.*')
    const regex = new RegExp(`^${pattern}`)
    return regex.test(path)
  }
}

// Domain override map - TODO: populate with specific domains
const ROBOTS_OVERRIDE_MAP = {
  // 'example.com': 'force_allow',  // Uncomment and replace with actual domains
  // 'problematic-site.com': 'force_block',
}
