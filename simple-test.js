/**
 * Simple Runtime Test Script using built-in fetch
 */

const BASE_URL = 'http://127.0.0.1:8787';

async function makeRequest(endpoint, description) {
  console.log(`\n🔍 ${description}`);
  console.log(`URL: ${endpoint}`);

  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (data.providerBreakdown) {
      console.log('\n📊 Provider Breakdown:');
      Object.entries(data.providerBreakdown).forEach(([provider, stats]) => {
        console.log(`  ${provider}: requested=${stats.requested}, delivered=${stats.delivered}, fallbacks=${stats.fallbacks.length}`);
      });
    }

    if (data.ledgerState) {
      console.log('\n📊 Ledger State:');
      Object.entries(data.ledgerState).forEach(([provider, state]) => {
        console.log(`  ${provider}: status=${state.status}, successRate=${state.successRate}, timeoutRate=${state.timeoutRate}`);
      });
    }

    console.log(`Total Results: ${data.results?.length || 0}`);
    console.log(`Total Unique: ${data.totalUnique || 0}`);
    console.log(`Deduped Count: ${data.dedupedCount || 0}`);

    return data;
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Runtime Tests for Provider Ledger & Fallback Logic');

  // Wait for server
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 1: Normal mode
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 1: Normal Mode');
  console.log('='.repeat(60));
  await makeRequest(`${BASE_URL}/api/search?q=test&mode=normal&limit=20&fresh=d7&debug=true`, 'Normal mode search');

  // Test 2: Deep niche mode
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 2: Deep Niche Mode');
  console.log('='.repeat(60));
  await makeRequest(`${BASE_URL}/api/search?q=test&mode=deep_niche&limit=20&fresh=m1&debug=true`, 'Deep niche mode search');

  // Test 3: Diagnostics
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 3: Diagnostics');
  console.log('='.repeat(60));
  await makeRequest(`${BASE_URL}/api/diagnostics?debug=true`, 'Full diagnostics');

  console.log('\n🎉 Tests completed!');
}

// For manual testing of quota/temp-fail scenarios, we would need to:
// 1. Make requests to trigger failures
// 2. Or manually modify the ledger state via direct KV access
// 3. Then re-run the search queries

runTests().catch(console.error);
