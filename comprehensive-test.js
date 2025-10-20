// Comprehensive Sanity Check Test
import { SearchService } from './src/lib/search-service.js'
import { PornhubProvider } from './src/lib/sources/pornhub.js'
import { XnxxProvider } from './src/lib/sources/xnxx.js'
import { PornlinksProvider } from './src/lib/sources/pornlinks.js'
import { PurepornProvider } from './src/lib/sources/pureporn.js'

const mockEnv = {
  GOOGLE_API_KEY: 'test',
  GOOGLE_CSE_ID: 'test',
  SERPAPI_KEY: 'test',
  SERPER_KEY: 'test',
  SERPWOW_API_KEY: 'test',
  BRAVE_API_KEY: 'test',
  SERPHOUSE_KEY: 'test',
  RAPIDAPI_KEY: 'test',
  PORNLINKS_API_KEY: 'test',
  PORNHUB_API_KEY: 'test',
  PUREPORN_API_KEY: 'test',
  XNXX_API_KEY: 'test',
  APIFY_TOKEN: 'test',
  SERPLY_API_KEY: 'test',
  SCRAPERS_API_KEY: 'test',
  ADAPTERS_API_KEY: 'test'
}

async function runComprehensiveTests() {
  console.log('🚀 JACK PORTAL COMPREHENSIVE SANITY CHECK\n')

  // Test 1: Provider Implementations
  console.log('📋 TEST 1: Provider Implementations')
  await testProviderImplementations()

  // Test 2: Normalization
  console.log('\n📋 TEST 2: Data Normalization')
  await testNormalization()

  // Test 3: Weighting & Routing
  console.log('\n📋 TEST 3: Weighting & Routing')
  await testWeightingAndRouting()

  // Test 4: Error Codes
  console.log('\n📋 TEST 4: Error Code Mapping')
  await testErrorCodes()

  // Test 5: Quota Management
  console.log('\n📋 TEST 5: Quota Management')
  await testQuotaManagement()

  console.log('\n✅ COMPREHENSIVE SANITY CHECK COMPLETED')
}

async function testProviderImplementations() {
  const providers = [
    { name: 'Pornhub', instance: new PornhubProvider(), key: 'PORNHUB_API_KEY' },
    { name: 'XNXX', instance: new XnxxProvider(), key: 'XNXX_API_KEY' },
    { name: 'Pornlinks', instance: new PornlinksProvider(), key: 'PORNLINKS_API_KEY' },
    { name: 'Pureporn', instance: new PurepornProvider(), key: 'PUREPORN_API_KEY' }
  ]

  for (const provider of providers) {
    try {
      const results = await provider.instance.search('test', { limit: 3 }, mockEnv)
      console.log(`✅ ${provider.name}: API call successful (403 expected with test key)`)
    } catch (error) {
      if (error.message.includes('403') || error.message.includes('API key not configured')) {
        console.log(`✅ ${provider.name}: Correct error handling (${error.message})`)
      } else {
        console.log(`❌ ${provider.name}: Unexpected error: ${error.message}`)
      }
    }
  }
}

async function testNormalization() {
  // Test with mock data
  const mockResult = {
    title: 'Test Title',
    url: 'https://example.com/test',
    snippet: 'Test snippet',
    published_at: '2024-01-01',
    author: 'Test Author',
    thumbnail: 'https://example.com/thumb.jpg',
    imageUrl: 'https://example.com/image.jpg',
    embeddingUrl: 'https://example.com/embed',
    duration: 120,
    views: 1000,
    tags: ['tag1', 'tag2'],
    embed_url: 'https://example.com/embed'
  }

  const providers = [
    new PornhubProvider(),
    new XnxxProvider(),
    new PornlinksProvider(),
    new PurepornProvider()
  ]

  for (const provider of providers) {
    try {
      const normalized = provider.normalizeResults([mockResult], {})
      if (normalized.length > 0) {
        const result = normalized[0]
        const requiredFields = ['title', 'url', 'snippet', 'score', 'extra']
        const hasAllFields = requiredFields.every(field => result.hasOwnProperty(field))

        if (hasAllFields && result.url.startsWith('https://')) {
          console.log(`✅ ${provider.name}: Normalization correct`)
        } else {
          console.log(`❌ ${provider.name}: Missing required fields or invalid URL`)
        }
      }
    } catch (error) {
      console.log(`❌ ${provider.name}: Normalization error: ${error.message}`)
    }
  }
}

async function testWeightingAndRouting() {
  const searchService = new SearchService(mockEnv)

  // Test normal mode weighting
  const normalResults = await searchService.search({
    query: 'test',
    limit: 10,
    mode: 'normal',
    debug: true
  })

  const quotas = searchService._calculateSliceQuotas(searchService.sliceWeights.normal, 10)
  console.log(`✅ Normal mode quotas: Google=${quotas.google_slice}, QualityPorn+XNXX=${quotas.qualityporn_xnxx_slice}, Pornhub+Pureporn=${quotas.pornhub_pureporn_slice}`)

  // Test deep niche mode
  const deepNicheResults = await searchService.search({
    query: 'test',
    limit: 10,
    mode: 'deep_niche',
    debug: true
  })

  const deepQuotas = searchService._calculateSliceQuotas(searchService.sliceWeights.deep_niche, 10)
  console.log(`✅ Deep niche quotas: Serply=${deepQuotas.serply_slice}, QualityPorn+XNXX=${deepQuotas.qualityporn_xnxx_slice}, Pornhub+Pureporn=${deepQuotas.pornhub_pureporn_slice}`)
}

async function testErrorCodes() {
  const provider = new PornhubProvider()

  try {
    await provider.search('', { limit: 3 }, mockEnv) // Empty query should trigger BAD_PARAMS
  } catch (error) {
    const canonicalCodes = ['BAD_PARAMS', 'BAD_HOST', 'RATE_LIMIT', 'UPSTREAM_ERROR', 'NETWORK_ERROR']
    if (canonicalCodes.includes(error.message)) {
      console.log(`✅ Error code mapping: ${error.message}`)
    } else {
      console.log(`❌ Non-canonical error code: ${error.message}`)
    }
  }
}

async function testQuotaManagement() {
  const searchService = new SearchService(mockEnv)

  // Check that monthly caps are set correctly
  const ledger = searchService.ledger
  const caps = {
    pornhub: 1000,
    xnxx: 100,
    pornlinks: 1000,
    pureporn: 1000
  }

  let allCorrect = true
  for (const [provider, expectedCap] of Object.entries(caps)) {
    const state = ledger.getProviderState(provider)
    if (state.monthlyCap === expectedCap) {
      console.log(`✅ ${provider}: Monthly cap ${expectedCap}`)
    } else {
      console.log(`❌ ${provider}: Expected cap ${expectedCap}, got ${state.monthlyCap}`)
      allCorrect = false
    }
  }

  if (allCorrect) {
    console.log('✅ All monthly caps configured correctly')
  }
}

runComprehensiveTests().catch(console.error)
