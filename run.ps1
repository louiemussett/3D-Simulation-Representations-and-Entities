$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$url = 'http://localhost:8017/'
$mime = @{ '.html'='text/html'; '.js'='text/javascript'; '.css'='text/css'; '.png'='image/png'; '.svg'='image/svg+xml' }
$server = [Net.HttpListener]::new()
$server.Prefixes.Add($url)
$server.Start()
Start-Process $url
Write-Host "RSS Living Laboratory is running at $url — press Ctrl+C to stop."
try {
  while ($server.IsListening) {
    $context = $server.GetContext()
    $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if (-not $relative) { $relative = 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (-not $path.StartsWith($root) -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $context.Response.Close()
      continue
    }
    $bytes = [IO.File]::ReadAllBytes($path)
    $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
    $context.Response.ContentType = $(if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' })
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally { $server.Stop() }
