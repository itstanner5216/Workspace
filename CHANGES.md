# Jack Portal - Changelog

## [2.1.0] - 2025-09-02

### 🎯 Major Features

#### Weighted Result Allocation & Smart Fallbacks
- **New Search Modes**: `normal`, `deep_niche` with intelligent provider allocation
- **Weighted Distribution**:
  - Normal: Google 50% (Serper fallback), Brave 15% (Yandex fallback), RapidMedia 15%, Scrapers 10%, Adapters 10%
  - Deep Niche: RapidMedia 30%, Yandex 30%, Scrapers 20%, Adapters 20%
- **Rotating Fallbacks**: Priority-weighted round-robin prevents provider overload
- **Global Backfill**: Ensures result limits are met across all healthy providers

#### Provider Health & Circuit Breaker
- **KV-Backed Ledger**: Persistent provider state tracking across Worker instances
- **Quota Detection**: Automatic quota exceeded detection with configurable reset windows
- **Circuit Breaker**: Auto-disable failing providers with exponential backoff
- **Health Monitoring**: Real-time provider status with rolling statistics
- **Auto-Recovery**: Automatic re-enablement when reset times are reached

#### Enhanced Provider Support
- **New Providers**: Serper (Google alternative), RapidMedia, Scrapers, Adapters
- **Freshness Integration**: Native freshness support where available, client-side filtering as fallback
- **Quota-Aware Error Handling**: Specific error types for better fallback decisions
- **Provider Diagnostics**: Debug mode shows allocation, fallbacks, and health status

### 🔧 Technical Improvements

#### Search Orchestrator Refactor
- **Weighted Allocation Engine**: Floor-based quotas with remainder distribution by priority
- **Parallel Execution**: Concurrent provider queries with per-host concurrency limits
- **Deduplication**: Canonical URL deduplication with host+path normalization
- **Caching Strategy**: Merged result caching with comprehensive cache key variance

#### Diagnostics & Monitoring
- **Provider Breakdown**: Requested vs delivered counts per slice in debug mode
- **Fallback Tracking**: Which providers filled which slices and why
- **Ledger State**: Complete provider health status and statistics
- **Rotation Index**: Current fallback rotation state per provider

#### Code Quality
- **ESLint Hygiene**: Proper handling of unused parameters with `argsIgnorePattern`
- **Error Classification**: 4xx/5xx/timeout error categorization for circuit breaker
- **Structured Logging**: Enhanced logging with provider-specific context
- **Type Safety**: Improved parameter validation and error handling

### 📊 API Changes

#### New Parameters
- `mode`: `normal` (default), `deep_niche`
- `debug`: Enable diagnostic output (default: false)

#### Response Format
- `totalUnique`: Total unique results after deduplication
- `dedupedCount`: Number of duplicates removed
- `providerBreakdown`: Allocation and fallback details (debug mode)
- `ledgerState`: Provider health status (debug mode)

#### Backward Compatibility
- All existing API parameters and response fields maintained
- Default behavior unchanged (normal mode with existing defaults)
- Cache keys updated to include new parameters

### 🏗️ Infrastructure

#### New KV Namespaces
- `PROVIDER_LEDGER`: Persistent provider state and rotation tracking
- Configurable reset windows per provider type

#### Environment Variables
- `SERPER_API_KEY`: Serper API key
- `RAPIDMEDIA_API_KEY`: RapidMedia API key
- `SCRAPERS_API_KEY`: Scrapers API key
- `ADAPTERS_API_KEY`: Adapters API key

### 📈 Performance

#### Optimizations
- **Smart Caching**: Result-level caching reduces redundant provider calls
- **Parallel Execution**: Concurrent provider queries improve response times
- **Health-Aware Routing**: Skip unhealthy providers to reduce timeouts
- **Efficient Deduplication**: Canonical URL comparison with tracking parameter stripping

#### Metrics
- Provider success/failure rates
- Fallback usage statistics
- Cache hit rates by mode
- Response time improvements with healthy provider routing

### 🐛 Bug Fixes

#### Critical Fixes
- **Cache Key Stability**: Removed timestamp-based variance causing cache misses
- **Error Propagation**: Proper error handling prevents silent failures
- **Quota Detection**: Accurate quota exceeded detection across all providers
- **Fallback Loops**: Prevention of infinite fallback cycles

### 📚 Documentation

#### Updated Files
- `README.md`: Weight matrix, fallback ladder, and provider information
- `API_DOCUMENTATION.md`: New parameters and response fields
- `DEPLOYMENT_GUIDE.md`: Provider setup and configuration
- New diagnostic examples and troubleshooting guides

### 🔒 Security

#### Enhancements
- **Provider Isolation**: Independent error handling per provider
- **Quota Protection**: Circuit breaker prevents quota exhaustion
- **Input Validation**: Enhanced validation for new parameters
- **Secret Management**: Secure API key handling across all providers

### 🧪 Testing

#### Validation Commands
```bash
node --check src/lib/search-service.js
node --check src/lib/provider-ledger.js
eslint . --ext .js --max-warnings=0
wrangler build
wrangler dev --local --var-file=.dev.vars
```

#### Test Scenarios
- Normal mode allocation with healthy providers
- Fallback activation on quota exceeded
- Deep niche mode with limited Google usage
- Circuit breaker auto-recovery
- Global backfill functionality

---

## [2.0.0] - 2025-08-15

### Initial Production Release
- Multi-provider search (Google, Brave, Yandex, QualityPorn)
- KV-based caching with 30-minute TTL
- Rate limiting and input validation
- CORS support and response compression
- Structured logging and health monitoring
- Cloudflare Worker deployment ready

---

**Legend:**
- 🎯 Major Features
- 🔧 Technical Improvements
- 📊 API Changes
- 🏗️ Infrastructure
- 📈 Performance
- 🐛 Bug Fixes
- 📚 Documentation
- 🔒 Security
- 🧪 Testing</content>
<parameter name="filePath">c:\Users\tanne\ProjectFolder\Workspace\CHANGES.md
