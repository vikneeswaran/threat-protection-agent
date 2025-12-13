#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d "dist/kuamini-agent-tray" ]; then
  echo "dist/kuamini-agent-tray not found. Run pyinstaller-linux.sh first." >&2
  exit 1
fi

cd dist
zip -r linux.zip kuamini-agent-tray
echo "Created: dist/linux.zip"
