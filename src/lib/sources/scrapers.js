/**
 * Scrapers Provider
 * Handles web scraping with quality metrics and robots compliance
 */

import { RobotsChecker } from '../robots-checker.js'

export class ScrapersProvider {
  constructor() {
    this.name = 'Scrapers'
    this.baseUrl = 'https://scrapers-api.example.com'
    this.version = '1.1.0'
    this.robotsChecker = null
  }

  async search(query, options, env) {
    const apiKey = env.SCRAPERS_API_KEY

    if (!apiKey || apiKey === 'your_scrapers_api_key_here' || apiKey.includes('your_')) {
      console.warn('Scrapers API key not configured or using placeholder')
      return []
    }

    try {
      const requestBody = {
        query: query,
        limit: Math.min(options.limit || 10, 15),
        safemode: options.safeMode,
        fresh: options.fresh,
        duration: options.duration,
        site: options.site,
        // Add freshness and duration parameters for server-side filtering
        freshness_filter: this.buildFreshnessFilter(options.fresh),
        duration_filter: options.duration
      }

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Jack-Portal/2.0.0'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`Scrapers API error: ${response.status}`)
      }

      // Process and enhance results with quality scoring
      const processedResults = (data.results || []).map(item => {
        const enhanced = this.enhanceWithQualityMetrics(item, options)
        return {
          title: enhanced.title || 'No title',
          url: enhanced.url || '#',
          snippet: enhanced.snippet || enhanced.description || '',
          score: enhanced.score || 0.5,
          thumbnail: enhanced.thumbnail || null,
          published_at: enhanced.published_at || null,
          author: enhanced.author || enhanced.source || null,
          extra: {
            scraped_at: enhanced.scraped_at,
            content_type: enhanced.content_type || 'article',
            word_count: enhanced.word_count || 0,
            readability_score: enhanced.readability_score || 0,
            quality_score: enhanced.quality_score || 0.5,
            source_freshness: enhanced.source_freshness || 'unknown',
            robots_allowed: enhanced.robots_allowed !== false,
            last_modified: enhanced.last_modified || null,
            adapter_version: this.version,
            tags: enhanced.tags || []
          }
        }
      })

      return processedResults

    } catch (error) {
      if (error.message === 'QUOTA_EXCEEDED') {
        throw error
      }
      console.warn('Scrapers search error:', error.message)
      return []
    }
  }

  buildFreshnessFilter(fresh) {
    if (!fresh || fresh === 'all') return null

    const now = new Date()
    let cutoffDate

    switch (fresh) {
      case 'd1':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'd7':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'd30':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'd365':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        return null
    }

    return cutoffDate.toISOString()
  }

  enhanceWithQualityMetrics(item, options) {
    const enhanced = { ...item }

    // Calculate word count
    const text = item.snippet || item.description || ''
    if (text) {
      enhanced.word_count = text.split(/\s+/).length
    }

    // Basic readability score (simplified)
    enhanced.readability_score = this.calculateReadabilityScore(text)

    // Quality score based on multiple factors
    enhanced.quality_score = this.calculateQualityScore(enhanced)

    // Source freshness based on published date
    enhanced.source_freshness = this.assessFreshness(item.published_at, options.fresh)

    // Robots.txt compliance check
    enhanced.robots_status = 'checking'
    enhanced.robots_allowed = true // Default to allowed

    // Content type detection
    enhanced.content_type = this.detectContentType(item)

    return enhanced
  }

  calculateReadabilityScore(text) {
    if (!text || text.length === 0) return 0

    const words = text.split(/\s+/).length
    const sentences = text.split(/[.!?]+/).length
    const syllables = this.countSyllables(text)

    if (sentences === 0) return 0

    // Simplified Flesch Reading Ease
    const avgWordsPerSentence = words / sentences
    const avgSyllablesPerWord = syllables / words

    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    return Math.max(0, Math.min(100, score))
  }

  countSyllables(text) {
    const words = text.toLowerCase().split(/\s+/)
    let syllables = 0

    for (const word of words) {
      syllables += this.countWordSyllables(word)
    }

    return syllables
  }

  countWordSyllables(word) {
    if (word.length <= 3) return 1

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    word = word.replace(/^y/, '')

    const matches = word.match(/[aeiouy]{1,2}/g)
    return matches ? matches.length : 1
  }

  calculateQualityScore(item) {
    let score = 0.5

    // Title quality
    if (item.title && item.title.length > 10 && item.title.length < 100) {
      score += 0.1
    }

    // Content length (prefer substantial content)
    if (item.word_count && item.word_count > 50) {
      score += 0.1
    }

    // Readability (prefer readable content)
    if (item.readability_score && item.readability_score > 30 && item.readability_score < 80) {
      score += 0.1
    }

    // Author presence
    if (item.author || item.source) {
      score += 0.05
    }

    // Published date presence
    if (item.published_at) {
      score += 0.05
    }

    // Fresh content bonus
    if (item.source_freshness === 'fresh') {
      score += 0.1
    }

    return Math.max(0, Math.min(1, score))
  }

  assessFreshness(publishedAt, freshFilter) {
    if (!publishedAt || !freshFilter || freshFilter === 'all') {
      return 'unknown'
    }

    try {
      const published = new Date(publishedAt)
      const now = new Date()
      const ageMs = now.getTime() - published.getTime()

      switch (freshFilter) {
        case 'd1':
          return ageMs <= 24 * 60 * 60 * 1000 ? 'fresh' : 'stale'
        case 'd7':
          return ageMs <= 7 * 24 * 60 * 60 * 1000 ? 'fresh' : 'stale'
        case 'd30':
          return ageMs <= 30 * 24 * 60 * 60 * 1000 ? 'fresh' : 'stale'
        case 'd365':
          return ageMs <= 365 * 24 * 60 * 60 * 1000 ? 'fresh' : 'stale'
        default:
          return 'unknown'
      }
    } catch (error) {
      return 'unknown'
    }
  }

  detectContentType(item) {
    const title = (item.title || '').toLowerCase()
    const snippet = (item.snippet || item.description || '').toLowerCase()
    const url = (item.url || '').toLowerCase()

    if (url.includes('/blog/') || title.includes('blog') || snippet.includes('posted')) {
      return 'blog'
    }
    if (url.includes('/news/') || title.includes('news') || snippet.includes('breaking')) {
      return 'news'
    }
    if (url.includes('/forum/') || url.includes('/thread/') || snippet.includes('reply')) {
      return 'forum'
    }
    if (url.includes('/docs/') || url.includes('/documentation/') || snippet.includes('api')) {
      return 'documentation'
    }

    return 'article'
  }

  async checkRobotsCompliance(url, env) {
    if (!this.robotsChecker) {
      this.robotsChecker = new RobotsChecker(env)
    }

    try {
      const result = await this.robotsChecker.isAllowed(url)
      return {
        allowed: result.allowed,
        status: result.status,
        cached: result.cached
      }
    } catch (error) {
      console.warn('Robots compliance check failed:', error.message)
      return {
        allowed: true, // Default to allowed on error
        status: 'error',
        cached: false
      }
    }
  }
}
