# Kuamini Security Client v1.0.27 - Windows Agent Package Building Guide

## Overview
This guide explains how to build the Windows installer package (KuaminiSecurityClient-1.0.27-windows.zip) that includes all fixes for:
1. ✅ Installation failures (v1.0.26)
2. ✅ Registration failures
3. ✅ Threat reporting to dashboard

## Prerequisites

```bash
# Install build dependencies
pip install -r agent-tray/requirements.txt
pip install pyinstaller>=5.10.0

# Windows specific
choco install wix311  # For MSI creation (or download from https://github.com/wixtoolset/wix3/releases)
```

## Build Steps

### Step 1: Build PyInstaller Executable

```powershell
cd agent-tray
pyinstaller --name KuaminiSecurityClient `
    --onefile `
    --windowed `
    --icon icon.ico `
    --add-data "threat_detection:threat_detection" `
    --collect-all pystray `
    --collect-all PIL `
    main.py

# Output: dist/KuaminiSecurityClient.exe
```

### Step 2: Create MSI Installer

Use WiX Toolset to create MSI from PyInstaller output:

```bash
# Create WiX source file (KuaminiSecurityClient.wxs)
# Reference: public/tray/KuaminiSecurityClient.wxs

# Build MSI
candle.exe -o build\ KuaminiSecurityClient.wxs
light.exe -o KuaminiSecurityClient-1.0.27.msi build\*.wixobj
```

**Key MSI Features:**
- Installs to: `C:\Program Files\Kuamini Security Client\`
- Creates config directory: `%LOCALAPPDATA%\KuaminiSecurityClient\`
- Accepts `REGISTRATIONTOKEN` parameter
- Sets up Windows autostart
- Creates uninstall entry

### Step 3: Assemble Windows Package

```bash
# Create package directory structure
mkdir KuaminiSecurityClient-1.0.27-windows

# Copy files
copy KuaminiSecurityClient-1.0.27.msi KuaminiSecurityClient-1.0.27-windows/
copy public/tray/install-windows.cmd KuaminiSecurityClient-1.0.27-windows/
copy public/tray/install-helper.ps1 KuaminiSecurityClient-1.0.27-windows/
copy public/tray/uninstall-windows.cmd KuaminiSecurityClient-1.0.27-windows/
copy public/tray/uninstall-kuamini-windows.ps1 KuaminiSecurityClient-1.0.27-windows/
copy README.txt KuaminiSecurityClient-1.0.27-windows/

# IMPORTANT: Add registration.token (generated per account at download time)
# This file should be generated when user downloads from https://kuaminisystems.com/securityAgent/installers/{account_id}
# Format: Valid JWT token with accountId in payload
echo "GENERATED_TOKEN_HERE" > KuaminiSecurityClient-1.0.27-windows/registration.token

# Create ZIP
7z a -tzip KuaminiSecurityClient-1.0.27-windows.zip KuaminiSecurityClient-1.0.27-windows/
```

## Automated Build Script

Create `build_windows_package.ps1`:

```powershell
param(
    [string]$RegistrationToken,  # Token generated per account at download time
    [string]$Version = "1.0.27"
)

Write-Host "Building Kuamini Security Client v$Version for Windows..."

# Build PyInstaller executable
Write-Host "[1/3] Building executable with PyInstaller..."
cd agent-tray
pyinstaller --name KuaminiSecurityClient `
    --onefile --windowed `
    --icon icon.ico `
    --add-data "threat_detection:threat_detection" `
    --collect-all pystray `
    --collect-all PIL `
    main.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "PyInstaller build failed!"
    exit 1
}

cd ..

# Build MSI (assuming WiX is installed)
Write-Host "[2/3] Building MSI installer with WiX..."
candle.exe -o build\ public/tray/KuaminiSecurityClient.wxs
light.exe -o KuaminiSecurityClient-$Version.msi build\*.wixobj

