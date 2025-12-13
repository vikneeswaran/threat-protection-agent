# Kuamini Agent Tray - Build Instructions

This directory contains build scripts to create OS-specific system tray agents.

## Prerequisites

- Python 3.10+
- PyInstaller
- OS-specific tools:
  - macOS: Xcode Command Line Tools, `pkgbuild`
  - Linux: `zip`, standard build tools
  - Windows: PowerShell, optionally Inno Setup

## Quick Start

### macOS

```bash
cd agent-tray/build
./pyinstaller-mac.sh    # Build .app bundle
./zip-mac.sh            # Create macos.zip
./pkgbuild-mac.sh       # Optional: create .pkg installer
```

Output: `dist/macos.zip`, `dist/KuaminiAgentTray-1.0.0.pkg`

### Linux

```bash
cd agent-tray/build
./pyinstaller-linux.sh  # Build binary
./zip-linux.sh          # Create linux.zip
```

Output: `dist/linux.zip`

### Windows

```powershell
cd agent-tray\build
.\pyinstaller-win.ps1   # Build EXE bundle
.\zip-win.ps1           # Create windows.zip
```

Output: `dist\windows.zip`

Optional: Use Inno Setup with `inno-setup-template.iss` to create a full installer.

## Build All (Unix)

```bash
cd agent-tray/build
./build-all.sh
```

This will build macOS and Linux bundles if run on the respective platforms.

## Deployment

1. Build the bundles on each platform
2. Copy the resulting zip files into `public/tray/` **before** deploying the Next.js app (build-all.sh will attempt this for macOS/Linux)
  - `public/tray/macos.zip`
  - `public/tray/linux.zip`
  - `public/tray/windows.zip`
3. After deploy, the bundles are served statically at `/tray/{macos|linux|windows}.zip`
4. Installer scripts auto-download from these static URLs

## Code Signing (Optional)

To avoid OS warnings:

- macOS: Sign with `codesign --sign "Developer ID Application: YourName" dist/KuaminiAgentTray.app`
- Windows: Sign with `signtool` using an Authenticode certificate
- Linux: GPG-sign your packages (optional)

## Directory Structure

```
build/
├── pyinstaller-mac.sh          # macOS PyInstaller build
├── pkgbuild-mac.sh             # macOS .pkg creator
├── zip-mac.sh                  # Zip macOS bundle
├── pyinstaller-linux.sh        # Linux PyInstaller build
├── zip-linux.sh                # Zip Linux bundle
├── pyinstaller-win.ps1         # Windows PyInstaller build
├── zip-win.ps1                 # Zip Windows bundle
├── inno-setup-template.iss     # Inno Setup installer template
├── build-all.sh                # Build all platforms
└── autostart/                  # Autostart templates
    ├── macos/
    ├── linux/
    └── windows/
```

## Troubleshooting

- **"dist not found"**: Run the PyInstaller script first
- **PyInstaller errors**: Ensure all dependencies in `requirements.txt` are installed
- **Permission denied**: Make scripts executable with `chmod +x *.sh`
- **Windows build issues**: Run PowerShell as Administrator
