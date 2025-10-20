/**
 * Proxy Stats Handler - Returns proxy pool statistics
 */

import { createErrorResponse } from '../lib/response.js';

export async function handleProxyStats(request, env) {
  try {
    // Import ProxyService dynamically
    const { ProxyService } = await import('../lib/proxy-service.js');
    const proxyService = new ProxyService(env);

    const stats = proxyService.getProxyStats();
    const regions = proxyService.getAvailableRegions();

    return new Response(JSON.stringify({
      status: 'ok',
      stats,
      regions,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Proxy stats error:', error);

    return createErrorResponse(
      'Failed to get proxy stats: ' + error.message,
      500,
      { type: 'ProxyStatsError' }
    );
  }
}
