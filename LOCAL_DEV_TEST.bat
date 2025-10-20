@echo off
REM Local Development Testing

echo.
echo ========================================
echo LOCAL DEV SERVER TESTING SUITE
echo ========================================
echo.

set "url=http://127.0.0.1:8787"

echo TEST 1: Health Check Endpoint
curl -s "%url%/health" > nul
if %errorlevel% equ 0 (
    echo ✅ PASS - Health endpoint responding
) else (
    echo ❌ FAIL - Cannot connect to dev server
    echo    Make sure wrangler dev is running on port 8787
    exit /b 1
)
echo.

echo TEST 2: Root HTML Portal
curl -s "%url%/" > nul
if %errorlevel% equ 0 (
    echo ✅ PASS - Root HTML portal responding
) else (
    echo ❌ FAIL - Root HTML not accessible
)
echo.

echo TEST 3: Search API
curl -s "%url%/api/search?q=test" > nul
if %errorlevel% equ 0 (
    echo ✅ PASS - Search API responding
) else (
    echo ❌ FAIL - Search API not responding
)
echo.

echo TEST 4: Response Headers
for /f %%i in ('curl -s -i "%url%/api/search?q=test" ^| find /c "Content-Type"') do (
    if %%i gtr 0 (
        echo ✅ PASS - Response headers present
    ) else (
        echo ⚠️ WARN - Headers may be missing
    )
)
echo.

echo ========================================
echo ALL LOCAL TESTS COMPLETE
echo ========================================
echo.
echo Dev Server: http://127.0.0.1:8787
echo Press [X] in dev server terminal to stop
echo.
