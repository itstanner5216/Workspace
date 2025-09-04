import { SerpHouseProvider } from './src/lib/sources/serphouse.js';

// Mock environment with API keys
const mockEnv = {
  SERPHOUSE_KEY: 'SPDd5bq5r5VagaI7ktMSMTsi3ZGmdugm8luvKTenF9LEISbEkrwxFoJ04eUC'
};

// Mock ledger with all required methods
const mockLedger = {
  getProviderState: () => ({
    dailyUsed: 0,
    monthlyUsed: 0,
    requestsDailyUsed: 0,
    objectsDailyUsed: 0
  }),
  recordSuccess: () => {},
  incrementDailyUsed: () => {},
  incrementMonthlyUsed: () => {},
  incrementRequestsDailyUsed: () => {},
  incrementObjectsDailyUsed: () => {},
  recordError: () => {},
  markQuotaExceeded: () => {}
};

async function testSerpHouse() {
  try {
    const provider = new SerpHouseProvider();
    const options = {
      limit: 5,
      ledger: mockLedger
    };

    console.log('Testing SerpHouse with updated parameters...');
    const results = await provider.search('hello world', options, mockEnv);

    if (results && results.length > 0) {
      console.log(`✅ SerpHouse: ${results.length} results`);
      console.log('Sample result:', results[0]);
    } else {
      console.log('❌ SerpHouse: No results returned');
    }
  } catch (error) {
    console.log(`❌ SerpHouse: ${error.message}`);
  }
}

testSerpHouse();
