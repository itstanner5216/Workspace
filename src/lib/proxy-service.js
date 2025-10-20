/**
 * Proxy Service - Manages proxy routing for geo-blocking bypass
 * Supports residential and datacenter proxy pools with rotation and fallback
 */

export class ProxyService {
  constructor(env) {
    this.env = env;
    this.proxyPools = this._initializeProxyPools();
    this.requestCount = new Map(); // Track requests per proxy
    this.failedProxies = new Set(); // Track failed proxies
    this.failureResetTime = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize proxy pools from environment variables
   * Format: PROXY_<REGION>_<TYPE>=url1,url2,url3
   */
  _initializeProxyPools() {
    const pools = {
      US: {
        residential: this._parseProxyList(this.env.PROXY_US_RESIDENTIAL),
        datacenter: this._parseProxyList(this.env.PROXY_US_DATACENTER),
        active: 'residential'
      },
      CA: {
        residential: this._parseProxyList(this.env.PROXY_CA_RESIDENTIAL),
        datacenter: this._parseProxyList(this.env.PROXY_CA_DATACENTER),
        active: 'residential'
      },
      UK: {
        residential: this._parseProxyList(this.env.PROXY_UK_RESIDENTIAL),
        datacenter: this._parseProxyList(this.env.PROXY_UK_DATACENTER),
        active: 'residential'
      },
      DE: {
        residential: this._parseProxyList(this.env.PROXY_DE_RESIDENTIAL),
        datacenter: this._parseProxyList(this.env.PROXY_DE_DATACENTER),
        active: 'residential'
      },
      NL: {
        residential: this._parseProxyList(this.env.PROXY_NL_RESIDENTIAL),
        datacenter: this._parseProxyList(this.env.PROXY_NL_DATACENTER),
        active: 'residential'
      },
      BR: {
        residential: this._parseProxyList(this.env.PROXY_BR_RESIDENTIAL),
        datacenter: this._parseProxyList(this.env.PROXY_BR_DATACENTER),
        active: 'residential'
      },
      AU: {
        residential: this._parseProxyList(this.env.PROXY_AU_RESIDENTIAL),
        datacenter: this._parseProxyList(this.env.PROXY_AU_DATACENTER),
        active: 'residential'
      },
      JP: {
        residential: this._parseProxyList(this.env.PROXY_JP_RESIDENTIAL),
        datacenter: this._parseProxyList(this.env.PROXY_JP_DATACENTER),
        active: 'residential'
      }
    };

    return pools;
  }

  /**
   * Parse comma-separated proxy list
   */
  _parseProxyList(proxyString) {
    if (!proxyString || typeof proxyString !== 'string') {
      return [];
    }

    return proxyString
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Get available regions
   */
  getAvailableRegions() {
    return Object.keys(this.proxyPools)
      .filter(region => {
        const pool = this.proxyPools[region];
        const total = (pool.residential?.length || 0) + (pool.datacenter?.length || 0);
        return total > 0;
      })
      .sort();
  }

  /**
   * Select a proxy from the pool using round-robin with failure detection
   */
  selectProxy(region = 'US', preferType = 'residential') {
    const pool = this.proxyPools[region];
    if (!pool) {
      console.warn(`Region ${region} not found, falling back to US`);
      return this.selectProxy('US', preferType);
    }

    // Try preferred type first
    let proxyList = pool[preferType];
    if (!proxyList || proxyList.length === 0) {
      // Fall back to other type
      proxyList = pool[preferType === 'residential' ? 'datacenter' : 'residential'];
    }

    if (!proxyList || proxyList.length === 0) {
      console.warn(`No proxies available for region ${region}`);
      return null;
    }

    // Find a working proxy using round-robin
    let attempts = 0;
    const maxAttempts = proxyList.length;

    while (attempts < maxAttempts) {
      const index = (this.requestCount.get(region) || 0) % proxyList.length;
      const proxy = proxyList[index];

      // Increment counter for next call
      this.requestCount.set(region, (this.requestCount.get(region) || 0) + 1);

      // Check if this proxy has been marked as failed
      if (!this._isProxyFailed(proxy)) {
        return {
          url: proxy,
          region,
          type: preferType,
          timestamp: Date.now()
        };
      }

      attempts++;
    }

    console.warn(`All proxies for region ${region} are temporarily unavailable`);
    return null;
  }

  /**
   * Check if a proxy is temporarily marked as failed
   */
  _isProxyFailed(proxyUrl) {
    const failKey = `${proxyUrl}_fail_time`;
    const failTime = this.failedProxies.get(failKey);

    if (!failTime) {
      return false;
    }

    // Check if failure has expired
    if (Date.now() - failTime > this.failureResetTime) {
      this.failedProxies.delete(failKey);
      return false;
    }

    return true;
  }

  /**
   * Mark a proxy as failed
   */
  markProxyFailed(proxyUrl) {
    const failKey = `${proxyUrl}_fail_time`;
    this.failedProxies.set(failKey, Date.now());
    console.warn(`Proxy marked as failed: ${proxyUrl}`);
  }

  /**
   * Mark a proxy as recovered
   */
  markProxyRecovered(proxyUrl) {
    const failKey = `${proxyUrl}_fail_time`;
    this.failedProxies.delete(failKey);
  }

  /**
   * Get proxy statistics
   */
  getProxyStats() {
    const stats = {};

    Object.entries(this.proxyPools).forEach(([region, pool]) => {
      const total = (pool.residential?.length || 0) + (pool.datacenter?.length || 0);
      const failed = Array.from(this.failedProxies.keys())
        .filter(k => k.includes(region))
        .length;

      stats[region] = {
        total,
        requests: this.requestCount.get(region) || 0,
        failed,
        active: total - failed
      };
    });

    return stats;
  }

  /**
   * Get proxy for fetch request (returns modified fetch options)
   */
  getProxyFetchOptions(region = 'US', preferType = 'residential') {
    const proxy = this.selectProxy(region, preferType);

    if (!proxy) {
      return {
        proxy: null,
        region,
        warning: 'No proxies available'
      };
    }

    return {
      proxy,
      region,
      fetchOptions: {
        cf: {
          // Cloudflare's native proxy support
          httpProxy: proxy.url,
          cacheTtl: 300 // Cache through proxy for 5 minutes
        }
      }
    };
  }

  /**
   * Validate region name
   */
  isValidRegion(region) {
    return region && this.proxyPools.hasOwnProperty(region);
  }

  /**
   * Get region info including available proxy types
   */
  getRegionInfo(region) {
    if (!this.isValidRegion(region)) {
      return null;
    }

    const pool = this.proxyPools[region];
    return {
      region,
      hasResidential: (pool.residential?.length || 0) > 0,
      hasDatacenter: (pool.datacenter?.length || 0) > 0,
      residentialCount: pool.residential?.length || 0,
      datacenterCount: pool.datacenter?.length || 0,
      preferred: pool.active || 'residential',
      stats: {
        requests: this.requestCount.get(region) || 0,
        failed: Array.from(this.failedProxies.keys())
          .filter(k => k.includes(region))
          .length
      }
    };
  }
}

export default ProxyService;
