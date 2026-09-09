#Requires -RunAsAdministrator
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$installPath = "C:\Program Files\Kuamini Security Client"
$userConfigDirectory = Join-Path $env:LOCALAPPDATA "KuaminiSecurityClient"
$serviceConfigDirectory = Join-Path $env:ProgramData "KuaminiSecurityClient"

function Stop-Install {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Get-RegistrationToken {
    foreach ($name in @("registration.token", "registration_token.txt")) {
        $path = Join-Path $scriptDirectory $name
        if (Test-Path $path) {
            $token = (Get-Content $path -Raw -Encoding UTF8).Trim()
            if ($token.Length -gt 50 -and $token -ne "placeholder-token") {
                return $token
            }
        }
    }

    Stop-Install "A valid registration token was not found next to the installer."
}

function Get-InstallerMsi {
    $msi = Get-ChildItem -Path $scriptDirectory -Filter "KuaminiSecurityClient-*.msi" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $msi) {
        Stop-Install "KuaminiSecurityClient MSI was not found next to this helper."
    }
    return $msi.FullName
}

# Added for today's requirement:
# Determine the actual agent version from the MSI filename.
function Get-AgentVersion {
    param(
        [string]$MsiPath
    )

    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($MsiPath)

    if ($fileName -notmatch '^KuaminiSecurityClient-(.+)$') {
        Stop-Install "Unable to determine agent version from MSI filename: $fileName"
    }

    $version = $Matches[1]

    if ($version -notmatch '^\d+(\.\d+){1,3}$') {
        Stop-Install "Invalid agent version detected from MSI filename: $version"
    }

    return $version
}

function Write-AgentConfig {
    param(
        [string]$Directory,
        [string]$Token,
        [string]$AgentId,
        [string]$AgentVersion
    )

    New-Item -ItemType Directory -Path $Directory -Force | Out-Null
    $config = [ordered]@{
        api_base = "https://kuaminisystems.com/api/securityagent/agent"
        console_url = "https://kuaminisystems.com/securityAgent"
        registration_token = $Token
        agent_id = $AgentId

        # Added for today's requirement:
        # Persist the actual installed agent version.
        agent_version = $AgentVersion

        auto_register = $true
        heartbeat_interval = 60
    }
    $config | ConvertTo-Json | Set-Content (Join-Path $Directory "config.json") -Encoding UTF8 -NoNewline
    Set-Content (Join-Path $Directory "registration.token") -Value $Token -Encoding UTF8 -NoNewline
}

$token = Get-RegistrationToken
$msiPath = Get-InstallerMsi

# Added for today's requirement:
# Extract the actual version from the MSI filename.
$agentVersion = Get-AgentVersion -MsiPath $msiPath

Write-Host "Installing Kuamini Security Client v$agentVersion" -ForegroundColor Green

$agentId = [guid]::NewGuid().ToString()

try {
    Write-AgentConfig `
        -Directory $userConfigDirectory `
        -Token $token `
        -AgentId $agentId `
        -AgentVersion $agentVersion

    Write-AgentConfig `
        -Directory $serviceConfigDirectory `
        -Token $token `
        -AgentId $agentId `
        -AgentVersion $agentVersion
} catch {
    Stop-Install "Unable to write agent configuration: $($_.Exception.Message)"
}

$msiLog = Join-Path $env:TEMP "kuamini-install-$([guid]::NewGuid()).log"
$msiArguments = @("/i", "`"$msiPath`"", "REGISTRATIONTOKEN=`"$token`"", "/passive", "/norestart", "/L*V", "`"$msiLog`"")
$process = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArguments -PassThru -Wait
if ($process.ExitCode -notin @(0, 3010)) {
    if (Test-Path $msiLog) {
        Write-Host "--- MSI Installation Error Log (Tail 30 lines) ---" -ForegroundColor Yellow
        Get-Content $msiLog -Tail 30 | Write-Host
    }
    Stop-Install "MSI installation failed with exit code $($process.ExitCode). See log at $msiLog"
}

$agentExe = Join-Path $installPath "KuaminiSecurityClient.exe"
if (-not (Test-Path $agentExe)) {
    Stop-Install "Installed agent executable was not found at $agentExe"
}

$service = Get-Service -Name "KuaminiSecurityClient" -ErrorAction SilentlyContinue
if (-not $service) {
    Stop-Install "The Kuamini Windows service was not installed. This installer package is outdated."
}

Start-Service -Name "KuaminiSecurityClient" -ErrorAction SilentlyContinue
Start-Process -FilePath $agentExe -ErrorAction Stop
Write-Host "Kuamini service and tray client started successfully." -ForegroundColor Green