if ($LASTEXITCODE -ne 0) {
    Write-Host "MSI build failed!"
    exit 1
}

# Assemble package
Write-Host "[3/3] Assembling package..."
$pkgDir = "KuaminiSecurityClient-$Version-windows"
Remove-Item -Path $pkgDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $pkgDir | Out-Null

Copy-Item "KuaminiSecurityClient-$Version.msi" "$pkgDir/"
Copy-Item "public/tray/install-windows.cmd" "$pkgDir/"
Copy-Item "public/tray/install-helper.ps1" "$pkgDir/"
Copy-Item "public/tray/uninstall-windows.cmd" "$pkgDir/"
Copy-Item "public/tray/uninstall-kuamini-windows.ps1" "$pkgDir/"
Copy-Item "README.txt" "$pkgDir/"

# Add registration token
if (-not [string]::IsNullOrEmpty($RegistrationToken)) {
    Set-Content -Path "$pkgDir/registration.token" -Value $RegistrationToken -Encoding UTF8 -NoNewline
}

# Create ZIP
7z a -tzip "KuaminiSecurityClient-$Version-windows.zip" $pkgDir

Write-Host ""
Write-Host "✓ Package created: KuaminiSecurityClient-$Version-windows.zip"
Write-Host ""
```

## Server-Side Integration

The server must generate the `registration.token` when user downloads installer:

```python
# Example: Flask route at /securityAgent/installers/{account_id}
@app.route('/securityAgent/installers/<account_id>')
def download_installer(account_id):
    # Verify account exists and user is authorized
    
    # Generate JWT token with account details
    token_payload = {
        'accountId': account_id,
        'agentVersion': '1.0.27',
        'timestamp': datetime.utcnow().isoformat(),
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    token = jwt.encode(token_payload, SECRET_KEY, algorithm='HS256')
    
    # Create temporary ZIP with embedded token
    # ... include registration.token file with above token
    
    # Return ZIP as download
```

## Testing Installation

```powershell
# Extract package
Expand-Archive -Path KuaminiSecurityClient-1.0.27-windows.zip -DestinationPath test-install

# Run installer
cd test-install
.\install-windows.cmd

# Verify installation
Get-Process KuaminiSecurityClient
Get-Content "$env:LOCALAPPDATA\KuaminiSecurityClient\agent.log" -Tail 20
```

## Troubleshooting

### Token Not Found
- ❌ Problem: `ERROR: No valid registration token found!`
- ✅ Solution: Ensure `registration.token` is in package directory and contains valid JWT

### MSI Installation Failed
- ❌ Problem: `MSI installation failed with exit code: 1603`
- ✅ Solution: Check `%TEMP%\kuamini-install-*.log` for detailed error

### Agent Won't Start
- ❌ Problem: Agent doesn't appear in tray or process list
- ✅ Solution: Check `%LOCALAPPDATA%\KuaminiSecurityClient\agent.log`

## Version History

### v1.0.27 (Current - Fixed)
- ✅ Enhanced token validation in installer
- ✅ Proper token embedding in MSI
- ✅ Account ID derivation from JWT
- ✅ Multiple fallback token locations
- ✅ Threat reporting with account validation
- ✅ Auto-registration at startup

### v1.0.26 (Previous - Broken)
- ❌ Installation failed without clear token validation
- ❌ Registration didn't properly use token
- ❌ Threat reporting failed due to missing account_id

## Package Contents

```
KuaminiSecurityClient-1.0.27-windows.zip
├── KuaminiSecurityClient-1.0.27.msi (Main installer)
├── registration.token (Generated per account at download time)
├── install-windows.cmd (Wrapper script)
├── install-helper.ps1 (Enhanced installer logic)
├── uninstall-windows.cmd (Uninstall wrapper)
├── uninstall-kuamini-windows.ps1 (Enhanced uninstaller)
└── README.txt (Installation instructions)
```
