$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$helper = Join-Path $scriptDir "install-helper.ps1"

if (!(Test-Path $helper)) {
    Write-Host "install-helper.ps1 not found in $scriptDir" -ForegroundColor Red
    exit 1
}

powershell -NoProfile -ExecutionPolicy Bypass -File $helper
exit $LASTEXITCODE