#Requires -RunAsAdministrator
<#
.SYNOPSIS
Kuamini Security Client Installer - Helper Script

This script extracts the registration token and passes it to the MSI installer.
Run this script from the extracted ZIP folder containing:
- KuaminiSecurityClient-<latest>.msi
- registration.token

.EXAMPLE
.\install-helper.ps1
#>

param(
    [Parameter(Mandatory = $false)]
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Kuamini Security Client Installer" -ForegroundColor Green

# Find the newest matching MSI in this folder
$msiPath = Get-ChildItem -Path $scriptPath -Filter "KuaminiSecurityClient-*.msi" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^KuaminiSecurityClient-\d+\.\d+\.\d+(\.\d+)?\.msi$' } |
    Sort-Object {
        $match = [regex]::Match($_.Name, 'KuaminiSecurityClient-(\d+\.\d+\.\d+(?:\.\d+)?)\.msi')
        $versionText = $match.Groups[1].Value
        $parts = $versionText.Split('.')
        [Version](($parts + @("0","0","0","0"))[0..3] -join '.')
    } -Descending |
    Select-Object -First 1 -ExpandProperty FullName

$tokenPath = Join-Path $scriptPath "registration.token"

if (-not $msiPath -or !(Test-Path $msiPath)) {
    Write-Host "ERROR: MSI file not found in current directory" -ForegroundColor Red
    if ($msiPath) {
        Write-Host "Expected: $msiPath" -ForegroundColor Red
    }
    exit 1
}

if (!(Test-Path $tokenPath)) {
    Write-Host "ERROR: registration.token file not found in current directory" -ForegroundColor Red
    Write-Host "Expected: $tokenPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found MSI: $(Split-Path -Leaf $msiPath)" -ForegroundColor Cyan
Write-Host "Found token: $(Split-Path -Leaf $tokenPath)" -ForegroundColor Cyan

Write-Host "Reading registration token..." -ForegroundColor Yellow
$token = Get-Content $tokenPath -Raw
if (-not $token) {
    Write-Host "ERROR: registration.token is empty" -ForegroundColor Red
    exit 1
}

$token = $token.Trim()
Write-Host "Token loaded (length: $($token.Length) bytes)" -ForegroundColor Cyan

Write-Host "Installing Kuamini Security Client..." -ForegroundColor Yellow
Write-Host ""

$tempLogFile = Join-Path $env:TEMP "kuamini-install-$(Get-Random).log"

try {
    $configDir = Join-Path $env:LOCALAPPDATA "KuaminiSecurityClient"
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null

    $backupTokenPath = Join-Path $configDir "registration.token"
    Set-Content -Path $backupTokenPath -Value $token -Encoding UTF8 -NoNewline
    Write-Host "Token written to: $backupTokenPath" -ForegroundColor Cyan

    $processSplat = @{
        FilePath = "msiexec.exe"
        ArgumentList = @(
            "/i", $msiPath,
            "REGISTRATIONTOKEN=`"$token`"",
            "/L*V", $tempLogFile,
            "/passive"
        )
        Wait = $true
        NoNewWindow = $false
    }

    $process = Start-Process @processSplat -PassThru
    $exitCode = $process.ExitCode

    if ($exitCode -ne 0) {
        Write-Host "MSI installation failed with exit code: $exitCode" -ForegroundColor Red
        Write-Host "Log file: $tempLogFile" -ForegroundColor Yellow
        if (Test-Path $tempLogFile) {
            Get-Content $tempLogFile -Tail 50 | Write-Host
        }
        exit $exitCode
    }

    Write-Host "MSI installation completed successfully" -ForegroundColor Green

    Write-Host ""
    Write-Host "Starting agent..." -ForegroundColor Yellow

    $exePath = "C:\Program Files\Kuamini Security Client\KuaminiSecurityClient.exe"
    if (Test-Path $exePath) {
        try {
            Start-Process $exePath -ErrorAction Stop
            Start-Sleep -Seconds 2
            Write-Host "Agent started successfully" -ForegroundColor Green
        } catch {
            Write-Host "WARNING: Could not start agent: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "Agent will start on next login (autostart configured)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "WARNING: Executable not found at $exePath" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Verifying installation..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3

    $installPath = "C:\Program Files\Kuamini Security Client"
    if (!(Test-Path $installPath)) {
        Write-Host "ERROR: Installation path not found: $installPath" -ForegroundColor Red
        exit 1
    }

    Write-Host "Installation directory exists" -ForegroundColor Cyan

    $installedTokenPath = Join-Path $installPath "registration.token"
    if (Test-Path $installedTokenPath) {
        Write-Host "Token file created in install directory" -ForegroundColor Cyan
    } else {
        Write-Host "Note: Token file not in install directory, checking backup location" -ForegroundColor Yellow
        if (Test-Path $backupTokenPath) {
            Write-Host "Token found in config directory - agent will use this" -ForegroundColor Cyan
        }
    }

    $configPath = Join-Path $configDir "config.json"
    if (Test-Path $configPath) {
        Write-Host "Config file exists" -ForegroundColor Cyan
        try {
            $config = Get-Content $configPath | ConvertFrom-Json
            Write-Host "Account ID: $($config.account_id)" -ForegroundColor Cyan
        } catch {
            Write-Host "Config exists but could not be parsed." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Config not yet created (agent will create it on first run)" -ForegroundColor Cyan
    }

    $process = Get-Process KuaminiSecurityClient -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "OK: Agent process is running (PID: $($process.Id))" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Agent process not running (may be starting or blocked by antivirus)" -ForegroundColor Yellow
        Write-Host "If you see a SmartScreen or Defender warning, please allow it to run." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Installation completed successfully!" -ForegroundColor Green
    Write-Host "The Kuamini Security Client agent is starting now." -ForegroundColor Cyan
    Write-Host "Look for the tray icon in the Windows system tray (bottom-right corner)." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Agent will also auto-start on Windows login." -ForegroundColor Cyan

    if (!(Test-Path "C:\Program Files\Kuamini Security Client\KuaminiSecurityClient.exe")) {
        Write-Host ""
        Write-Host "WARNING: Executable not found. Checking logs:" -ForegroundColor Yellow
        if (Test-Path $tempLogFile) {
            Get-Content $tempLogFile -Tail 30 | Write-Host
        }
    }

    Remove-Item $tempLogFile -Force -ErrorAction SilentlyContinue

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Full error: $_" -ForegroundColor Red
    if (Test-Path $tempLogFile) {
        Get-Content $tempLogFile -Tail 50 | Write-Host
    }
    exit 1
}