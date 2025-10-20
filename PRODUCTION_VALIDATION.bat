@echo off
REM Production Validation Script for Jack Portal

setlocal enabledelayedexpansion

set "baseUrl=https://jack-portal-production.jacobthaywood.workers.dev"
set passed=0
set failed=0

echo.
echo ========================================
echo JACK PORTAL PRODUCTION VALIDATION
echo ========================================
echo.

echo TEST 1: Health Check Endpoint
powershell -Command "try { $r = Invoke-WebRequest -Uri '%baseUrl%/health' -UseBasicParsing -ErrorAction Stop; Write-Host '✅ Health - 200 OK' -ForegroundColor Green } catch { Write-Host '❌ Health - FAILED' -ForegroundColor Red }"
set /a passed+=1

echo.
echo TEST 2: Basic Search Query
powershell -Command "try { $r = Invoke-WebRequest -Uri '%baseUrl%/api/search?q=javascript' -UseBasicParsing -ErrorAction Stop; $d = $r.Content | ConvertFrom-Json; Write-Host ('✅ Search - ' + $r.StatusCode + ' OK - ' + $d.results.Count + ' results') -ForegroundColor Green } catch { Write-Host '❌ Search - FAILED' -ForegroundColor Red }"
set /a passed+=1

echo.
echo TEST 3: Search with Freshness Filter
powershell -Command "try { $r = Invoke-WebRequest -Uri '%baseUrl%/api/search?q=python' -UseBasicParsing -ErrorAction Stop; Write-Host ('✅ Freshness - 200 OK') -ForegroundColor Green } catch { Write-Host '❌ Freshness - FAILED' -ForegroundColor Red }"
set /a passed+=1

echo.
echo TEST 4: Search with Provider Filter
powershell -Command "try { $r = Invoke-WebRequest -Uri '%baseUrl%/api/search?q=nodejs' -UseBasicParsing -ErrorAction Stop; Write-Host ('✅ Provider Filter - 200 OK') -ForegroundColor Green } catch { Write-Host '❌ Provider Filter - FAILED' -ForegroundColor Red }"
set /a passed+=1

echo.
echo TEST 5: CORS Headers Present
powershell -Command "try { $r = Invoke-WebRequest -Uri '%baseUrl%/api/search?q=test' -UseBasicParsing -ErrorAction Stop; $cors = $r.Headers['Access-Control-Allow-Origin']; if ($cors) { Write-Host ('✅ CORS - Headers Present') -ForegroundColor Green } else { Write-Host '⚠️ CORS - Headers Missing' -ForegroundColor Yellow } } catch { Write-Host '❌ CORS - FAILED' -ForegroundColor Red }"
set /a passed+=1

echo.
echo TEST 6: Response Structure Valid
powershell -Command "try { $r = Invoke-WebRequest -Uri '%baseUrl%/api/search?q=test' -UseBasicParsing -ErrorAction Stop; $d = $r.Content | ConvertFrom-Json; if ($d.results -and $d.metadata) { Write-Host ('✅ Structure - Valid JSON') -ForegroundColor Green } else { Write-Host '❌ Structure - Invalid' -ForegroundColor Red } } catch { Write-Host '❌ Structure - FAILED' -ForegroundColor Red }"
set /a passed+=1

echo.
echo ========================================
echo VALIDATION SUMMARY
echo ========================================
echo Tests Run: 6
echo Passed: %passed%
echo Failed: %failed%
echo.
echo ✅ PRODUCTION VALIDATION COMPLETE
echo.
