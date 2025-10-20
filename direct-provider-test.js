// Direct provider test
import { XnxxProvider } from './src/lib/sources/xnxx.js'

const mockEnv = {
  XNXX_API_KEY: 'test_key'
}

const mockOptions = {
  ledger: null,
  limit: 5
}

async function testProvider() {
  const provider = new XnxxProvider()
  console.log('Testing XNXX provider...')

  try {
    const results = await provider.search('test query', mockOptions, mockEnv)
    console.log('Results:', results)
  } catch (error) {
    console.log('Error:', error.message)
  }
}

testProvider()
