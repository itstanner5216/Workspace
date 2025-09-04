#!/usr/bin/env node

/**
 * Provider Self-Test Demo Script
 * Demonstrates the provider health check functionality
 */

const https = require('https')

const BASE_URL = 'https://jack-portal.jacobthaywood.workers.dev'

async function testProviderSelfTest() {
  console.log('🚀 Testing Provider Self-Test Endpoint\n')

  // Test 1: Without authentication (should fail)
  console.log('Test 1: No authentication')
  try {
    const response1 = await makeRequest('/api/provider-selftest')
    console.log('❌ Should have failed but got:', response1.status)
  } catch (error) {
    console.log('✅ Correctly blocked:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 2: With debug=true
  console.log('Test 2: With debug=true')
  try {
    const response2 = await makeRequest('/api/provider-selftest?debug=true')
    const data = JSON.parse(response2.data)

    console.log('✅ Request successful')
    console.log(`📊 Summary: ${data.summary.healthy_providers}/${data.summary.total_providers} providers healthy`)
    console.log('\n📋 Provider Status:')

    data.summary_table.forEach(provider => {
      const icon = provider.status === 'OK' ? '✅' : '❌'
      console.log(`${icon} ${provider.provider.toUpperCase()}: ${provider.error_code || 'OK'} - ${provider.explanation}`)
    })

  } catch (error) {
    console.log('❌ Request failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 3: With X-Diag-Token
  console.log('Test 3: With X-Diag-Token header')
  try {
    const response3 = await makeRequest('/api/provider-selftest', {
      'X-Diag-Token': 'demo-token'
    })
    const data = JSON.parse(response3.data)

    console.log('✅ Request successful')
    console.log(`📊 Summary: ${data.summary.healthy_providers}/${data.summary.total_providers} providers healthy`)

  } catch (error) {
    console.log('❌ Request failed:', error.message)
  }
}

function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = BASE_URL + path
    const options = {
      headers: {
        'User-Agent': 'Provider-SelfTest-Demo/1.0',
        ...headers
      }
    }

    https.get(url, options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        })
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

// Run the demo
testProviderSelfTest().catch(console.error)
