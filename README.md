# Jack Portal

A modular, production-ready Cloudflare Worker for advanced content search across multiple providers.

## Features

- **Modular Architecture**: Clean separation of concerns with ES modules
- **Multi-Provider Search**: Aggregates results from Google, Brave, Yandex, and AdultMedia
- **Provider Targeting**: Use `provider=` param to target specific search engines
- **Caching**: Built-in caching for improved performance
- **PWA Support**: Service worker for offline functionality
- **Responsive UI**: Modern, accessible web interface
- **Cloudflare Worker**: Serverless deployment with global CDN

## Project Structure

```
/public
  /index.html          # Main HTML page
  /app.js              # Client-side JavaScript
  /sw.js               # Service worker
/src
  /config
    /index.js         # Configuration constants
  /handlers
    /aggregate.js     # Main search handler
  /lib
    /search-service.js # Core search service
    /sources
      /google.js      # Google provider
      /brave.js       # Brave provider
      /yandex.js      # Yandex provider
      /adultmedia.js  # AdultMedia provider
      /index.js       # Provider exports
  /utils
    /index.js         # Utility functions
  /html.js            # HTML template
  /worker.js          # Cloudflare Worker entry point
```

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure API keys in `wrangler.toml` or `.dev.vars`
4. Run locally: `npm run dev`
5. Deploy: `npm run deploy`

## Environment Variables

Required environment variables:

- `GOOGLE_API_KEY`: Your Google Custom Search API key
- `GOOGLE_CSE_ID`: Your Google Custom Search Engine ID
- `BRAVE_API_KEY`: Your Brave Search API key
- `YANDEX_API_KEY`: Your Yandex Search API key
- `ADULTMEDIA_API_KEY`: Your AdultMedia API key
- `USER_AGENT`: Custom user agent string
- `TIMEOUT`: Request timeout in ms (default: 10000)
- `DEFAULT_LIMIT`: Default results per search (default: 10)
- `MAX_LIMIT`: Maximum results per search (default: 20)
- `MIN_LIMIT`: Minimum results per search (default: 3)
- `CACHE_TTL`: Cache TTL in seconds (default: 3600)

## API

### Search Endpoint

`GET /api/search?q=<query>&provider=<provider>&limit=<limit>&fresh=<fresh>`

Parameters:
- `q`: Search query (required)
- `provider`: Target provider (google, brave, yandex, adultmedia) - optional, defaults to multi-provider
- `limit`: Number of results (3-20)
- `fresh`: Freshness (d7, m1, m3, y1, all)
- `duration`: Content duration filter
- `site`: Site restriction
- `hostMode`: Host filtering mode
- `durationMode`: Duration filtering mode
- `showThumbs`: Include thumbnails (true/false)

### Example Calls

```bash
# Multi-provider search
GET /api/search?q=example

# Single provider
GET /api/search?q=example&provider=google

# With limits
GET /api/search?q=example&limit=5&fresh=d7
```

## Development

- **Local Dev**: `wrangler dev --local`
- **Lint**: `npx eslint . --ext .js`
- **Build**: `wrangler build`
- **Deploy**: `wrangler deploy`

## Providers

- **Google**: Uses Custom Search API
- **Brave**: Uses Brave Search API
- **Yandex**: Uses Yandex Search API
- **AdultMedia**: Placeholder for adult content search

## Contributing

1. Follow ES module standards
2. Add explicit exports/imports
3. Maintain no circular dependencies
4. Update tests and documentation

## License

MIT License
