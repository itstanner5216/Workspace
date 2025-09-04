/**
 * Adapter Registry - Provider Management and Metadata
 * Central registry for all search providers with metadata
 */

export class AdapterRegistry {
  constructor() {
    this.providers = new Map()
  }

  /**
   * Register a provider
   */
  register({
    name,
    version,
    type,
    searchFn,
    supportsFreshness = 'none',
    defaultWeightByMode = {},
    priority = 0,
    cooldowns = {}
  }) {
    if (!name || !searchFn) {
      throw new Error('Provider name and searchFn are required')
    }

    this.providers.set(name, {
      name,
      version: version || '1.0.0',
      type: type || 'api',
      searchFn,
      supportsFreshness,
      defaultWeightByMode,
      priority,
      cooldowns,
      registeredAt: new Date().toISOString()
    })
  }

  /**
   * Get provider by name
   */
  get(name) {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider '${name}' not found in registry`)
    }
    return provider
  }

  /**
   * List all registered providers
   */
  list() {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      version: provider.version,
      type: provider.type,
      supportsFreshness: provider.supportsFreshness,
      priority: provider.priority,
      defaultWeights: provider.defaultWeightByMode
    }))
  }

  /**
   * Check if provider exists
   */
  has(name) {
    return this.providers.has(name)
  }

  /**
   * Get provider metadata for diagnostics
   */
  getMetadata(name) {
    const provider = this.get(name)
    return {
      name: provider.name,
      version: provider.version,
      type: provider.type,
      supportsFreshness: provider.supportsFreshness,
      priority: provider.priority,
      defaultWeights: provider.defaultWeightByMode,
      registeredAt: provider.registeredAt
    }
  }

  /**
   * Get all metadata for diagnostics
   */
  getAllMetadata() {
    const metadata = {}
    for (const [name] of this.providers) {
      metadata[name] = this.getMetadata(name)
    }
    return metadata
  }

  /**
   * Get providers by type
   */
  getByType(type) {
    return Array.from(this.providers.values())
      .filter(provider => provider.type === type)
      .map(provider => provider.name)
  }

  /**
   * Get providers sorted by priority (highest first)
   */
  getByPriority() {
    return Array.from(this.providers.values())
      .sort((a, b) => b.priority - a.priority)
      .map(provider => provider.name)
  }
}
