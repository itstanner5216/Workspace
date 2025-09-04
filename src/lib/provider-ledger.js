/**
 * Provider Ledger - Circuit Breaker and Health Tracking
 * Manages provider health states with KV persistence
 */

export class ProviderLedger {
  constructor(env) {
    this.env = env
    this.kv = env.PROVIDER_LEDGER
    this.inMemoryStates = new Map()
    this.memoryTtl = 5 * 60 * 1000 // 5 minutes fallback TTL

    // Configuration
    this.defaultQuotaResetMs = parseInt(env.LEDGER_DEFAULT_QUOTA_RESET_MS || '3600000') // 1 hour
    this.tempFailCooldownMs = parseInt(env.TEMP_FAIL_COOLDOWN_MS || '300000') // 5 minutes
    this.failureWindowMs = 5 * 60 * 1000 // 5 minutes for failure detection
    this.maxFailures = 3 // Max failures before TEMP_FAIL
  }

  /**
   * Load all provider states from KV
   */
  async loadStates() {
    if (!this.kv) {
      console.warn('PROVIDER_LEDGER KV not available, using in-memory only')
      return
    }

    try {
      const keys = await this.kv.list({ prefix: 'providers:' })
      const states = new Map()

      for (const key of keys.keys) {
        try {
          const value = await this.kv.get(key.name)
          if (value) {
            const state = JSON.parse(value)
            states.set(key.name.replace('providers:', ''), state)
          }
        } catch (error) {
          console.warn(`Failed to load state for ${key.name}:`, error.message)
        }
      }

      this.inMemoryStates = states
    } catch (error) {
      console.warn('Failed to load provider states from KV:', error.message)
    }
  }

  /**
   * Save all provider states to KV
   */
  async saveStates() {
    if (!this.kv) return

    try {
      const promises = []
      for (const [name, state] of this.inMemoryStates) {
        promises.push(this.kv.put(`providers:${name}`, JSON.stringify(state)))
      }
      await Promise.all(promises)
    } catch (error) {
      console.warn('Failed to save provider states to KV:', error.message)
    }
  }

  /**
   * Get provider state
   */
  getProviderState(name) {
    return this.inMemoryStates.get(name) || this._createDefaultState()
  }

  /**
   * Get all provider states for diagnostics
   */
  getDiagnostics(providerName = null) {
    if (providerName) {
      return this.getProviderState(providerName)
    }

    const states = {}
    for (const [name, state] of this.inMemoryStates) {
      states[name] = this._formatStateForDiagnostics(state)
    }
    return states
  }

  /**
   * Format state for diagnostics (hide sensitive data)
   */
  _formatStateForDiagnostics(state) {
    const totalRequests = (state.rolling.successCount || 0) +
                         (state.rolling.timeoutCount || 0) +
                         (state.rolling.error4xxCount || 0) +
                         (state.rolling.error5xxCount || 0)

    const successRate = totalRequests > 0 ?
      ((state.rolling.successCount || 0) / totalRequests * 100).toFixed(1) : '0.0'

    const timeoutRate = totalRequests > 0 ?
      ((state.rolling.timeoutCount || 0) / totalRequests * 100).toFixed(1) : '0.0'

    const error4xxRate = totalRequests > 0 ?
      ((state.rolling.error4xxCount || 0) / totalRequests * 100).toFixed(1) : '0.0'

    const error5xxRate = totalRequests > 0 ?
      ((state.rolling.error5xxCount || 0) / totalRequests * 100).toFixed(1) : '0.0'

    return {
      status: state.status,
      resetAt: state.resetAt,
      lastUsedAt: state.lastUsedAt,
      successRate: `${successRate}%`,
      timeoutRate: `${timeoutRate}%`,
      error4xxRate: `${error4xxRate}%`,
      error5xxRate: `${error5xxRate}%`,
      p50Latency: state.latencyMsP50,
      p95Latency: state.latencyMsP95,
      dailyUsed: state.dailyUsed || 0,
      dailyCap: state.dailyCap || 0,
      monthlyUsed: state.monthlyUsed || 0,
      monthlyCap: state.monthlyCap || 0,
      remaining: Math.max(0, (state.dailyCap || 0) - (state.dailyUsed || 0)),
      // AdultMedia dual-cap support
      requestsDailyUsed: state.requestsDailyUsed || 0,
      requestsDailyCap: state.requestsDailyCap || 0,
      objectsDailyUsed: state.objectsDailyUsed || 0,
      objectsDailyCap: state.objectsDailyCap || 0,
      requestsRemaining: Math.max(0, (state.requestsDailyCap || 0) - (state.requestsDailyUsed || 0)),
      lastSkipReason: state.lastSkipReason || null,
      rolling: state.rolling
    }
  }

