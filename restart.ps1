# Frees port 3001 and starts the server with nodemon (auto-restart on change).
# Usage: .\restart.ps1

param(
    [int]$Port = 3001,
    [switch]$NoWatch  # pass -NoWatch to run `npm start` instead of `npm run dev`
)

$ErrorActionPreference = 'Stop'

# Kill anything listening on the port
$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($conns) {
    $conns | ForEach-Object {
        Write-Host "Killing PID $($_.OwningProcess) on :$Port" -ForegroundColor Yellow
        Stop-Process -Id $_.OwningProcess -Force
    }
    Start-Sleep -Milliseconds 300
} else {
    Write-Host "Port $Port is already free." -ForegroundColor DarkGray
}

Push-Location (Join-Path $PSScriptRoot 'server')
try {
    if ($NoWatch) { npm start } else { npm run dev }
} finally {
    Pop-Location
}
