#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Use python3 instead of python
python3 -m PyInstaller \
  --noconfirm \
  --onedir \
  --windowed \
  --name KuaminiAgentTray \
  --osx-bundle-identifier com.kuamini.agenttray \
  main.py

echo "Built: dist/KuaminiAgentTray.app"
