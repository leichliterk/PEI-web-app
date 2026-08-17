# start-dev.ps1
# 1. Start the Node.js API server in this window.
# 2. Once it accepts connections on port 443, open a new PS window for the Angular dev server.
# 3. Open the browser to http://localhost:4200.

$serverDir = 'C:\Users\leich\Documents\GitHub\SV\PEI\PEI-web-server'
$clientDir = 'C:\Users\leich\Documents\GitHub\SV\PEI\PEI-web-app'
$serverPort = 443
$clientUrl  = 'http://localhost:4200'

# --- Start the API server in this window ---
Write-Host "Starting API server (port $serverPort)..." -ForegroundColor Cyan
$serverJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm start 2>&1
} -ArgumentList $serverDir

# --- Poll until the server is listening ---
$timeout  = 60
$elapsed  = 0
$interval = 2
$ready    = $false

Write-Host "Waiting for API server..." -ForegroundColor Yellow

while (-not $ready -and $elapsed -lt $timeout) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    Receive-Job $serverJob | ForEach-Object { Write-Host $_ }

    try {
        $tcp = [System.Net.Sockets.TcpClient]::new()
        $tcp.Connect('127.0.0.1', $serverPort)
        $tcp.Close()
        $ready = $true
    } catch {
        # Not ready yet.
    }
}

if (-not $ready) {
    Write-Host "Timed out waiting for API server." -ForegroundColor Red
    Stop-Job $serverJob; Remove-Job $serverJob
    exit 1
}

Write-Host "API server is up." -ForegroundColor Green

# --- Open a new PS window for the Angular dev server + browser ---
$clientScript = @"
Set-Location '$clientDir'
Write-Host 'Starting Angular dev server...' -ForegroundColor Cyan
`$ngJob = Start-Job -ScriptBlock { Set-Location '$clientDir'; npm start 2>&1 }
`$ready = `$false
`$elapsed = 0
while (-not `$ready -and `$elapsed -lt 120) {
    Start-Sleep -Seconds 2; `$elapsed += 2
    Receive-Job `$ngJob | ForEach-Object { Write-Host `$_ }
    try {
        `$r = Invoke-WebRequest -Uri '$clientUrl' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if (`$r.StatusCode -eq 200) { `$ready = `$true }
    } catch {}
}
if (`$ready) {
    Write-Host 'Angular app ready. Opening browser...' -ForegroundColor Green
    Start-Process '$clientUrl'
} else {
    Write-Host 'Timed out waiting for Angular dev server.' -ForegroundColor Red
}
Write-Host 'Press Ctrl+C to stop.'; try { while (`$true) { Receive-Job `$ngJob | ForEach-Object { Write-Host `$_ }; Start-Sleep 1 } } finally { Stop-Job `$ngJob; Remove-Job `$ngJob }
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $clientScript

# --- Stream API server output in this window ---
Write-Host "Press Ctrl+C to stop the API server.`n" -ForegroundColor DarkGray
try {
    while ($true) {
        Receive-Job $serverJob | ForEach-Object { Write-Host $_ }
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-Job  $serverJob
    Remove-Job $serverJob
    Write-Host "API server stopped." -ForegroundColor Cyan
}