  /**
   * Check if provider should be used
   */
  shouldUse(name, now = Date.now()) {
    const state = this.getProviderState(name)

    if (state.status === 'QUOTA_EXCEEDED') {
      if (state.resetAt && now >= new Date(state.resetAt).getTime()) {
        // Reset quota exceeded status
        state.status = 'OK'
        state.resetAt = null
        this.inMemoryStates.set(name, state)
        return true
      }
      return false
    }

    if (state.status === 'TEMP_FAIL') {
      if (state.resetAt && now >= new Date(state.resetAt).getTime()) {
        // Reset temp fail status
        state.status = 'OK'
        state.resetAt = null
        this.inMemoryStates.set(name, state)
        return true
      }
      return false
    }

    return state.status === 'OK'
  }

  /**
   * Check if provider is healthy (OK status)
   */
  isProviderHealthy(name) {
    return this.shouldUse(name)
  }

  /**
   * Record successful request
   */
  recordSuccess(name, latencyMs = null) {
    const state = this.getProviderState(name)
    const now = new Date().toISOString()

    state.status = 'OK'
    state.lastSuccessAt = now
    state.lastUsedAt = now
    state.resetAt = null

    // Update rolling counters
    state.rolling.successCount = (state.rolling.successCount || 0) + 1

    // Update latency estimates
    if (latencyMs !== null) {
      this._updateLatencyEstimates(state, latencyMs)
    }

    this.inMemoryStates.set(name, state)
  }

  /**
   * Record timeout error
   */
  recordTimeout(name) {
    const state = this.getProviderState(name)
    const now = new Date().toISOString()

    state.lastFailureAt = now
    state.lastUsedAt = now
    state.rolling.timeoutCount = (state.rolling.timeoutCount || 0) + 1

    this._checkFailureThreshold(name, state)
    this.inMemoryStates.set(name, state)
  }

  /**
   * Record 4xx error
   */
  recordError(name, type) {
    const state = this.getProviderState(name)
    const now = new Date().toISOString()

    state.lastFailureAt = now
    state.lastUsedAt = now

    if (type === '4xx') {
      state.rolling.error4xxCount = (state.rolling.error4xxCount || 0) + 1
    } else if (type === '5xx') {
      state.rolling.error5xxCount = (state.rolling.error5xxCount || 0) + 1
    }

    this._checkFailureThreshold(name, state)
    this.inMemoryStates.set(name, state)
  }

  /**
   * Mark quota exceeded
   */
  markQuotaExceeded(name, resetAtHint = null) {
    const state = this.getProviderState(name)
    const now = Date.now()

    state.status = 'QUOTA_EXCEEDED'
    state.lastFailureAt = new Date().toISOString()
    state.lastUsedAt = new Date().toISOString()
    state.rolling.quotaCount = (state.rolling.quotaCount || 0) + 1

    // Set reset time
    if (resetAtHint) {
      state.resetAt = resetAtHint
    } else {
      state.resetAt = new Date(now + this.defaultQuotaResetMs).toISOString()
    }

    this.inMemoryStates.set(name, state)
  }

  /**
   * Create default state for new providers
   */
  _createDefaultState() {
    return {
      status: 'OK',
      resetAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      lastUsedAt: null,
      dailyUsed: 0,
      dailyCap: 0,
      monthlyUsed: 0,
      monthlyCap: 0,
      // AdultMedia dual-cap support
      requestsDailyUsed: 0,
      requestsDailyCap: 0,
      objectsDailyUsed: 0,
      objectsDailyCap: 0,
      nextDailyResetAt: this._getNextDailyReset(),
      nextMonthlyResetAt: this._getNextMonthlyReset(),
      lastSkipReason: null,
      rolling: {
        successCount: 0,
        timeoutCount: 0,
        error4xxCount: 0,
        error5xxCount: 0,
        quotaCount: 0
      },
      latencyMsP50: null,
      latencyMsP95: null,
      latencySamples: []
    }
  }

