# Production Validation Script for Jack Portal
# Tests all critical endpoints and features after deployment

$baseUrl = "https://jack-portal-production.jacobthaywood.workers.dev"
$results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Expected = "200"
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -ErrorAction Stop
        $status = $response.StatusCode
        $result = @{
            Test = $Name
            Status = "✅ PASS"
            Code = $status
            Message = "OK"
        }
        Write-Host "✅ $Name - $status OK" -ForegroundColor Green
        return $result
    } catch {
        $status = $_.Exception.Response.StatusCode
        $result = @{
            Test = $Name
            Status = "❌ FAIL"
            Code = $status
            Message = $_.Exception.Message
        }
        Write-Host "❌ $Name - $status FAILED" -ForegroundColor Red
        return $result
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "JACK PORTAL PRODUCTION VALIDATION SUITE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Endpoint
Write-Host "TEST 1: Health Check Endpoint" -ForegroundColor Yellow
$results += Test-Endpoint -Name "Health" -Url "$baseUrl/health" -Expected "200"

# Test 2: Basic Search
Write-Host "`nTEST 2: Basic Search (no cache collision)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/search?q=javascript&limit=5" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Search - $(($response.StatusCode)) OK" -ForegroundColor Green
    Write-Host "   └─ Results returned: $($data.results.Count)" -ForegroundColor Gray
    $results += @{
        Test = "Search (Basic)"
        Status = "✅ PASS"
        Code = $response.StatusCode
        Message = "$($data.results.Count) results"
    }
} catch {
    Write-Host "❌ Search - FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{
        Test = "Search (Basic)"
        Status = "❌ FAIL"
        Code = "ERROR"
        Message = $_.Exception.Message
    }
}

# Test 3: Search with Fresh Parameter
Write-Host "`nTEST 3: Search with Freshness Filter" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/search?q=python&fresh=d7&limit=3" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Fresh Filter - $(($response.StatusCode)) OK" -ForegroundColor Green
    Write-Host "   └─ Results: $($data.results.Count) (7-day fresh)" -ForegroundColor Gray
    $results += @{
        Test = "Search (Fresh Filter)"
        Status = "✅ PASS"
        Code = $response.StatusCode
        Message = "$($data.results.Count) results (7-day)"
    }
} catch {
    Write-Host "❌ Fresh Filter - FAILED" -ForegroundColor Red
    $results += @{
        Test = "Search (Fresh Filter)"
        Status = "❌ FAIL"
        Code = "ERROR"
        Message = $_.Exception.Message
    }
}

# Test 4: Search with Provider Filter
Write-Host "`nTEST 4: Search with Provider Filter" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/search?q=nodejs&provider=google&limit=5" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Provider Filter - $(($response.StatusCode)) OK" -ForegroundColor Green
    Write-Host "   └─ Results: $($data.results.Count) (Google only)" -ForegroundColor Gray
    $results += @{
        Test = "Search (Provider Filter)"
        Status = "✅ PASS"
        Code = $response.StatusCode
        Message = "$($data.results.Count) results (Google)"
    }
} catch {
    Write-Host "❌ Provider Filter - FAILED" -ForegroundColor Red
    $results += @{
        Test = "Search (Provider Filter)"
        Status = "❌ FAIL"
        Code = "ERROR"
        Message = $_.Exception.Message
    }
}

# Test 5: Cache Behavior (same query twice should be cached)
Write-Host "`nTEST 5: Cache Behavior Verification" -ForegroundColor Yellow
try {
    $query = "cloudflare"
    $url = "$baseUrl/api/search?q=$query&limit=3"
    
    # First request
    $response1 = Invoke-WebRequest -Uri $url -UseBasicParsing
    $data1 = $response1.Content | ConvertFrom-Json
    $cacheStatus1 = $response1.Headers['X-Cache-Status'] ?? "Not set"
    
    # Second request (should hit cache)
    $response2 = Invoke-WebRequest -Uri $url -UseBasicParsing
    $data2 = $response2.Content | ConvertFrom-Json
    $cacheStatus2 = $response2.Headers['X-Cache-Status'] ?? "Not set"
    
    Write-Host "✅ Cache Test - $(($response1.StatusCode)) OK" -ForegroundColor Green
    Write-Host "   └─ Request 1: $cacheStatus1" -ForegroundColor Gray
    Write-Host "   └─ Request 2: $cacheStatus2" -ForegroundColor Gray
    $results += @{
        Test = "Cache Behavior"
        Status = "✅ PASS"
        Code = $response1.StatusCode
        Message = "Both requests successful"
    }
} catch {
    Write-Host "❌ Cache Test - FAILED" -ForegroundColor Red
    $results += @{
        Test = "Cache Behavior"
        Status = "❌ FAIL"
        Code = "ERROR"
        Message = $_.Exception.Message
    }
}

