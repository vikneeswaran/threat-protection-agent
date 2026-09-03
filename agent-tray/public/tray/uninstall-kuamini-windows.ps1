#Requires -RunAsAdministrator
<#
.SYNOPSIS
Kuamini Security Client Uninstaller v1.0.31 - Uninstallation Helper
This is a built-in helper script with no external dependencies.

.DESCRIPTION
Uninstalls Kuamini Security Client by removing the MSI product and local configuration.
#>

param(
    [Parameter(Mandatory = $false)]
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Green
Write-Host "Kuamini Security Client Uninstaller" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

Write-Host "[1/3] Stopping running agent..." -ForegroundColor Yellow
try {
    Get-Process KuaminiSecurityClient -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Agent stopped" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Warning: Could not stop running agent" -ForegroundColor Yellow
}

Write-Host "[2/3] Removing installed product..." -ForegroundColor Yellow
try {
    $product = Get-CimInstance -ClassName Win32_Product -Filter "Name = 'Kuamini Security Client'" -ErrorAction SilentlyContinue

    if ($product) {
        $product | Invoke-CimMethod -MethodName Uninstall | Out-Null
        Write-Host "  ✓ Product removed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Product not found; skipping MSI removal" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Uninstall error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "[3/3] Removing local configuration..." -ForegroundColor Yellow
$configDir = Join-Path $env:LOCALAPPDATA "KuaminiSecurityClient"

try {
    if (Test-Path $configDir) {
        Remove-Item -Path $configDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  ✓ Local configuration removed" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Warning: Could not remove local configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✓ UNINSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

exit 0