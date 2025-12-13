#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d "dist/KuaminiAgentTray.app" ]; then
  echo "dist/KuaminiAgentTray.app not found. Run pyinstaller-mac.sh first." >&2
  exit 1
fi

cd dist
zip -r macos.zip KuaminiAgentTray.app
echo "Created: dist/macos.zip"
