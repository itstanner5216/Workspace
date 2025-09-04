import { SerpHouseProvider } from './src/lib/sources/serphouse.js';
import { QualityPornProvider } from './src/lib/sources/qualityporn.js';
import { AdultMediaProvider } from './src/lib/sources/adultmedia.js';
import { SeznamProvider } from './src/lib/sources/seznam.js';
import { ApifyProvider } from './src/lib/sources/apify.js';

// Load environment variables
import { readFileSync } from 'fs';
const envContent = readFileSync('.dev.vars', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) {
      env[key.trim()] = value;
    }
  }
});

// Mock ledger
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

async function testProvider(provider, query, primaryMethod, fallbackMethod = null) {
  const options = { limit: 5, ledger: mockLedger };

  try {
    // Try primary method
    let results;
    if (primaryMethod) {
      results = await primaryMethod(provider, query, options, env);
    } else {
      results = await provider.search(query, options, env);
    }

    if (results && results.length > 0) {
      const first = results[0];
      if (provider.name === 'AdultMedia') {
        return `✅ Media URL ${first.url || first.thumbnail || 'N/A'}`;
      } else {
        return `✅ Title "${first.title || 'No title'}" (URL ${first.url || '#'})`;
      }
    } else {
      return '❌ No results returned';
    }
  } catch (error) {
    // Try fallback if available
    if (fallbackMethod) {
      try {
        const results = await fallbackMethod(provider, query, options, env);
        if (results && results.length > 0) {
          const first = results[0];
          if (provider.name === 'AdultMedia') {
            return `✅ Media URL ${first.url || first.thumbnail || 'N/A'}`;
          } else {
            return `✅ Title "${first.title || 'No title'}" (URL ${first.url || '#'})`;
          }
        } else {
          return '❌ No results returned';
        }
      } catch (fallbackError) {
        return `❌ Error ${fallbackError.message}`;
      }
    }
    return `❌ Error ${error.message}`;
  }
}

async function serpHousePrimary(provider, query, options, env) {
  const apiKey = env.SERPHOUSE_KEY;
  const response = await fetch('https://api.serphouse.com/serp/live', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ "q": query, "responseType": "json" }),
    cf: { timeout: 15000 }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return provider.normalizeResults(data.results || data || [], options);
}

async function serpHouseFallback(provider, query, options, env) {
  const apiKey = env.SERPHOUSE_KEY;
  const response = await fetch(`https://api.serphouse.com/serp/live?q=${encodeURIComponent(query)}&responseType=json&api_token=${apiKey}`, {
    method: 'GET',
    headers: {
      'User-Agent': 'Jack-Portal/2.0.0'
    },
    cf: { timeout: 15000 }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return provider.normalizeResults(data.results || data || [], options);
}

async function qualityPornPrimary(provider, query, options, env) {
  const apiKey = env.RAPIDAPI_KEY;
  const response = await fetch(`https://quality-porn.p.rapidapi.com/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'quality-porn.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    },
    cf: { timeout: 10000 }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return provider.normalizeResults(data.results || [], options);
}

async function adultMediaPrimary(provider, query, options, env) {
  const apiKey = env.RAPIDAPI_KEY;
  const response = await fetch(`https://porn-api-adultdatalink.p.rapidapi.com/pornpics/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'porn-api-adultdatalink.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    },
    cf: { timeout: 15000 }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map(item => ({
    title: item.title || 'No title',
    url: item.url || '#',
    snippet: item.description || '',
    score: item.score || 0,
    thumbnail: item.thumbnail || null,
    published_at: item.published_at || null,
    author: item.author || null,
    extra: {
      provider: 'adultmedia',
      category: item.category,
      tags: item.tags
    }
  }));
}

async function seznamPrimary(provider, query, options, env) {
  const apiKey = env.RAPIDAPI_KEY;
  const response = await fetch(`https://search-seznam.p.rapidapi.com/?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'search-seznam.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    },
    cf: { timeout: 10000 }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return provider.normalizeResults(data.results || [], options);
}

async function apifyPrimary(provider, query, options, env) {
  const apiKey = env.APIFY_TOKEN;
  const response = await fetch('https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ "queries": [query], "maxPagesPerQuery": 1 }),
    cf: { timeout: 30000 }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const results = await response.json();
  return provider.normalizeResults(results, options);
}

async function runHealthCheck() {
  const query = 'hello world';

  console.log('Running health check with query: "hello world"\n');

  // SerpHouse
  const serpHouse = new SerpHouseProvider();
  console.log(`SerpHouse: ${await testProvider(serpHouse, query, serpHousePrimary, serpHouseFallback)}`);

  // QualityPorn
  const qualityPorn = new QualityPornProvider();
  console.log(`QualityPorn: ${await testProvider(qualityPorn, query, qualityPornPrimary)}`);

  // AdultMedia
  const adultMedia = new AdultMediaProvider();
  console.log(`AdultMedia: ${await testProvider(adultMedia, query, adultMediaPrimary)}`);

  // Seznam
  const seznam = new SeznamProvider();
  console.log(`Seznam: ${await testProvider(seznam, query, seznamPrimary)}`);

  // Apify
  const apify = new ApifyProvider();
  console.log(`Apify: ${await testProvider(apify, query, apifyPrimary)}`);
}

runHealthCheck().catch(console.error);
