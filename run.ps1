$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$mime = @{ '.html'='text/html'; '.js'='text/javascript'; '.css'='text/css'; '.png'='image/png'; '.svg'='image/svg+xml' }
$server = $null
$port = 8017
while ($port -le 8027) {
  $candidate = "http://localhost:$port/"
  $listener = [Net.HttpListener]::new()
  $listener.Prefixes.Add($candidate)
  try {
    $listener.Start()
    $server = $listener
    $url = $candidate
    break
  } catch {
    $listener.Close()
    $port += 1
  }
}
if (-not $server) { throw 'No free local port was found from 8017 through 8027.' }
$cacheBuster = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Start-Process "$url`?v=$cacheBuster"
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
    $context.Response.Headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
    $context.Response.Headers['Pragma'] = 'no-cache'
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally { $server.Stop() }
