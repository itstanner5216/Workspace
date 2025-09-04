import { readFileSync } from 'fs';

// Load environment variables
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

async function testSerpHouse() {
  console.log('Testing SerpHouse...');
  try {
    // Try POST first
    const apiKey = env.SERPHOUSE_KEY;
    const response = await fetch('https://api.serphouse.com/serp/live', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "q": "hello world", "responseType": "json" })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const first = data.results[0];
        return `✅ Title "${first.title || 'No title'}" (URL ${first.url || '#'})`;
      } else {
        // Try GET fallback
        const fallbackResponse = await fetch(`https://api.serphouse.com/serp/live?q=hello%20world&responseType=json&api_token=${apiKey}`, {
          method: 'GET'
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.results && fallbackData.results.length > 0) {
            const first = fallbackData.results[0];
            return `✅ Title "${first.title || 'No title'}" (URL ${first.url || '#'})`;
          }
        }
        return '❌ No results returned';
      }
    } else {
      // Try GET fallback
      const fallbackResponse = await fetch(`https://api.serphouse.com/serp/live?q=hello%20world&responseType=json&api_token=${apiKey}`, {
        method: 'GET'
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.results && fallbackData.results.length > 0) {
          const first = fallbackData.results[0];
          return `✅ Title "${first.title || 'No title'}" (URL ${first.url || '#'})`;
        }
        return '❌ No results returned';
      }
      return `❌ Error HTTP ${response.status} / Fallback HTTP ${fallbackResponse.status}`;
    }
  } catch (error) {
    return `❌ Error ${error.message}`;
  }
}

async function testQualityPorn() {
  console.log('Testing QualityPorn...');
  try {
    const apiKey = env.RAPIDAPI_KEY;

    // Try the user's requested endpoint first
    let response = await fetch(`https://quality-porn.p.rapidapi.com/search?q=hello%20world`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'quality-porn.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    });

    if (!response.ok) {
      // Try the current provider endpoint
      response = await fetch(`https://quality-porn.p.rapidapi.com/search/videos?q=hello%20world`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'quality-porn.p.rapidapi.com',
          'x-rapidapi-key': apiKey
        }
      });
    }

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const first = data.results[0];
        return `✅ Title "${first.title || 'No title'}" (URL ${first.url || '#'})`;
      }
      return '❌ No results returned';
    } else {
      const errorText = await response.text();
      return `❌ Error HTTP ${response.status}: ${errorText}`;
    }
  } catch (error) {
    return `❌ Error ${error.message}`;
  }
}

async function testAdultMedia() {
  console.log('Testing AdultMedia...');
  try {
    const apiKey = env.RAPIDAPI_KEY;

    // Try the user's requested endpoint first
    let response = await fetch(`https://porn-api-adultdatalink.p.rapidapi.com/pornpics/search?q=hello%20world`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'porn-api-adultdatalink.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    });

    if (!response.ok) {
      // Try the current provider endpoint
      response = await fetch(`https://porn-api-adultdatalink.p.rapidapi.com/pornpics/search?q=hello%20world&limit=10`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'porn-api-adultdatalink.p.rapidapi.com',
          'x-rapidapi-key': apiKey
        }
      });
    }

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const first = data.results[0];
        return `✅ Media URL ${first.url || first.thumbnail || 'N/A'}`;
      }
      return '❌ No results returned';
    } else {
      const errorText = await response.text();
      return `❌ Error HTTP ${response.status}: ${errorText}`;
    }
  } catch (error) {
    return `❌ Error ${error.message}`;
  }
}

async function testSeznam() {
  console.log('Testing Seznam...');
  try {
    const apiKey = env.RAPIDAPI_KEY;

    // Try the user's requested endpoint first
    let response = await fetch(`https://search-seznam.p.rapidapi.com/?q=hello%20world`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'search-seznam.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    });

    if (!response.ok) {
      // Try alternative endpoints
      const alternatives = [
        `https://search-seznam.p.rapidapi.com/search?q=hello%20world`,
        `https://search-seznam.p.rapidapi.com/web?q=hello%20world`
      ];

      for (const altUrl of alternatives) {
        response = await fetch(altUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'search-seznam.p.rapidapi.com',
            'x-rapidapi-key': apiKey
          }
        });
        if (response.ok) break;
      }
    }

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const first = data.results[0];
        return `✅ Title "${first.title || 'No title'}" (URL ${first.url || '#'})`;
      }
      return '❌ No results returned';
    } else {
      const errorText = await response.text();
      return `❌ Error HTTP ${response.status}: ${errorText}`;
    }
  } catch (error) {
    return `❌ Error ${error.message}`;
  }
}

async function testApify() {
  console.log('Testing Apify...');
  try {
    const apiKey = env.APIFY_TOKEN;

    // Try the user's requested sync endpoint first
    let response = await fetch('https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "queries": ["hello world"], "maxPagesPerQuery": 1 })
    });

    if (!response.ok) {
      // Try the standard run endpoint
      const runResponse = await fetch('https://api.apify.com/v2/acts/apify~google-search-scraper/runs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "queries": ["hello world"], "maxPagesPerQuery": 1 })
      });

      if (runResponse.ok) {
        const runData = await runResponse.json();
        // Wait a bit then try to get results
        await new Promise(resolve => setTimeout(resolve, 5000));

        const datasetResponse = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/runs/${runData.data.id}/dataset/items`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (datasetResponse.ok) {
          response = datasetResponse;
        }
      }
    }

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        const first = results[0];
        return `✅ Title "${first.title || 'No title'}" (URL ${first.url || '#'})`;
      }
      return '❌ No results returned';
    } else {
      const errorText = await response.text();
      return `❌ Error HTTP ${response.status}: ${errorText}`;
    }
  } catch (error) {
    return `❌ Error ${error.message}`;
  }
}

async function runHealthCheck() {
  console.log('Running health check with query: "hello world"\n');

  const serpHouseResult = await testSerpHouse();
  console.log(`SerpHouse: ${serpHouseResult}`);

  const qualityPornResult = await testQualityPorn();
  console.log(`QualityPorn: ${qualityPornResult}`);

  const adultMediaResult = await testAdultMedia();
  console.log(`AdultMedia: ${adultMediaResult}`);

  const seznamResult = await testSeznam();
  console.log(`Seznam: ${seznamResult}`);

  const apifyResult = await testApify();
  console.log(`Apify: ${apifyResult}`);
}

runHealthCheck().catch(console.error);
