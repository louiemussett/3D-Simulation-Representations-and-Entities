[CmdletBinding()]
param(
    [string]$ProjectRoot = '',
    [string]$OutputPath = (Join-Path (Get-Location) 'cinema-mode-installation-inventory.json')
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Invoke-Safe {
    param([scriptblock]$Action)
    try { & $Action } catch { $null }
}

function Get-CommandInfo {
    param([string]$Name, [string[]]$VersionArguments)
    $command = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $command) {
        return [ordered]@{ found = $false; path = $null; version = $null }
    }
    $version = Invoke-Safe { (& $command.Source @VersionArguments 2>&1 | Select-Object -First 1).ToString().Trim() }
    [ordered]@{ found = $true; path = $command.Source; version = $version }
}

function Test-ListeningPort {
    param([int]$Port)
    $connection = Invoke-Safe { Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop | Select-Object -First 1 }
    [bool]$connection
}

function Get-DirectorySummary {
    param([string]$Path)
    if (-not $Path) { return $null }
    $expanded = [Environment]::ExpandEnvironmentVariables($Path)
    $exists = Test-Path -LiteralPath $expanded -PathType Container
    $driveInfo = $null
    if ($exists) {
        $item = Get-Item -LiteralPath $expanded
        $driveInfo = Invoke-Safe { Get-PSDrive -Name $item.PSDrive.Name }
    }
    [ordered]@{
        path = $expanded
        exists = $exists
        free_bytes = if ($driveInfo) { [int64]$driveInfo.Free } else { $null }
    }
}

function Get-EnvKeyStatus {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return [ordered]@{ exists = $false; path = $Path; keys = @() }
    }
    $keys = @()
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') { $keys += $Matches[1] }
    }
    [ordered]@{ exists = $true; path = $Path; keys = @($keys | Sort-Object -Unique) }
}

function Get-ObsInstall {
    $standard = 'C:\Program Files\obs-studio\bin\64bit\obs64.exe'
    $path = if (Test-Path -LiteralPath $standard) { $standard } else { $null }
    if (-not $path) {
        $path = (Get-Command obs64.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    }
    $version = if ($path) { (Get-Item -LiteralPath $path).VersionInfo.ProductVersion } else { $null }
    [ordered]@{ found = [bool]$path; path = $path; version = $version }
}

function Get-ObsWebSocketStatus {
    param([string]$ConfigPath)
    $result = [ordered]@{
        config_found = (Test-Path -LiteralPath $ConfigPath -PathType Leaf)
        config_path = $ConfigPath
        server_enabled = $null
        port = $null
        authentication_enabled = $null
        password_present = $null
    }
    if (-not $result.config_found) { return $result }
    $config = Invoke-Safe { Get-Content -Raw -LiteralPath $ConfigPath | ConvertFrom-Json }
    if (-not $config) { return $result }
    foreach ($property in @('server_enabled', 'server_port', 'auth_required', 'server_password')) {
        if ($config.PSObject.Properties.Name -contains $property) {
            switch ($property) {
                'server_enabled' { $result.server_enabled = [bool]$config.$property }
                'server_port' { $result.port = $config.$property }
                'auth_required' { $result.authentication_enabled = [bool]$config.$property }
                'server_password' { $result.password_present = -not [string]::IsNullOrWhiteSpace([string]$config.$property) }
            }
        }
    }
    $result
}

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
}
$resolvedProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$userProfilePath = [Environment]::GetFolderPath('UserProfile')
$localAppDataPath = [Environment]::GetFolderPath('LocalApplicationData')
$roamingAppDataPath = [Environment]::GetFolderPath('ApplicationData')

$node = Get-CommandInfo 'node.exe' @('--version')
$npm = Get-CommandInfo 'npm.cmd' @('--version')
$ollama = Get-CommandInfo 'ollama.exe' @('--version')
$python = Get-CommandInfo 'python.exe' @('--version')
$pythonLauncher = Get-CommandInfo 'py.exe' @('--version')
$ffmpeg = Get-CommandInfo 'ffmpeg.exe' @('-version')
$ffprobe = Get-CommandInfo 'ffprobe.exe' @('-version')
$git = Get-CommandInfo 'git.exe' @('--version')

$ollamaModels = @()
$ollamaRunningModels = @()
if ($ollama.found) {
    $listLines = Invoke-Safe { & $ollama.path list 2>&1 | Select-Object -Skip 1 }
    foreach ($line in @($listLines)) {
        if ([string]$line -match '^\s*(\S+)\s+(\S+)\s+(.+?)\s{2,}(.+?)\s*$') {
            $ollamaModels += [ordered]@{ name = $Matches[1]; id = $Matches[2]; size = $Matches[3]; modified = $Matches[4] }
        }
    }
    $ollamaRunningModels = @(Invoke-Safe { & $ollama.path ps 2>&1 | ForEach-Object { $_.ToString() } })
}
$ollamaApi = Invoke-Safe { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 }
$ollamaModelRoot = [Environment]::GetEnvironmentVariable('OLLAMA_MODELS', 'User')
if (-not $ollamaModelRoot) { $ollamaModelRoot = [Environment]::GetEnvironmentVariable('OLLAMA_MODELS', 'Machine') }
if (-not $ollamaModelRoot) { $ollamaModelRoot = Join-Path $userProfilePath '.ollama\models' }

