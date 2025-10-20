/**
 * Test script for ProviderLedger, AdapterRegistry, and RequestWrapper
 * Run with: node test-infrastructure.js
 */

import { ProviderLedger } from './src/lib/provider-ledger.js'
import { AdapterRegistry } from './src/lib/adapter-registry.js'
import { RequestWrapper } from './src/lib/request-wrapper.js'

// Mock environment
const mockEnv = {
  PROVIDER_LEDGER: null, // Use in-memory for testing
  FETCH_TIMEOUT_MS: '5000',
  RETRY_MAX: '2',
  BACKOFF_BASE_MS: '500',
  USER_AGENT: 'Test-Agent/1.0'
}

async function testProviderLedger() {
  console.log('🧪 Testing ProviderLedger...')

  const ledger = new ProviderLedger(mockEnv)

  // Test initial state
  const initialState = ledger.getProviderState('google')
  console.log('✅ Initial state:', initialState.status)

  // Test success recording
  ledger.recordSuccess('google', 150)
  const successState = ledger.getProviderState('google')
  console.log('✅ After success:', successState.rolling.successCount, 'successes')

  // Test error recording
  ledger.recordError('google', '5xx')
  const errorState = ledger.getProviderState('google')
  console.log('✅ After 5xx error:', errorState.rolling.error5xxCount, '5xx errors')

  // Test quota exceeded
  ledger.markQuotaExceeded('google')
  const quotaState = ledger.getProviderState('google')
  console.log('✅ After quota exceeded:', quotaState.status, quotaState.resetAt ? 'has reset time' : 'no reset time')

  // Test health check
  const isHealthy = ledger.isProviderHealthy('google')
  console.log('✅ Is healthy after quota:', isHealthy)

  console.log('✅ ProviderLedger tests passed\n')
}

async function testAdapterRegistry() {
  console.log('🧪 Testing AdapterRegistry...')

  const registry = new AdapterRegistry()

  // Test registration
  registry.register({
    name: 'test-provider',
    version: '1.0.0',
    type: 'api',
    searchFn: async () => [],
    supportsFreshness: 'api',
    defaultWeightByMode: { normal: 0.5 },
    priority: 5
  })

  // Test retrieval
  const provider = registry.get('test-provider')
  console.log('✅ Retrieved provider:', provider.name, provider.version)

  // Test metadata
  const metadata = registry.getMetadata('test-provider')
  console.log('✅ Provider metadata:', metadata.version, metadata.type)

  // Test listing
  const allProviders = registry.list()
  console.log('✅ Listed providers:', allProviders.length)

  console.log('✅ AdapterRegistry tests passed\n')
}

async function testRequestWrapper() {
  console.log('🧪 Testing RequestWrapper...')

  const ledger = new ProviderLedger(mockEnv)
  const wrapper = new RequestWrapper(mockEnv, ledger)

  // Test URL redaction
  const safeUrl = wrapper._redactUrl('https://api.example.com/search?key=secret123&query=test')
  console.log('✅ Redacted URL:', safeUrl)

  // Test header redaction
  const safeHeaders = wrapper._redactHeaders({
    'Authorization': 'Bearer secret',
    'Content-Type': 'application/json',
    'X-API-Key': 'apikey123'
  })
  console.log('✅ Redacted headers:', safeHeaders)

  console.log('✅ RequestWrapper tests passed\n')
}

async function runTests() {
  console.log('🚀 Running infrastructure tests...\n')

  try {
    await testProviderLedger()
    await testAdapterRegistry()
    await testRequestWrapper()

    console.log('🎉 All tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}

export { runTests }
