; Inno Setup script template for Kuamini Agent Tray (unsigned)
; Build with: iscc inno-setup-template.iss

[Setup]
AppName=Kuamini Agent Tray
AppVersion=1.0.0
DefaultDirName={pf}\Kuamini\Tray
DefaultGroupName=Kuamini
OutputBaseFilename=KuaminiAgentTray-Setup
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\KuaminiAgentTray.exe

[Files]
Source: "dist\KuaminiAgentTray\*"; DestDir: "{app}"; Flags: recursesubdirs
Source: "config.example.json"; DestDir: "{app}"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\Kuamini Agent Tray"; Filename: "{app}\KuaminiAgentTray.exe"
Name: "{commondesktop}\Kuamini Agent Tray"; Filename: "{app}\KuaminiAgentTray.exe"

[Run]
Filename: "{app}\KuaminiAgentTray.exe"; Description: "Launch Kuamini Agent Tray"; Flags: postinstall nowait skipifsilent
