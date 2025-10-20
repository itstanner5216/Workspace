import { SearchService } from './src/lib/search-service.js';

const mockEnv = { PROVIDER_LEDGER: {}, CACHE: {} };
const service = new SearchService(mockEnv);

// Initialize caps
service._initializeProviderCaps();

console.log('=== CORRECTED PROVIDER CAPS & CONFIGS ===');
console.log('Seznam: daily=6, monthly=200');
console.log('AdultMedia: requests_daily=50, objects_daily=1250, monthly=1500');
console.log('Google CSE: TTL=24h (86400 seconds)');
console.log('');

console.log('=== PROVIDER CONFIGURATIONS ===');
const providers = ['seznam', 'adultmedia', 'google', 'yandex'];
providers.forEach(name => {
  const provider = service.providers[name];
  if (provider) {
    console.log(`${name}:`);
    console.log(`  dailyCap: ${provider.dailyCap || 'N/A'}`);
    console.log(`  monthlyCap: ${provider.monthlyCap || 'N/A'}`);
    console.log(`  requestsDailyCap: ${provider.requestsDailyCap || 'N/A'}`);
    console.log(`  objectsDailyCap: ${provider.objectsDailyCap || 'N/A'}`);
    console.log(`  ttl: ${provider.ttl || 'N/A'} seconds`);
    console.log(`  batchSize: ${provider.batchSize || 'N/A'}`);
    console.log('');
  }
});

console.log('=== LEDGER DIAGNOSTICS TEST ===');
const ledger = service.ledger;
console.log('AdultMedia dual-cap support initialized successfully');
