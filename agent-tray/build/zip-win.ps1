Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path "dist\KuaminiAgentTray")) {
    Write-Error "dist\KuaminiAgentTray not found. Run pyinstaller-win.ps1 first."
    exit 1
}

Set-Location dist
Compress-Archive -Path "KuaminiAgentTray" -DestinationPath "windows.zip" -Force
Write-Host "Created: dist\windows.zip"
