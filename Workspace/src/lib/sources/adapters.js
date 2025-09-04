/**
 * Adapters Provider
 * Handles social media and forum content with quality metrics and robots compliance
 */

import { RobotsChecker } from '../robots-checker.js'

export class AdaptersProvider {
  constructor() {
    this.name = 'Adapters'
    this.baseUrl = 'https://adapters-api.example.com'
    this.version = '1.1.0'
    this.robotsChecker = null
  }

  async search(query, options, env) {
    const apiKey = env.ADAPTERS_API_KEY

    if (!apiKey) {
      console.warn('Adapters API key not configured')
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
        // Enhanced parameters for better adapter matching
        freshness_filter: this.buildFreshnessFilter(options.fresh),
        duration_filter: options.duration,
        content_types: ['article', 'blog', 'news', 'documentation']
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
        throw new Error(`Adapters API error: ${response.status}`)
      }

      // Process and normalize results from various adapters
      const processedResults = (data.results || []).map(item => {
        const normalized = this.normalizeAdapterResult(item, options)
        return {
          title: normalized.title || 'No title',
          url: normalized.url || '#',
          snippet: normalized.snippet || '',
          score: normalized.score || 0.5,
          thumbnail: normalized.thumbnail || null,
          published_at: normalized.published_at || null,
          author: normalized.author || null,
          extra: {
            adapter_type: normalized.adapter_type || 'generic',
            confidence: normalized.confidence || 0.5,
            content_type: normalized.content_type || 'article',
            language: normalized.language || 'en',
            tags: normalized.tags || [],
            word_count: normalized.word_count || 0,
            readability_score: normalized.readability_score || 0,
            quality_score: normalized.quality_score || 0.5,
            source_freshness: normalized.source_freshness || 'unknown',
            robots_allowed: normalized.robots_allowed !== false,
            last_modified: normalized.last_modified || null,
            adapter_version: this.version
          }
        }
      })

      return processedResults

    } catch (error) {
      if (error.message === 'QUOTA_EXCEEDED') {
        throw error
      }
      console.warn('Adapters search error:', error.message)
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

  normalizeAdapterResult(item, options) {
    const normalized = { ...item }

    // Detect adapter type from result structure
    normalized.adapter_type = this.detectAdapterType(item)

    // Normalize confidence score
    normalized.confidence = typeof item.confidence === 'number' ?
      Math.max(0, Math.min(1, item.confidence)) : 0.5

    // Calculate word count
    const text = item.snippet || item.description || ''
    if (text) {
      normalized.word_count = text.split(/\s+/).length
    }

    // Basic readability score
    normalized.readability_score = this.calculateReadabilityScore(text)

    // Quality score based on adapter-specific factors
    normalized.quality_score = this.calculateAdapterQualityScore(normalized)

    // Source freshness assessment
    normalized.source_freshness = this.assessFreshness(item.published_at, options.fresh)

    // Language detection (simplified)
    normalized.language = this.detectLanguage(item)

    // Tag extraction and normalization
    normalized.tags = this.extractAndNormalizeTags(item)

    // Content type detection
    normalized.content_type = this.detectContentType(item)

    // Robots.txt compliance
    normalized.robots_status = 'checking'
    normalized.robots_allowed = true // Default to allowed

    return normalized
  }

  detectAdapterType(item) {
    // Detect adapter type based on result structure and metadata
    if (item.source === 'twitter' || item.source === 'x') {
      return 'social'
    }
    if (item.source === 'reddit') {
      return 'forum'
    }
    if (item.source === 'hackernews' || item.source === 'hn') {
      return 'news'
    }
    if (item.api_source || item.adapter_name) {
      return item.api_source || item.adapter_name
    }

    return 'generic'
  }

  calculateReadabilityScore(text) {
    if (!text || text.length === 0) return 0

    const words = text.split(/\s+/).length
    const sentences = text.split(/[.!?]+/).length

    if (sentences === 0) return 0

    // Simplified readability based on average words per sentence
    const avgWordsPerSentence = words / sentences

    // Ideal range: 10-20 words per sentence
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
      return 70
    } else if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 25) {
      return 50
    } else {
      return 30
    }
  }

  calculateAdapterQualityScore(item) {
    let score = 0.5

    // Adapter confidence bonus
    if (item.confidence && item.confidence > 0.7) {
      score += 0.1
    }

    // Content length bonus
    if (item.word_count && item.word_count > 30) {
      score += 0.1
    }

    // Readability bonus
    if (item.readability_score && item.readability_score > 40) {
      score += 0.1
    }

    // Author/source presence
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

    // Adapter type bonuses
    switch (item.adapter_type) {
      case 'news':
        score += 0.05
        break
      case 'documentation':
        score += 0.05
        break
      case 'social':
        score -= 0.05 // Social media often lower quality
        break
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

  detectLanguage(item) {
    // Simplified language detection based on content
    const text = (item.title || '') + ' ' + (item.snippet || '')

    // Common non-English patterns
    if (text.match(/[àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/i)) {
      return 'other'
    }

    return 'en'
  }

  extractAndNormalizeTags(item) {
    const tags = []

    // Extract from explicit tags field
    if (item.tags && Array.isArray(item.tags)) {
      tags.push(...item.tags)
    }

    // Extract from categories
    if (item.categories && Array.isArray(item.categories)) {
      tags.push(...item.categories)
    }

    // Extract from title/snippet keywords (simplified)
    const text = ((item.title || '') + ' ' + (item.snippet || '')).toLowerCase()
    const keywords = ['javascript', 'python', 'react', 'node', 'api', 'tutorial', 'guide']

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        tags.push(keyword)
      }
    }

    // Normalize and deduplicate
    return [...new Set(tags.map(tag =>
      typeof tag === 'string' ? tag.toLowerCase().trim() : ''
    ).filter(tag => tag.length > 0))].slice(0, 10)
  }

  detectContentType(item) {
    const title = (item.title || '').toLowerCase()
    const snippet = (item.snippet || '').toLowerCase()
    const url = (item.url || '').toLowerCase()

    if (url.includes('/blog/') || title.includes('blog') || snippet.includes('posted')) {
      return 'blog'
    }
    if (url.includes('/news/') || title.includes('news') || snippet.includes('breaking')) {
      return 'news'
    }
    if (url.includes('/docs/') || url.includes('/documentation/') || snippet.includes('api')) {
      return 'documentation'
    }
    if (item.adapter_type === 'social' || item.adapter_type === 'forum') {
      return item.adapter_type
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
