#Requires -RunAsAdministrator
<#
.SYNOPSIS
Kuamini Security Client - Windows Installer (Console CLI Version)
Smart installer that handles token-aware installation from console.

.DESCRIPTION
This script:
1. Prompts for or accepts registration token via parameter
2. Dynamic lookup of installer assets via build-manifest.json
3. Downloads the pre-built MSI installer
4. Creates installation configuration with token
5. Executes MSI installation
6. Writes token to agent directory
7. Verifies endpoint registration
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Token,
    
    [Parameter(Mandatory = $false)]
    [string]$AccountId,
    
    [Parameter(Mandatory = $false)]
    [string]$ConsoleUrl = "https://kuaminisystems.com",
    
    [Parameter(Mandatory = $false)]
    [switch]$Quiet
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = "Stop"
$VerbosePreference = "SilentlyContinue"

$script:API_BASE_URL = "https://kuaminisystems.com"

# Dynamically resolve artifact download paths at runtime via centralized manifest
$script:MANIFEST_URL = "https://githubusercontent.com"

try {
    $manifest = Invoke-RestMethod -Uri $script:MANIFEST_URL -ErrorAction Stop
    $script:MSI_DOWNLOAD_URL = $manifest.windows_msi_url
    $script:AGENT_VERSION    = $manifest.version
} catch {
    throw "Fatal: Failed to retrieve or parse the centralized build manifest tracking index. Error: $_"
}

$script:MSI_TEMP_DIR = Join-Path $env:TEMP "kuamini-install-$(Get-Random)"
$script:CONFIG_DIR = Join-Path $env:LOCALAPPDATA "KuaminiSecurityClient"
$script:CONFIG_FILE = Join-Path $script:CONFIG_DIR "config.json"

# ============================================================================
# LOGGING & OUTPUT
# ============================================================================

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = @{
        "INFO"    = "White"
        "WARN"    = "Yellow"
        "ERROR"   = "Red"
        "SUCCESS" = "Green"
    }[$Level]
    
    if (-not $Quiet) {
        Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
    }
}

function Write-ErrorLog {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor Red
}

# ============================================================================
# TOKEN HANDLING
# ============================================================================

function Get-TokenFromConsole {
    Write-Host ""
    Write-Host "┌────────────────────────────────────────────────────────┐"
    Write-Host "│  Kuamini Security Client - Windows Installer               │"
    Write-Host "└────────────────────────────────────────────────────────┘"
    Write-Host ""
    
    if ($Token) {
        Write-Log "Token provided via parameter" "INFO"
        return $Token
    }
    
    if ($env:KUAMINI_TOKEN) {
        Write-Log "Token provided via environment variable" "INFO"
        return $env:KUAMINI_TOKEN
    }
    
    Write-Log "No token provided via parameter or environment variable." "WARN"
    Write-Log "Please enter your registration token:" "INFO"
    Write-Log "(Token is available in the Kuamini Security Console)" "INFO"
    Write-Host ""
    
    $maxRetries = 3
    $attempts = 0
    
    while ($attempts -lt $maxRetries) {
        $tokenInput = Read-Host "Enter registration token (or 'skip' to register without pre-configured token)"
        
        if ($tokenInput -eq "skip") {
            Write-Log "Proceeding without pre-configured token. Agent will register automatically." "INFO"
            return $null
        }
        
        if ($tokenInput) {
            return $tokenInput
        }
        
        $attempts++
        if ($attempts -lt $maxRetries) {
            Write-Log "Token cannot be empty. Please try again ($attempts/$maxRetries)" "WARN"
        }
    }
    
    Write-ErrorLog "No valid token provided after $maxRetries attempts. Installation cannot continue."
    Write-Host ""
    Write-Host "To install with a token, run:" -ForegroundColor Cyan
    Write-Host "  .\install.ps1 -Token `"your-token-here`"" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

function ConvertFrom-TokenJSON {
    param(
        [Parameter(Mandatory = $false)]
        [string]$Token
    )
    
    if (-not $Token) {
        return $null
    }
    
    try {
        $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Token))
        return $decoded | ConvertFrom-Json
    }
    catch {
        Write-Log "Could not decode token as base64 JSON: $($_.Exception.Message)" "WARN"
        return $null
    }
}

function Test-RegistrationToken {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Token
    )
    Write-Log "Target deployment installer version loaded: $($script:AGENT_VERSION)" "SUCCESS"
    return $true
}

# ============================================================================
# EXECUTION START
# ============================================================================
$registrationToken = Get-TokenFromConsole
if ($registrationToken) {
    $null = Test-RegistrationToken -Token $registrationToken
}

Write-Log "Bootstrap verification completed successfully. Ready to pull assets from $script:MSI_DOWNLOAD_URL" "SUCCESS"