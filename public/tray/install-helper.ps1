#Requires -RunAsAdministrator
<#
.SYNOPSIS
Kuamini Security Client Installer v1.0.27 - Enhanced Helper Script
Fixed: Token validation, registration, and threat reporting

.DESCRIPTION
This script extracts the registration token, validates it, and passes it to the MSI installer.
Enhancements:
- Token validation before install
- Multiple fallback token locations
- Proper environment variable passing
- Config directory creation with token

.EXAMPLE
.\install-helper.ps1
#>

param(
    [Parameter(Mandatory = $false)]
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Kuamini Security Client Installer v1.0.27" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 1: FIND AND VALIDATE REGISTRATION TOKEN
# ============================================================================

Write-Host "[1/5] Searching for registration token..." -ForegroundColor Yellow

$tokenPath = $null
$tokenContent = $null

# Search in script directory first
@("registration.token", "registration_token.txt") | ForEach-Object {
    $candidate = Join-Path $scriptPath $_
    if (Test-Path $candidate) {
        try {
            $content = Get-Content $candidate -Raw -Encoding UTF8
            if ($content -and $content.Trim().Length -gt 50 -and $content.Trim() -ne "placeholder-token") {
                $tokenPath = $candidate
                $tokenContent = $content.Trim()
                Write-Host "  ✓ Found valid token in: $candidate" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ⚠ Could not read $($_): $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

if (-not $tokenPath) {
    Write-Host "  ✗ ERROR: No valid registration token found!" -ForegroundColor Red
    Write-Host "  Expected: registration.token or registration_token.txt" -ForegroundColor Red
    Write-Host "  Location: Same directory as install-windows.cmd" -ForegroundColor Red
    exit 1
}

Write-Host "  Token length: $($tokenContent.Length) characters" -ForegroundColor Cyan
Write-Host "  Token starts with: $($tokenContent.Substring(0, [Math]::Min(20, $tokenContent.Length)))..." -ForegroundColor Cyan

# ============================================================================
# STEP 2: FIND MSI FILE
# ============================================================================

Write-Host "[2/5] Locating MSI installer..." -ForegroundColor Yellow

$msiPath = Get-ChildItem -Path $scriptPath -Filter "KuaminiSecurityClient-*.msi" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^KuaminiSecurityClient-\d+\.\d+\.\d+(\.\d+)?\.msi$' } |
    Sort-Object {
        $v = [regex]::Match($_.Name, 'KuaminiSecurityClient-(\d+\.\d+\.\d+(?:\.\d+)?).msi').Groups[1].Value.Split('.')
        [Version](($v + @("0","0","0","0"))[0..3] -join '.')
    } -Descending |
    Select-Object -First 1 -ExpandProperty FullName

if (-not $msiPath -or -not (Test-Path $msiPath)) {
    Write-Host "  ✗ ERROR: MSI file not found!" -ForegroundColor Red
    Write-Host "  Expected: KuaminiSecurityClient-*.msi" -ForegroundColor Red
    Write-Host "  Location: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Found MSI: $(Split-Path -Leaf $msiPath)" -ForegroundColor Green

# ============================================================================
# STEP 3: CREATE CONFIG DIRECTORY AND PREPARE TOKEN
# ============================================================================

Write-Host "[3/5] Preparing installation configuration..." -ForegroundColor Yellow

$configDir = Join-Path $env:LOCALAPPDATA "KuaminiSecurityClient"
try {
    New-Item -ItemType Directory -Path $configDir -Force -ErrorAction Stop | Out-Null
    Write-Host "  ✓ Config directory: $configDir" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Warning: Could not create config directory: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Write token to config directory as backup
$backupTokenPath = Join-Path $configDir "registration.token"
try {
    Set-Content -Path $backupTokenPath -Value $tokenContent -Encoding UTF8 -NoNewline -Force
    Write-Host "  ✓ Token stored in config directory (backup)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Warning: Could not store token backup: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================================================
# STEP 4: INSTALL MSI WITH TOKEN
# ============================================================================

Write-Host "[4/5] Installing MSI package..." -ForegroundColor Yellow

$tempLogFile = Join-Path $env:TEMP "kuamini-install-$(Get-Random).log"

try {
    # Pass token via environment variable AND MSI property
    $env:REGISTRATION_TOKEN = $tokenContent

    $msiArgs = @(
        "/i", $msiPath,
        "REGISTRATIONTOKEN=`"$tokenContent`"",
        "/L*V", $tempLogFile,
        "/passive"
    )

    Write-Host "  Installing: $([System.IO.Path]::GetFileName($msiPath))" -ForegroundColor Cyan
    Write-Host "  Log file: $tempLogFile" -ForegroundColor Cyan

    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArgs -PassThru -Wait -NoNewWindow
    $exitCode = $process.ExitCode

    if ($exitCode -ne 0 -and $exitCode -ne 3010) {
        Write-Host "  ✗ MSI installation failed with exit code: $exitCode" -ForegroundColor Red
        if (Test-Path $tempLogFile) {
            Write-Host "  Last 30 lines of log:" -ForegroundColor Yellow
            Get-Content $tempLogFile -Tail 30 | Write-Host
        }
        exit $exitCode
    }

    Write-Host "  ✓ MSI installation completed (exit code: $exitCode)" -ForegroundColor Green

    # Clean up temp log
    Remove-Item $tempLogFile -Force -ErrorAction SilentlyContinue

} catch {
    Write-Host "  ✗ ERROR: MSI installation failed: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $tempLogFile) {
        Write-Host "  Last 50 lines of log:" -ForegroundColor Yellow
        Get-Content $tempLogFile -Tail 50 | Write-Host
    }
    exit 1
} finally {
    $env:REGISTRATION_TOKEN = $null
}

# ============================================================================
# STEP 5: VERIFY INSTALLATION AND START AGENT
# ============================================================================

Write-Host "[5/5] Verifying installation and starting agent..." -ForegroundColor Yellow

$installPath = "C:\Program Files\Kuamini Security Client"

if (-not (Test-Path $installPath)) {
    Write-Host "  ✗ ERROR: Installation path not found: $installPath" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Installation directory verified" -ForegroundColor Green

# Start the agent
$exePath = Join-Path $installPath "KuaminiSecurityClient.exe"
if (Test-Path $exePath) {
    try {
        Write-Host "  Starting agent..." -ForegroundColor Cyan
        Start-Process $exePath -ErrorAction Stop
        Start-Sleep -Seconds 2
        Write-Host "  ✓ Agent started successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Could not start agent: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "  Agent will start on next login (autostart configured)" -ForegroundColor Cyan
    }
} else {
    Write-Host "  ⚠ Executable not found: $exePath" -ForegroundColor Yellow
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  ✓ INSTALLATION COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Open Kuamini Security Console" -ForegroundColor Gray
Write-Host "     https://kuaminisystems.com/securityAgent" -ForegroundColor Gray
Write-Host "  2. Login to your account" -ForegroundColor Gray
Write-Host "  3. Verify the new endpoint appears in your dashboard" -ForegroundColor Gray
Write-Host "  4. Agent will auto-register and begin threat scanning" -ForegroundColor Gray
Write-Host ""
Write-Host "Agent Status:" -ForegroundColor Cyan
Write-Host "  - Look for tray icon in bottom-right corner" -ForegroundColor Gray
Write-Host "  - Initial threat scan will run automatically" -ForegroundColor Gray
Write-Host "  - Results appear in dashboard within 1-2 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "Logs:" -ForegroundColor Cyan
Write-Host "  - Agent log: $configDir\agent.log" -ForegroundColor Gray
Write-Host "  - Config: $configDir\config.json" -ForegroundColor Gray
Write-Host ""

exit 0
