# Bouwt de frontend en start AirBoy op http://localhost:5080 (Ctrl+C om te stoppen).
$ErrorActionPreference = 'Stop'
$url = 'http://localhost:5080'

Push-Location (Join-Path $PSScriptRoot 'client')
try {
    if (-not (Test-Path node_modules)) { npm install; if ($LASTEXITCODE) { throw 'npm install mislukt' } }
    npm run build
    if ($LASTEXITCODE) { throw 'Frontend build mislukt' }
} finally {
    Pop-Location
}

# Open de browser zodra de server luistert.
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', @"
for (`$i = 0; `$i -lt 60; `$i++) {
    try { Invoke-WebRequest '$url' -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process '$url'; break } catch { Start-Sleep -Milliseconds 500 }
}
"@

dotnet run --project (Join-Path $PSScriptRoot 'server/AirBoy.Api') --no-launch-profile --urls $url
