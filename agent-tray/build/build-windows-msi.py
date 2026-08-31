#!/usr/bin/env python3
"""
Build Windows MSI installer for Kuamini Security Client.
This script runs PyInstaller to freeze the Python code, then invokes
the WiX toolset to create the MSI package.
"""

import os
import sys
import subprocess
import shutil
import re
from pathlib import Path
import zipfile


def run_command(cmd, description):
    """Run a shell command and handle errors."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(cmd)}\n")
    
    result = subprocess.run(cmd, shell=False)
    if result.returncode != 0:
        print(f"\n[ERROR] {description} failed with exit code {result.returncode}")
        sys.exit(1)
    
    print(f"[SUCCESS] {description} completed successfully")
    return result

def main():
    """Main build process."""

    # Determine paths
    script_dir = Path(__file__).parent
    agent_dir = script_dir.parent
    project_root = agent_dir.parent

    # Change to agent-tray directory
    os.chdir(agent_dir)

    # Get build version from environment
    version = os.environ.get("VERSION")
    if not version:
        print("[ERROR] VERSION environment variable not set. Aborting.")
        sys.exit(1)

    # Convert build version to Windows four-part version format.
    # Example: 1.0.28 -> 1.0.28.0
    version_parts = version.split(".")

    if len(version_parts) == 3:
        windows_version = f"{version}.0"
    elif len(version_parts) == 4:
        windows_version = version
    else:
        print(f"[ERROR] Invalid VERSION format: {version}")
        print(
            "[ERROR] Expected format: "
            "major.minor.build or major.minor.build.revision"
        )
        sys.exit(1)

    print(f"[INFO] Build version: {version}")
    print(f"[INFO] Windows EXE version: {windows_version}")

    print(f"""
{'='*60}
Building Kuamini Security Client for Windows
Python Version: {sys.version.split()[0]}
Build Directory: {str(agent_dir)}
Target Version: {version}
{'='*60}
""")

    # Step 1: Clean old build artifacts
    print("Cleaning old build artifacts...")

    dist_dir = agent_dir / "dist" / "KuaminiSecurityClient"

    if dist_dir.exists():
        shutil.rmtree(dist_dir, ignore_errors=True)
        print(f"  Removed: {dist_dir}")

    # Step 2: Generate PyInstaller EXE version file dynamically
    version_file = agent_dir / "version_info.txt"

    version_numbers = ",".join(windows_version.split("."))

    version_file_content = f"""VSVersionInfo(
  ffi=FixedFileInfo(
    filevers=({version_numbers}),
    prodvers=({version_numbers}),
    mask=0x3f,
    flags=0x0,
    OS=0x40004,
    fileType=0x1,
    subtype=0x0,
    date=(0,0)
  ),
  kids=[
    StringFileInfo(
      [
        StringTable(
          '040904B0',
          [
            StringStruct('CompanyName', 'Kuamini Systems Private Limited'),
            StringStruct('FileDescription', 'Kuamini Security Client'),
            StringStruct('FileVersion', '{windows_version}'),
            StringStruct('InternalName', 'KuaminiSecurityClient'),
            StringStruct('OriginalFilename', 'KuaminiSecurityClient.exe'),
            StringStruct('ProductName', 'Kuamini Security Client'),
            StringStruct('ProductVersion', '{windows_version}')
          ]
        )
      ]
    ),
    VarFileInfo([VarStruct('Translation', [1033, 1200])])
  ]
)
"""

    version_file.write_text(version_file_content, encoding="utf-8")

    print(
        f"[SUCCESS] Generated EXE version info: "
        f"{windows_version}"
    )

    # Step 3: Run PyInstaller
    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", "KuaminiSecurityClient",
        "--onedir",
        "--windowed",
        "--version-file", str(version_file),
        "--distpath", str(agent_dir / "dist"),
        "--workpath", str(agent_dir / "build" / "pyinstaller"),
        "--specpath", str(script_dir),

        # Include tray status icons in the packaged application
        "--add-data", str(agent_dir / "icon-green.png") + ";.",
        "--add-data", str(agent_dir / "icon-yellow.png") + ";.",
        "--add-data", str(agent_dir / "icon-red.png") + ";.",

        str(agent_dir / "main.py")
    ]

    run_command(
        pyinstaller_cmd,
        "PyInstaller (freeze Python code)"
    )

    # Verify EXE was created
    exe_path = (
        agent_dir /
        "dist" /
        "KuaminiSecurityClient" /
        "KuaminiSecurityClient.exe"
    )

    if not exe_path.exists():
        print(
            f"\n[ERROR] Expected EXE not found at {exe_path}"
        )
        sys.exit(1)

    print(f"[SUCCESS] EXE created: {exe_path}")

    # Step 4: Run WiX MSI build via PowerShell
    ps_script = script_dir / "build-windows-msi.ps1"

    if not ps_script.exists():
        print(
            f"\n[ERROR] PowerShell build script "
            f"not found at {ps_script}"
        )
        sys.exit(1)

    powershell_cmd = [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", str(ps_script),
        "-Version", version
    ]

    run_command(
        powershell_cmd,
        "WiX MSI Build"
    )

    # Step 5: Verify MSI was created
    msi_path = (
        agent_dir /
        "dist" /
        f"KuaminiSecurityClient-{version}.msi"
    )

    if not msi_path.exists():
        print(f"\n[ERROR] MSI not found at {msi_path}")
        sys.exit(1)

    print(f"\n[SUCCESS] MSI created: {msi_path}")

    # Step 6: Create Windows installer ZIP for distribution
    zip_path = (
        project_root /
        "public" /
        "tray" /
        f"KuaminiSecurityClient-{version}-windows.zip"
    )

    zip_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with zipfile.ZipFile(
        zip_path,
        "w",
        zipfile.ZIP_DEFLATED
    ) as zf:
        zf.write(
            msi_path,
            arcname=f"KuaminiSecurityClient-{version}.msi"
        )

    print(
        f"[SUCCESS] ZIP bundle created: {zip_path}"
    )

    print(f"""
{'='*60}
BUILD COMPLETED SUCCESSFULLY!

MSI: {msi_path.name}
ZIP: {zip_path.name}
{'='*60}
""")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n[ERROR] Build failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
