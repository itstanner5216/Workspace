import { GoogleProvider } from './src/lib/sources/google.js';
import { SerpApiProvider } from './src/lib/sources/serpapi.js';
import { SerperProvider } from './src/lib/sources/serper.js';
import { YandexProvider } from './src/lib/sources/yandex.js';
import { BraveProvider } from './src/lib/sources/brave.js';
import { SerpHouseProvider } from './src/lib/sources/serphouse.js';
import { AdultMediaProvider } from './src/lib/sources/adultmedia.js';
import { QualityPornProvider } from './src/lib/sources/qualityporn.js';
import { ApifyProvider } from './src/lib/sources/apify.js';
import { SeznamProvider } from './src/lib/sources/seznam.js';

// Mock environment with API keys
const mockEnv = {
  GOOGLE_API_KEY: 'your_google_api_key_here',
  GOOGLE_CSE_ID: '73e4998767b3c4800',
  SERPAPI_KEY: 'your_serpapi_key_here',
  SERPER_KEY: 'your_serper_key_here',
  SERPWOW_API_KEY: 'your_serpwow_api_key_here',
  BRAVE_API_KEY: 'your_brave_api_key_here',
  SERPHOUSE_KEY: 'your_serphouse_key_here',
  RAPIDAPI_KEY: 'your_rapidapi_key_here',
  APIFY_TOKEN: 'your_apify_api_token_here'
};

// Mock ledger
const mockLedger = {
  getProviderState: () => ({ dailyUsed: 0, monthlyUsed: 0, requestsDailyUsed: 0, objectsDailyUsed: 0 }),
  recordSuccess: () => {},
  incrementDailyUsed: () => {},
  incrementMonthlyUsed: () => {},
  incrementRequestsDailyUsed: () => {},
  incrementObjectsDailyUsed: () => {},
  recordError: () => {},
  markQuotaExceeded: () => {}
};

const providers = [
  { name: 'Google', instance: new GoogleProvider() },
  { name: 'SerpApi', instance: new SerpApiProvider() },
  { name: 'Serper', instance: new SerperProvider() },
  { name: 'Yandex/SERPWOW', instance: new YandexProvider() },
  { name: 'Brave', instance: new BraveProvider() },
  { name: 'SerpHouse', instance: new SerpHouseProvider() },
  { name: 'AdultMedia', instance: new AdultMediaProvider() },
  { name: 'QualityPorn', instance: new QualityPornProvider() },
  { name: 'Apify', instance: new ApifyProvider() },
  { name: 'Seznam', instance: new SeznamProvider() }
];

async function testProvider(provider) {
  try {
    const options = {
      limit: 5,
      ledger: mockLedger
    };

    const results = await provider.instance.search('hello world', options, mockEnv);

    if (results && results.length > 0) {
      return `✅ ${provider.name}: ${results.length} results`;
    } else {
      return `❌ ${provider.name}: No results returned`;
    }
  } catch (error) {
    return `❌ ${provider.name}: ${error.message}`;
  }
}

async function runHealthCheck() {
  console.log('🔍 Running health check for all providers with query: "hello world"\n');

  for (const provider of providers) {
    const result = await testProvider(provider);
    console.log(result);
    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🏁 Health check complete');
}

runHealthCheck().catch(console.error);
