# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\vigne\\THREAT-PROTECTION-AGENT\\threat-protection-agent\\agent-tray\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\vigne\\THREAT-PROTECTION-AGENT\\threat-protection-agent\\agent-tray\\icon-green.png', '.'), ('C:\\Users\\vigne\\THREAT-PROTECTION-AGENT\\threat-protection-agent\\agent-tray\\icon-yellow.png', '.'), ('C:\\Users\\vigne\\THREAT-PROTECTION-AGENT\\threat-protection-agent\\agent-tray\\icon-red.png', '.')],
    hiddenimports=['agent_service', 'threat_detection', 'threat_detection.engine', 'threat_detection.process_monitor', 'threat_detection.reporter', 'threat_detection.scanner', 'threat_detection.signatures', 'win32event', 'win32service', 'win32serviceutil'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='KuaminiSecurityClient',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version='C:\\Users\\vigne\\THREAT-PROTECTION-AGENT\\threat-protection-agent\\agent-tray\\build\\version_info.generated.txt',
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='KuaminiSecurityClient',
)
