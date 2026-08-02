$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$mime = @{ '.html'='text/html'; '.js'='text/javascript'; '.css'='text/css'; '.png'='image/png'; '.svg'='image/svg+xml' }
$server = $null
$port = 8117
while ($port -le 8127) {
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
if (-not $server) { throw 'No free local port was found from 8117 through 8127.' }
$cacheBuster = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$documentaryToken = ''
$companionEnv = Join-Path $root 'companion\.env'
if (Test-Path -LiteralPath $companionEnv -PathType Leaf) {
  $tokenLine = Get-Content -LiteralPath $companionEnv | Where-Object { $_ -match '^\s*DOCUMENTARY_SESSION_TOKEN\s*=' } | Select-Object -First 1
  if ($tokenLine) { $documentaryToken = ($tokenLine -split '=', 2)[1].Trim().Trim('"').Trim("'") }
}
Start-Process "$url`?v=$cacheBuster"
Write-Host "RSS Living Laboratory is running at $url"
Write-Host "Serving files from: $root"
Write-Host 'Press Ctrl+C to stop.'
try {
  while ($server.IsListening) {
    # GetContext() blocks inside .NET and can prevent PowerShell from handling
    # Ctrl+C until another browser request arrives. Poll its asynchronous task
    # so the host regains control frequently enough to process interruption.
    $contextTask = $server.GetContextAsync()
    while (-not $contextTask.IsCompleted) { Start-Sleep -Milliseconds 100 }
    $context = $contextTask.GetAwaiter().GetResult()
    $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ($relative -eq '__documentary/bootstrap') {
      $payload = [Text.Encoding]::UTF8.GetBytes((@{ available = [bool]$documentaryToken; token = $documentaryToken; companionUrl = 'ws://127.0.0.1:8765/documentary' } | ConvertTo-Json -Compress))
      $context.Response.ContentType = 'application/json'
      $context.Response.Headers['Cache-Control'] = 'no-store, max-age=0'
      $context.Response.Headers['Pragma'] = 'no-cache'
      $context.Response.Headers['Referrer-Policy'] = 'no-referrer'
      $context.Response.ContentLength64 = $payload.Length
      $context.Response.OutputStream.Write($payload, 0, $payload.Length)
      $context.Response.Close()
      continue
    }
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
