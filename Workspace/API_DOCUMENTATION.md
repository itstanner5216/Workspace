# Jack Portal API Documentation

## Overview

Jack Portal is a Cloudflare Worker that provides multi-provider search functionality with intelligent caching and rate limiting.

**Base URL:** `https://your-worker-url.workers.dev`
**Version:** 2.0.0
**Last Updated:** September 2, 2025

## Authentication

Currently, no authentication is required. API keys for search providers are configured server-side.

## Endpoints

### 1. Search API
**Endpoint:** `GET /api/search`

Perform a search across multiple providers with intelligent caching.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query (2-200 characters) |
| `mode` | string | No | `normal` | Search mode: `normal`, `deep_niche` |
| `fresh` | string | No | `d7` | Time filter: `d1`, `d7`, `d30`, `d365`, `all` |
| `limit` | number | No | `10` | Results per provider (3-20) |
| `provider` | string | No | `all` | Specific provider: `google`, `brave`, `yandex`, `adultmedia` |
| `site` | string | No | - | Domain restriction (e.g., `example.com`) |
| `showThumbs` | boolean | No | `true` | Include thumbnails |
| `safeMode` | boolean | No | `true` | Safe search filter |

#### Example Request

```bash
curl "https://your-worker.workers.dev/api/search?q=cloudflare&mode=normal&limit=5"
```

#### Example Response

```json
{
  "results": [
    {
      "title": "Cloudflare - The Web Performance & Security Company",
      "url": "https://www.cloudflare.com/",
      "snippet": "Cloudflare, Inc. is an American web infrastructure and website security company...",
      "source": "google",
      "score": 0.95,
      "thumbnail": "https://...",
      "published_at": null,
      "author": null
    }
  ],
  "query": "cloudflare",
  "mode": "normal",
  "timestamp": 1756786886806,
  "cached": false,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "timestamp": "2025-09-02T12:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "cacheStatus": "MISS",
    "validationStatus": "PASSED"
  }
}
```

#### Response Headers

| Header | Description |
|--------|-------------|
| `X-Cache-Status` | `HIT` or `MISS` |
| `X-Request-ID` | Unique request identifier |
| `X-Response-Time` | Processing time in milliseconds |
| `X-Rate-Limit-Remaining` | Remaining requests in current window |
| `X-Rate-Limit-Reset` | Timestamp when limit resets |

### 2. Health Check
**Endpoint:** `GET /health`

Check the health status of the service.

#### Example Request

```bash
curl "https://your-worker.workers.dev/health"
```

#### Example Response

```json
{
  "status": "healthy",
  "timestamp": "2025-09-02T12:00:00.000Z",
  "version": "2.0.0",
  "uptime": 150
}
```

### 3. Web Interface
**Endpoint:** `GET /`

Serves the HTML interface for the search portal.

## Rate Limiting

- **IP-based:** 10 requests per minute
- **Endpoint-based:** 30 requests per minute
- **Global:** 100 requests per minute

Rate limit headers are included in all responses.

## Error Responses

### Validation Error (400)

```json
{
  "error": "Invalid input parameters",
  "details": ["Query cannot be empty after sanitization"],
  "status": 400,
  "timestamp": "2025-09-02T12:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Rate Limit Exceeded (429)

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 45,
  "resetTime": "2025-09-02T12:01:00.000Z",
  "status": 429
}
```

### Server Error (500)

```json
{
  "error": "Search failed",
  "message": "All search providers failed",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": 500
}
```

## Search Providers

### Google Custom Search
- **Engine:** Google Custom Search API
- **Features:** Comprehensive web results, thumbnails
- **Limitations:** 10 results max per request

### Brave Search
- **Engine:** Brave Search API
- **Features:** Privacy-focused, fast results
- **Limitations:** May have usage quotas

### Yandex Search
- **Engine:** Yandex Search API
- **Features:** Strong in Russian content, images
- **Limitations:** Regional focus

### AdultMedia Search
- **Engine:** Specialized adult content search
- **Features:** Niche content discovery
- **Limitations:** Requires specific API access

## Caching

- **TTL:** 30 minutes for search results
- **Strategy:** Query-based caching with provider isolation
- **Headers:** Cache status included in responses

## CORS Support

All endpoints support CORS for web browser access:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With`

## Monitoring

### Request Logging
All requests are logged with:
- Request ID
- IP address
- User agent
- Response time
- Status code
- Error details (if applicable)

### Metrics
- Request count per endpoint
- Response time distribution
- Error rates by provider
- Cache hit/miss ratios

## Deployment

### Environment Variables

```bash
# API Keys
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CSE_ID=your_google_cse_id
BRAVE_API_KEY=your_brave_api_key
YANDEX_API_KEY=your_yandex_api_key
ADULTMEDIA_API_KEY=your_adultmedia_api_key

# Configuration
LOG_LEVEL=INFO
MAX_LIMIT=20
MIN_LIMIT=3
DEFAULT_LIMIT=10
CACHE_TTL=3600
```

### Commands

```bash
# Development
npm run dev

# Build
wrangler build

# Deploy
wrangler deploy

# Health check
curl https://your-worker.workers.dev/health
```

## Troubleshooting

### Common Issues

1. **Rate Limited (429)**
   - Wait for the reset time shown in headers
   - Reduce request frequency
   - Check `X-Rate-Limit-Reset` header

2. **No Results**
   - Verify API keys are configured
   - Check query length (2-200 characters)
   - Try different search modes

3. **Slow Responses**
   - Results may be cached (check `X-Cache-Status`)
   - Some providers may be slower than others
   - Check `X-Response-Time` header

4. **CORS Errors**
   - Ensure proper headers are set
   - Check browser developer tools
   - Verify request origin

### Debug Headers

All responses include debug headers:
- `X-Request-ID`: Track requests across logs
- `X-Response-Time`: Measure performance
- `X-Cache-Status`: Cache hit/miss status
- `X-Rate-Limit-*`: Rate limiting information

## Support

For issues or questions:
1. Check the health endpoint: `GET /health`
2. Review response headers for debugging
3. Check Cloudflare Workers logs
4. Verify API key configuration

---

*API Version: 2.0.0 | Last Updated: September 2, 2025*</content>
<parameter name="filePath">c:\Users\tanne\ProjectFolder\Workspace\API_DOCUMENTATION.md