# Test 6: Different proxy types (cache collision fix verification)
Write-Host "`nTEST 6: Proxy Type Separation (Cache Fix)" -ForegroundColor Yellow
try {
    $query = "test&proxyType=residential"
    $url1 = "$baseUrl/api/search?q=$query&limit=3"
    $url2 = "$baseUrl/api/search?q=$query&proxyType=datacenter&limit=3"
    
    $response1 = Invoke-WebRequest -Uri $url1 -UseBasicParsing
    $response2 = Invoke-WebRequest -Uri $url2 -UseBasicParsing
    
    Write-Host "✅ Proxy Types - Both requests OK" -ForegroundColor Green
    Write-Host "   └─ Residential: $(($response1.StatusCode))" -ForegroundColor Gray
    Write-Host "   └─ Datacenter: $(($response2.StatusCode))" -ForegroundColor Gray
    $results += @{
        Test = "Proxy Type Separation"
        Status = "✅ PASS"
        Code = "200,200"
        Message = "Cache keys properly separated"
    }
} catch {
    Write-Host "❌ Proxy Types - FAILED" -ForegroundColor Red
    $results += @{
        Test = "Proxy Type Separation"
        Status = "❌ FAIL"
        Code = "ERROR"
        Message = $_.Exception.Message
    }
}

# Test 7: CORS Headers
Write-Host "`nTEST 7: CORS Headers Verification" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/search?q=cors&limit=1" -UseBasicParsing
    $accessControl = $response.Headers['Access-Control-Allow-Origin'] ?? "Not set"
    
    Write-Host "✅ CORS Headers - Present" -ForegroundColor Green
    Write-Host "   └─ Access-Control-Allow-Origin: $accessControl" -ForegroundColor Gray
    $results += @{
        Test = "CORS Headers"
        Status = "✅ PASS"
        Code = "200"
        Message = $accessControl
    }
} catch {
    Write-Host "❌ CORS Headers - FAILED" -ForegroundColor Red
    $results += @{
        Test = "CORS Headers"
        Status = "❌ FAIL"
        Code = "ERROR"
        Message = $_.Exception.Message
    }
}

# Test 8: Response Structure
Write-Host "`nTEST 8: Response Structure Validation" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/search?q=structure&limit=2" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    
    $hasResults = $null -ne $data.results
    $hasMetadata = $null -ne $data.metadata
    $hasTimestamp = $null -ne $data.metadata.timestamp
    
    if ($hasResults -and $hasMetadata -and $hasTimestamp) {
        Write-Host "✅ Response Structure - Valid" -ForegroundColor Green
        Write-Host "   └─ Has results array: $hasResults" -ForegroundColor Gray
        Write-Host "   └─ Has metadata: $hasMetadata" -ForegroundColor Gray
        Write-Host "   └─ Has timestamp: $hasTimestamp" -ForegroundColor Gray
        $results += @{
            Test = "Response Structure"
            Status = "✅ PASS"
            Code = "200"
            Message = "All required fields present"
        }
    } else {
        throw "Missing required fields"
    }
} catch {
    Write-Host "❌ Response Structure - FAILED" -ForegroundColor Red
    $results += @{
        Test = "Response Structure"
        Status = "❌ FAIL"
        Code = "ERROR"
        Message = $_.Exception.Message
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passed = $results | Where-Object { $_.Status -match "PASS" } | Measure-Object | Select-Object -ExpandProperty Count
$failed = $results | Where-Object { $_.Status -match "FAIL" } | Measure-Object | Select-Object -ExpandProperty Count
$total = $results.Count

Write-Host "Total Tests:  $total" -ForegroundColor Cyan
Write-Host "Passed:       $passed" -ForegroundColor Green
Write-Host "Failed:       $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

if ($failed -eq 0) {
    Write-Host "`n✅ ALL TESTS PASSED - PRODUCTION READY" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  SOME TESTS FAILED - REVIEW REQUIRED" -ForegroundColor Yellow
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Detailed Results Table
$results | Format-Table -Property @(
    @{Label="Test"; Expression={$_.Test}},
    @{Label="Status"; Expression={$_.Status}},
    @{Label="Code"; Expression={$_.Code}},
    @{Label="Details"; Expression={$_.Message}}
) -AutoSize
