$root = Join-Path $PSScriptRoot "dist"
$port = 3001
$prefix = "http://localhost:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Server running at $prefix" -ForegroundColor Green
Write-Host "Serving files from: $root"
Write-Host "Press Ctrl+C to stop."

$mimeTypes = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"  = "font/ttf"
    ".eot"  = "application/vnd.ms-fontobject"
    ".wasm" = "application/wasm"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.AbsolutePath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }

        $filePath = Join-Path $root $urlPath.Substring(1)

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            
            $buffer = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            Write-Host "200 $urlPath"
        } else {
            $htmlPath = Join-Path $root "index.html"
            if (Test-Path $htmlPath) {
                $buffer = [System.IO.File]::ReadAllBytes($htmlPath)
                $response.ContentType = "text/html"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                Write-Host "200 $urlPath -> index.html (SPA fallback)"
            } else {
                $response.StatusCode = 404
                Write-Host "404 $urlPath"
            }
        }

        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