$pythonInstallations = @()
$pythonPaths = @(Get-Command python.exe -All -ErrorAction SilentlyContinue | ForEach-Object { $_.Source } | Select-Object -Unique)
$launcherPaths = @(Invoke-Safe { py.exe -0p 2>&1 | ForEach-Object { $_.ToString().Trim() } })
foreach ($candidate in @($pythonPaths + $launcherPaths | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
    $candidateVersion = Invoke-Safe { (& $candidate --version 2>&1 | Select-Object -First 1).ToString().Trim() }
    $piperShow = Invoke-Safe { & $candidate -m pip show piper-tts 2>$null }
    $pythonInstallations += [ordered]@{
        path = $candidate
        version = $candidateVersion
        piper_tts_installed = [bool]$piperShow
    }
}

$voiceRoots = @(
    (Join-Path $resolvedProjectRoot 'runtime\piper-voices'),
    (Join-Path $resolvedProjectRoot 'companion\runtime\piper-voices'),
    (Join-Path $localAppDataPath 'LivingLaboratory\piper\voices')
) | Select-Object -Unique
$voices = @()
foreach ($voiceRoot in $voiceRoots) {
    if (Test-Path -LiteralPath $voiceRoot -PathType Container) {
        foreach ($model in Get-ChildItem -LiteralPath $voiceRoot -Filter '*.onnx' -File -ErrorAction SilentlyContinue) {
            $voices += [ordered]@{
                model = $model.FullName
                config_found = Test-Path -LiteralPath ($model.FullName + '.json')
                size_bytes = [int64]$model.Length
            }
        }
    }
}

$obsConfigPath = Join-Path $roamingAppDataPath 'obs-studio\plugin_config\obs-websocket\config.json'
$obs = Get-ObsInstall
$obsWebSocket = Get-ObsWebSocketStatus $obsConfigPath

$computer = Invoke-Safe { Get-CimInstance Win32_ComputerSystem }
$operatingSystem = Invoke-Safe { Get-CimInstance Win32_OperatingSystem }
$processors = @(Invoke-Safe { Get-CimInstance Win32_Processor } | Where-Object { $null -ne $_ })
$videoControllers = @(Invoke-Safe { Get-CimInstance Win32_VideoController } | Where-Object { $null -ne $_ })

$report = [ordered]@{
    report_schema = 1
    generated_at = (Get-Date).ToString('o')
    safety = 'Read-only inspection except for this JSON report. No packages, models, services, or settings were changed.'
    project = [ordered]@{
        root = $resolvedProjectRoot
        package_json = Test-Path -LiteralPath (Join-Path $resolvedProjectRoot 'package.json')
        companion_package_json = Test-Path -LiteralPath (Join-Path $resolvedProjectRoot 'companion\package.json')
        companion_env = Get-EnvKeyStatus (Join-Path $resolvedProjectRoot 'companion\.env')
        companion_env_example = Get-EnvKeyStatus (Join-Path $resolvedProjectRoot 'companion\.env.example')
    }
    system = [ordered]@{
        os = if ($operatingSystem) { $operatingSystem.Caption } else { $null }
        os_version = if ($operatingSystem) { $operatingSystem.Version } else { $null }
        architecture = $env:PROCESSOR_ARCHITECTURE
        powershell = $PSVersionTable.PSVersion.ToString()
        cpu = @($processors | ForEach-Object { $_.Name })
        memory_bytes = if ($computer) { [int64]$computer.TotalPhysicalMemory } else { $null }
        gpu = @($videoControllers | ForEach-Object {
            [ordered]@{ name = $_.Name; driver_version = $_.DriverVersion; adapter_ram_bytes = if ($_.AdapterRAM) { [int64]$_.AdapterRAM } else { $null } }
        })
        drives = @(Get-PSDrive -PSProvider FileSystem | ForEach-Object {
            [ordered]@{ root = $_.Root; free_bytes = [int64]$_.Free; used_bytes = [int64]$_.Used }
        })
    }
    tools = [ordered]@{
        node = $node
        npm = $npm
        git = $git
        python = $python
        python_launcher = $pythonLauncher
        ffmpeg = $ffmpeg
        ffprobe = $ffprobe
        obs = $obs
        ollama = $ollama
    }
    python_installations = $pythonInstallations
    piper = [ordered]@{
        voices = $voices
        searched_voice_roots = $voiceRoots
    }
    ollama = [ordered]@{
        api_responding = [bool]$ollamaApi
        model_directory = Get-DirectorySummary $ollamaModelRoot
        installed_models = $ollamaModels
        process_output = $ollamaRunningModels
    }
    obs = [ordered]@{
        process_running = [bool](Get-Process obs64 -ErrorAction SilentlyContinue)
        websocket = $obsWebSocket
    }
    local_ports = [ordered]@{
        companion_8765 = Test-ListeningPort 8765
        ollama_11434 = Test-ListeningPort 11434
        obs_websocket_4455 = Test-ListeningPort 4455
    }
    recommended_locations = [ordered]@{
        piper_environment = Join-Path $localAppDataPath 'LivingLaboratory\piper\.venv'
        piper_voices = Join-Path $localAppDataPath 'LivingLaboratory\piper\voices'
        fallback_sessions = Join-Path ([Environment]::GetFolderPath('MyVideos')) 'Living Laboratory\Documentary Sessions'
        note = 'Choose a large, fast non-system drive for sessions and Ollama models when available; confirm from drive free-space data before changing anything.'
    }
}

$outputDirectory = Split-Path -Parent ([System.IO.Path]::GetFullPath($OutputPath))
if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $OutputPath -Encoding UTF8

Write-Host ''
Write-Host 'Cinema Mode installation inventory complete.' -ForegroundColor Green
Write-Host ('Report: {0}' -f ([System.IO.Path]::GetFullPath($OutputPath)))
Write-Host ('Node: {0} | Ollama: {1} | OBS: {2} | FFmpeg: {3} | Piper voices: {4}' -f `
    $node.found, $ollama.found, $obs.found, $ffmpeg.found, $voices.Count)
Write-Host 'The report contains no environment-variable values or OBS password.'
