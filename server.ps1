# USMAN PHARMACY - Local HTTP Web Server
# High-performance lightweight HTTP Server for Windows / PowerShell

param(
    [int]$port = 8080
)

$rootPath = $PSScriptRoot
if (-not $rootPath) {
    $rootPath = Get-Location
}

# Try opening port with fallback
$listener = New-Object System.Net.HttpListener
$bound = $false

foreach ($testPort in @($port, 8081, 8082, 3000)) {
    try {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:$testPort/")
        
        # Discover local Wi-Fi / LAN IP so mobile phones can connect
        $localIP = $null
        try {
            $ipObj = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -First 1
            if ($ipObj) {
                $localIP = $ipObj.IPAddress
                $listener.Prefixes.Add("http://${localIP}:$testPort/")
            }
        } catch {}

        $listener.Start()
        $port = $testPort
        $bound = $true
        Write-Output "=========================================================="
        Write-Output " USMAN PHARMACY ERP - WEB SERVER ACTIVE"
        Write-Output " Computer URL: http://localhost:$port/"
        if ($localIP) {
            Write-Output " Mobile / Tablet URL (Same Wi-Fi): http://${localIP}:$port/"
        }
        Write-Output " Root Folder: $rootPath"
        Write-Output " Press Ctrl+C in this window to stop the server."
        Write-Output "=========================================================="
        break
    } catch {
        Write-Warning "Port $testPort could not be bound, trying next port..."
    }
}

if (-not $bound) {
    Write-Error "Failed to bind to any HTTP port. Please ensure no other process is blocking ports 8080-8082."
    exit 1
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        $localPath = [System.Uri]::UnescapeDataString($rawPath)
        if ([string]::IsNullOrWhiteSpace($localPath)) {
            $localPath = "index.html"
        }

        $normPath = $localPath -replace '[/\\]', [System.IO.Path]::DirectorySeparatorChar
        $filePath = Join-Path $rootPath $normPath

        # Add standard headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html"  { "text/html; charset=utf-8" }
                ".htm"   { "text/html; charset=utf-8" }
                ".css"   { "text/css; charset=utf-8" }
                ".js"    { "application/javascript; charset=utf-8" }
                ".json"  { "application/json; charset=utf-8" }
                ".png"   { "image/png" }
                ".jpg"   { "image/jpeg" }
                ".jpeg"  { "image/jpeg" }
                ".gif"   { "image/gif" }
                ".webp"  { "image/webp" }
                ".svg"   { "image/svg+xml" }
                ".ico"   { "image/x-icon" }
                ".woff"  { "font/woff" }
                ".woff2" { "font/woff2" }
                ".ttf"   { "font/ttf" }
                default  { "application/octet-stream" }
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $localPath")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    } catch {
        # continue loop on client abort or socket disconnect
    }
}
