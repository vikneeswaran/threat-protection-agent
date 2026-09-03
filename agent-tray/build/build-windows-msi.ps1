param(
    [Parameter(Mandatory = $false)]
    [string]$AccountId = "",

    [Parameter(Mandatory = $false)]
    [string]$AccountName = "",

    [Parameter(Mandatory = $false)]
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

# Prefer workflow-provided version, then explicit parameter, and fail if missing.
if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = $env:AGENT_VERSION
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    throw "AGENT_VERSION must be set by .github/workflows/build-agents.yml or provided as a Version parameter."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentDir = Split-Path -Parent $scriptDir
$projectRoot = Split-Path -Parent $agentDir
$distDir = Join-Path $agentDir "dist\KuaminiSecurityClient"
$internalDir = Join-Path $distDir "_internal"
$configTemplate = Join-Path $agentDir "config.json"
$configTemp = Join-Path $scriptDir "config-temp.json"
$internalWxs = Join-Path $scriptDir "InternalFiles.wxs"
$wxsMain = Join-Path $scriptDir "KuaminiSecurityClient.wxs"
$exePath = Join-Path $distDir "KuaminiSecurityClient.exe"
$heatPath = "C:\Program Files (x86)\WiX Toolset v3.14\bin\heat.exe"
$candlePath = "C:\Program Files (x86)\WiX Toolset v3.14\bin\candle.exe"
$lightPath = "C:\Program Files (x86)\WiX Toolset v3.14\bin\light.exe"
$objDir = Join-Path $scriptDir "obj"
$publicTrayDir = Join-Path $projectRoot "public\tray"

# ZIP packaging dirs
$zipStageDir = Join-Path $scriptDir "zip-stage"
$zipOutputName = if (-not [string]::IsNullOrWhiteSpace($AccountId)) {
    "KuaminiSecurityClient-$Version-$AccountId.zip"
} else {
    "KuaminiSecurityClient-$Version-windows.zip"
}
$zipOutputPath = Join-Path $publicTrayDir $zipOutputName

# Maintain the platform's required version padding format structure.
$versionParts = $Version.Split('.')
switch ($versionParts.Count) {
    1 { $productVersion = "$Version.0.0.0" }
    2 { $productVersion = "$Version.0.0" }
    3 { $productVersion = "$Version.0" }
    default { $productVersion = $Version }
}

$msiOutput = Join-Path $agentDir "dist\KuaminiSecurityClient-$Version.msi"

Write-Host "================================================"
Write-Host "Building MSI Installer v$Version"
Write-Host "Product Version: $productVersion"
Write-Host "Account ID: $AccountId"
Write-Host "ZIP Output: $zipOutputName"
Write-Host "================================================"

if (-not (Test-Path $exePath)) {
    Write-Host "ERROR: Executable not found at $exePath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $configTemplate)) {
    Write-Host "ERROR: Config template not found at $configTemplate" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $internalDir)) {
    Write-Host "ERROR: _internal directory not found at $internalDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $heatPath)) {
    Write-Host "ERROR: Heat.exe not found at $heatPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $candlePath)) {
    Write-Host "ERROR: Candle.exe not found at $candlePath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $lightPath)) {
    Write-Host "ERROR: Light.exe not found at $lightPath" -ForegroundColor Red
    exit 1
}

# The config.json template is only used for reference.
# The MSI should not include a static config.json file.

# Clean up any old config.json from dist folder
Remove-Item (Join-Path $distDir "config.json") -Force -ErrorAction SilentlyContinue

# Registration token is supplied separately during installation.
# Do NOT package a token or placeholder token inside the MSI.

if (-not (Test-Path $objDir)) {
    New-Item -ItemType Directory -Path $objDir | Out-Null
}

& $heatPath dir $internalDir -cg InternalFiles -gg -dr INTERNALFOLDER -sf -srd -o $internalWxs
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Heat.exe failed" -ForegroundColor Red
    exit 1
}

# Ensure generated components are marked as 64-bit
try {
    $wxsContent = Get-Content -Path $internalWxs -Raw
    $wxsContent = $wxsContent -replace '<Component\s+', '<Component Win64="yes" '
    Set-Content -Path $internalWxs -Value $wxsContent -Encoding UTF8
} catch {
    Write-Host "WARNING: Failed to mark InternalFiles components as Win64" -ForegroundColor Yellow
}

& $candlePath "-dProductVersion=$productVersion" "-dSourceDir=$distDir" -out "$objDir\" $wxsMain
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Candle.exe failed for KuaminiSecurityClient.wxs" -ForegroundColor Red
    exit 1
}

& $candlePath -out "$objDir\" $internalWxs
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Candle.exe failed for InternalFiles.wxs" -ForegroundColor Red
    exit 1
}

& $lightPath -out $msiOutput `
    -b $internalDir `
    (Join-Path $objDir "KuaminiSecurityClient.wixobj") `
    (Join-Path $objDir "InternalFiles.wixobj") `
    -ext WixUIExtension
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Light.exe failed" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $msiOutput)) {
    Write-Host "ERROR: MSI was not created at $msiOutput" -ForegroundColor Red
    exit 1
}

if (Test-Path $publicTrayDir) {
    Copy-Item $msiOutput (Join-Path $publicTrayDir "KuaminiSecurityClient-$Version.msi") -Force
}

# --------------------------------------------------------------------------
# Build the downloadable ZIP that contains installer + helper scripts
# --------------------------------------------------------------------------
if (Test-Path $zipStageDir) {
    Remove-Item $zipStageDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $zipStageDir | Out-Null

# Stage the MSI
Copy-Item $msiOutput (Join-Path $zipStageDir ("KuaminiSecurityClient-$Version.msi")) -Force

# Stage the helper scripts from public/tray
$helperFiles = @(
    "install-helper.ps1",
    "uninstall-kuamini-windows.ps1",
    "install-windows.cmd",
    "uninstall-windows.cmd",
    "install.ps1",
    "uninstall-kuamini-linux.sh",
    "uninstall-kuamini-macos.sh"
)

foreach ($file in $helperFiles) {
    $source = Join-Path $publicTrayDir $file
    if (Test-Path $source) {
        Copy-Item $source (Join-Path $zipStageDir $file) -Force
    }
}

# Copy a registration token placeholder if your workflow expects it.
# If you do not want a token file in the ZIP, remove this block.
$registrationTokenPath = Join-Path $zipStageDir "registration.token"
if ($AccountId) {
    Set-Content -Path $registrationTokenPath -Value "placeholder-token" -Encoding UTF8 -NoNewline
}

# Create ZIP
if (Test-Path $zipOutputPath) {
    Remove-Item $zipOutputPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($zipStageDir, $zipOutputPath)

# Cleanup staging
Remove-Item $zipStageDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $configTemp -Force -ErrorAction SilentlyContinue

Write-Host "Build completed successfully"
Write-Host "MSI: $msiOutput"
Write-Host "ZIP: $zipOutputPath"
Write-Host "Account ID: supplied through installation token"
Write-Host "Agent ID: will be generated on first app run"