  /**
   * Update latency estimates using rolling window
   */
  _updateLatencyEstimates(state, latencyMs) {
    // Keep last 100 samples for estimation
    if (!state.latencySamples) state.latencySamples = []
    state.latencySamples.push(latencyMs)
    if (state.latencySamples.length > 100) {
      state.latencySamples.shift()
    }

    if (state.latencySamples.length >= 10) {
      const sorted = [...state.latencySamples].sort((a, b) => a - b)
      state.latencyMsP50 = sorted[Math.floor(sorted.length * 0.5)]
      state.latencyMsP95 = sorted[Math.floor(sorted.length * 0.95)]
    }
  }

  /**
   * Check if failures exceed threshold and trigger TEMP_FAIL
   */
  _checkFailureThreshold(name, state) {
    const recentFailures = (state.rolling.timeoutCount || 0) +
                          (state.rolling.error5xxCount || 0)

    if (recentFailures >= this.maxFailures) {
      state.status = 'TEMP_FAIL'
      state.resetAt = new Date(Date.now() + this.tempFailCooldownMs).toISOString()
    }
  }

  /**
   * Increment requests daily usage counter (for AdultMedia dual-cap)
   */
  incrementRequestsDailyUsed(name) {
    const state = this.getProviderState(name)
    state.requestsDailyUsed = (state.requestsDailyUsed || 0) + 1
    this.inMemoryStates.set(name, state)
  }

  /**
   * Increment objects daily usage counter (for AdultMedia dual-cap)
   */
  incrementObjectsDailyUsed(name, count) {
    const state = this.getProviderState(name)
    state.objectsDailyUsed = (state.objectsDailyUsed || 0) + count
    this.inMemoryStates.set(name, state)
  }

  /**
   * Set requests daily cap for provider (for AdultMedia dual-cap)
   */
  setRequestsDailyCap(name, cap) {
    const state = this.getProviderState(name)
    state.requestsDailyCap = cap
    this.inMemoryStates.set(name, state)
  }

  /**
   * Set objects daily cap for provider (for AdultMedia dual-cap)
   */
  setObjectsDailyCap(name, cap) {
    const state = this.getProviderState(name)
    state.objectsDailyCap = cap
    this.inMemoryStates.set(name, state)
  }

  /**
   * Increment monthly usage counter
   */
  incrementMonthlyUsed(name) {
    const state = this.getProviderState(name)
    state.monthlyUsed = (state.monthlyUsed || 0) + 1
    this.inMemoryStates.set(name, state)
  }

  /**
   * Set daily cap for provider
   */
  setDailyCap(name, cap) {
    const state = this.getProviderState(name)
    state.dailyCap = cap
    this.inMemoryStates.set(name, state)
  }

  /**
   * Set monthly cap for provider
   */
  setMonthlyCap(name, cap) {
    const state = this.getProviderState(name)
    state.monthlyCap = cap
    this.inMemoryStates.set(name, state)
  }

  /**
   * Set last skip reason
   */
  setLastSkipReason(name, reason) {
    const state = this.getProviderState(name)
    state.lastSkipReason = reason
    this.inMemoryStates.set(name, state)
  }

  /**
   * Get next daily reset time (00:00 America/New_York)
   */
  _getNextDailyReset() {
    const now = new Date()
    const nextReset = new Date(now)
    nextReset.setUTCHours(4, 0, 0, 0) // 00:00 EST = 04:00 UTC
    if (nextReset <= now) {
      nextReset.setDate(nextReset.getDate() + 1)
    }
    return nextReset.toISOString()
  }

  /**
   * Get next monthly reset time (1st of next month)
   */
  _getNextMonthlyReset() {
    const now = new Date()
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextReset.toISOString()
  }
}
