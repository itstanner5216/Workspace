/**
 * Test script to verify adapter/scraper error fixes
 */

import { AdaptersProvider } from './src/lib/sources/adapters.js'
import { ScrapersProvider } from './src/lib/sources/scrapers.js'

// Mock environment with placeholder API keys
const mockEnv = {
  ADAPTERS_API_KEY: 'your_adapters_api_key_here',
  SCRAPERS_API_KEY: 'your_scrapers_api_key_here'
}

async function testAdapters() {
  console.log('🧪 Testing Adapters Provider...')

  const adapters = new AdaptersProvider()
  const options = { limit: 5, safeMode: true }

  try {
    const results = await adapters.search('test query', options, mockEnv)
    console.log('✅ Adapters: No errors, returned:', results.length, 'results')
    console.log('   Results:', results)
  } catch (error) {
    console.log('❌ Adapters: Error occurred:', error.message)
  }
}

async function testScrapers() {
  console.log('🧪 Testing Scrapers Provider...')

  const scrapers = new ScrapersProvider()
  const options = { limit: 5, safeMode: true }

  try {
    const results = await scrapers.search('test query', options, mockEnv)
    console.log('✅ Scrapers: No errors, returned:', results.length, 'results')
    console.log('   Results:', results)
  } catch (error) {
    console.log('❌ Scrapers: Error occurred:', error.message)
  }
}

async function runTests() {
  console.log('🚀 Testing Adapter/Scraper Error Fixes\n')

  await testAdapters()
  console.log()
  await testScrapers()

  console.log('\n🎉 Tests completed!')
}

runTests().catch(console.error)
