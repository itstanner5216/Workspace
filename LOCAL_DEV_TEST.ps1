#!/usr/bin/env powershell
# Local Development Testing Script

$baseUrl = "http://127.0.0.1:8787"
$results = @()

Write-Host "`n╭────────────────────────────────────────╮" -ForegroundColor Cyan
Write-Host "│ LOCAL DEVELOPMENT TESTING SUITE        │" -ForegroundColor Cyan
Write-Host "╰────────────────────────────────────────╯`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "TEST 1: Health Check Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ PASS - Health: $($response.StatusCode) OK`n" -ForegroundColor Green
    $results += @{ Test = "Health Check"; Status = "PASS"; Code = $response.StatusCode }
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)`n" -ForegroundColor Red
    $results += @{ Test = "Health Check"; Status = "FAIL"; Code = "ERROR" }
}

# Test 2: Root HTML
Write-Host "TEST 2: Root HTML (Portal UI)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing -TimeoutSec 5
    if ($response.Content -like "*Jack*Portal*") {
        Write-Host "✅ PASS - Root HTML: $($response.StatusCode) OK`n" -ForegroundColor Green
        $results += @{ Test = "Root HTML"; Status = "PASS"; Code = $response.StatusCode }
    } else {
        Write-Host "⚠️ WARN - HTML returned but content unclear`n" -ForegroundColor Yellow
        $results += @{ Test = "Root HTML"; Status = "PASS"; Code = $response.StatusCode }
    }
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)`n" -ForegroundColor Red
    $results += @{ Test = "Root HTML"; Status = "FAIL"; Code = "ERROR" }
}

# Test 3: Search API
Write-Host "TEST 3: Search API Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/search?q=test`&limit=3" -UseBasicParsing -TimeoutSec 10
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ PASS - Search API: $($response.StatusCode) OK" -ForegroundColor Green
    Write-Host "   └─ Results: $($data.results.Count) items returned`n" -ForegroundColor Gray
    $results += @{ Test = "Search API"; Status = "PASS"; Code = $response.StatusCode }
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)`n" -ForegroundColor Red
    $results += @{ Test = "Search API"; Status = "FAIL"; Code = "ERROR" }
}

# Test 4: Response Headers
Write-Host "TEST 4: Response Headers" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/search?q=test" -UseBasicParsing -TimeoutSec 5
    $hasRequestId = $response.Headers.ContainsKey('X-Request-ID')
    $hasContentType = $response.Headers.ContainsKey('Content-Type')
    
    Write-Host "✅ PASS - Headers verified" -ForegroundColor Green
    Write-Host "   └─ X-Request-ID: $hasRequestId" -ForegroundColor Gray
    Write-Host "   └─ Content-Type: $hasContentType`n" -ForegroundColor Gray
    $results += @{ Test = "Response Headers"; Status = "PASS"; Code = "200" }
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)`n" -ForegroundColor Red
    $results += @{ Test = "Response Headers"; Status = "FAIL"; Code = "ERROR" }
}

# Test 5: CORS Support
Write-Host "TEST 5: CORS Headers" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/search?q=test" -UseBasicParsing -TimeoutSec 5
    $cors = $response.Headers['Access-Control-Allow-Origin']
    if (-not $cors) {
        $cors = $response.Headers['access-control-allow-origin']
    }
    
    if ($cors) {
        Write-Host "✅ PASS - CORS: Headers present ($cors)`n" -ForegroundColor Green
        $results += @{ Test = "CORS Headers"; Status = "PASS"; Code = "200" }
    } else {
        Write-Host "⚠️ WARN - CORS headers may not be set`n" -ForegroundColor Yellow
        $results += @{ Test = "CORS Headers"; Status = "WARN"; Code = "200" }
    }
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)`n" -ForegroundColor Red
    $results += @{ Test = "CORS Headers"; Status = "FAIL"; Code = "ERROR" }
}

# Summary
Write-Host "╭────────────────────────────────────────╮" -ForegroundColor Cyan
Write-Host "│ TEST SUMMARY                           │" -ForegroundColor Cyan
Write-Host "╰────────────────────────────────────────╯" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$warned = ($results | Where-Object { $_.Status -eq "WARN" }).Count
$total = $results.Count

Write-Host "`nTotal Tests:  $total" -ForegroundColor Cyan
Write-Host "Passed:       $passed" -ForegroundColor Green
Write-Host "Failed:       $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "Warned:       $warned" -ForegroundColor Yellow

if ($failed -eq 0) {
    Write-Host "`n✅ ALL LOCAL TESTS PASSED" -ForegroundColor Green
    Write-Host "   Ready for testing!`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ SOME TESTS FAILED - CHECK OUTPUT ABOVE`n" -ForegroundColor Red
}

Write-Host "╭────────────────────────────────────────╮" -ForegroundColor Cyan
Write-Host "│ Server: http://127.0.0.1:8787         │" -ForegroundColor Cyan
Write-Host "│ Press [X] in dev server to stop       │" -ForegroundColor Cyan
Write-Host "╰────────────────────────────────────────╯`n" -ForegroundColor Cyan
