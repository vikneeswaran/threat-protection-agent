# threat-protection-agent

Standalone repository for Kuamini endpoint agent development and packaging.

## Included
- `agent-tray/` (core Python tray agent + threat detection module)
- `.github/workflows/build-agents.yml` (agent build pipeline)
- `public/tray/` (installer scripts and built artifacts currently published)
- Agent troubleshooting and code-signing docs/scripts

## Local setup
1. `cd agent-tray`
2. `python3 -m venv .venv && source .venv/bin/activate` (macOS/Linux)
3. `pip install -r requirements.txt`
4. Run agent locally: `python main.py`

## Build
- Windows: `agent-tray/build/build-windows-msi.ps1`
- macOS: `agent-tray/build/pkgbuild-mac.sh`
- Linux: `pyinstaller main.py --onedir --name=KuaminiSecurityClient`
