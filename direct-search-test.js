// Direct search service test
import { SearchService } from './src/lib/search-service.js'

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

async function testSearchService() {
  console.log('Testing Search Service...')

  try {
    const searchService = new SearchService(mockEnv)
    console.log('Search service initialized successfully')

    // Test basic search
    const results = await searchService.search({
      query: 'test',
      limit: 5,
      mode: 'normal',
      debug: true
    })

    console.log('Search completed successfully')
    console.log('Results count:', results.results?.length || 0)
    console.log('Mode:', results.mode)
    console.log('Total unique:', results.totalUnique)

    if (results.sliceBreakdown) {
      console.log('Slice breakdown:', results.sliceBreakdown)
    }

  } catch (error) {
    console.log('Error:', error.message)
  }
}

testSearchService()
