#!/usr/bin/env bash
# Build all tray bundles and create zip archives
set -euo pipefail

echo "========================================"
echo "Building Kuamini Tray Agent Bundles"
echo "========================================"

cd "$(dirname "$0")"

echo ""
echo "[1/3] Building macOS bundle..."
if [ "$(uname)" == "Darwin" ]; then
  ./pyinstaller-mac.sh
  ./zip-mac.sh
else
  echo "Skipping macOS build (not on macOS)"
fi

echo ""
echo "[2/3] Building Linux bundle..."
if [ "$(uname)" == "Linux" ]; then
  ./pyinstaller-linux.sh
  ./zip-linux.sh
else
  echo "Skipping Linux build (not on Linux)"
fi

echo ""
echo "[3/3] Windows bundle..."
echo "Run pyinstaller-win.ps1 and zip-win.ps1 on Windows to build Windows bundle"

echo ""
echo "========================================"
echo "Build Complete!"
echo "========================================"
echo ""
echo "Bundles created in agent-tray/dist/:"
ls -lh ../dist/*.zip 2>/dev/null || echo "No zip files found yet"

echo ""
echo "Copying built bundles into public/tray for static hosting..."
mkdir -p ../public/tray
for file in macos.zip linux.zip windows.zip; do
  if [ -f "../dist/$file" ]; then
    cp "../dist/$file" "../public/tray/$file"
    echo "Copied $file -> public/tray/$file"
  else
    echo "Skipping $file (not built on this platform)"
  fi
done
