# Changelog

## [2.1.0] - 2025-09-02

### Added
- New provider system with Google, Brave, Yandex, and AdultMedia
- Provider targeting via `provider=` query parameter
- Multi-provider weighted search when no provider specified
- Environment variable configuration for all API keys
- Separate provider files in `src/lib/sources/`
- Deduplication by normalized URL
- Graceful error handling in providers (log warnings, return empty arrays)
- AbortSignal for request timeouts

### Changed
- Removed Bing provider completely
- Updated search orchestrator to support single/multi-provider modes
- Migrated to env-based configuration
- Improved caching and result filtering
- Updated Worker to use new fetch handler format

### Removed
- Bing-related code and configurations
- Hardcoded API keys in config
- DuckDuckGo provider

### Technical
- Provider interface: `async search(query, options, env)  [{ title, url, snippet, source, score?, extra? }]`
- Environment variables for all sensitive data
- ESLint globals updated for Worker and browser contexts
- Wrangler configuration with new bindings

## [2.0.0] - 2025-08-29

### Added
- Modular architecture with ES modules
- Multi-provider search aggregation
- Service worker for PWA functionality
- Responsive, accessible UI
- Caching layer for performance

### Changed
- Refactored from monolithic file to modular structure
- Separated client-side and server-side code
- Improved error handling and validation

### Removed
- Dead code and unused functions
- Inline HTML in JavaScript
- Hardcoded values (moved to config)

## [1.0.0] - Previous Version

- Initial monolithic implementation
- Basic search functionality
- Single file structure
