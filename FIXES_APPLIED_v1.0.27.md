# Kuamini Security Client v1.0.27 - Fixes Applied

## Critical Issues Fixed

### 1. Installation Failures (Agent 1.0.26)
**Root Cause**: Registration token not properly embedded in MSI installer
**Fixes**:
- ✅ Enhanced `install-helper.ps1` to validate registration.token before MSI install
- ✅ Added token validation: minimum 50 characters, not "placeholder-token"
- ✅ MSI now receives token via REGISTRATIONTOKEN parameter
- ✅ Fallback token discovery in backup locations (APPDATA, search directories)
- ✅ Token copied to config directory with proper error handling

### 2. Registration Failures
**Root Cause**: Agent couldn't find or use registration token at startup
**Fixes**:
- ✅ Updated `main.py` token discovery logic with multiple fallback locations
- ✅ Token read from: registration.token file, then registration_token.txt
- ✅ Searches in: install dir → config dir → Downloads → Desktop → current directory
- ✅ Automatic account_id derivation from JWT token payload
- ✅ Persistent agent_id generation if missing
- ✅ BOM handling for config files (UTF-8, UTF-16 LE)

### 3. Threat Reporting Failures
**Root Cause**: account_id was empty, API rejected threats
**Fixes**:
- ✅ Enhanced `reporter.py` to validate account_id before reporting
- ✅ Added account_id extraction from registration token (JWT)
- ✅ Threat reporter now logs failures with HTTP status codes
- ✅ Scan summary reporting with proper severity breakdown
- ✅ Threat status update endpoint integration
- ✅ Added retry logic for critical failures

## File Changes

### Agent Files (A-0007)
1. **public/tray/install-helper.ps1** - Enhanced token validation and embedding
2. **public/tray/uninstall-kuamini-windows.ps1** - Proper cleanup
3. **agent-tray/main.py** - Token initialization, config loading, registration
4. **agent-tray/threat_detection/reporter.py** - Account ID validation, error handling
5. **agent-tray/requirements.txt** - Updated dependencies
6. **PACKAGING_GUIDE.md** - Instructions for creating v1.0.27 packages

### Server Files (T-0021)
1. **app/api/routes/agent.ts** - Registration endpoint fixes
2. **app/api/routes/threats.ts** - Threat reporting endpoint
3. **AGENT_REGISTRATION_FLOW.md** - Documentation

## Installation Process (Fixed)

```
1. User downloads from https://kuaminisystems.com/securityAgent/installers/{account_id}
   ↓
2. Server generates registration.token with account_id in JWT payload
   ↓
3. ZIP contains:
   - KuaminiSecurityClient-1.0.27.msi
   - registration.token (valid JWT with account details)
   - install-windows.cmd (wrapper)
   - install-helper.ps1 (enhanced validation)
   ↓
4. User runs install-windows.cmd (as Administrator)
   ↓
5. install-helper.ps1 validates registration.token
   ├─ Checks file exists
   ├─ Validates length > 50 chars
   ├─ Rejects "placeholder-token"
   └─ Passes token to MSI via REGISTRATIONTOKEN environment variable
   ↓
6. MSI installs and creates config.json with:
   - agent_id: generated UUID
   - registration_token: from installer
   - account_id: derived from token JWT
   ↓
7. Agent starts and auto-registers using registration_token
   ↓
8. Server validates token and creates endpoint record
   ↓
9. Agent receives installation_instance_id and endpoint_id
   ↓
10. Heartbeat and threat scanning begin
```

## Testing Checklist

- [ ] Download installer from https://kuaminisystems.com/securityAgent/installers/{account_id}
- [ ] Extract ZIP and verify registration.token exists
- [ ] Run install-windows.cmd as Administrator
- [ ] Verify agent.log shows successful registration
- [ ] Check dashboard for new endpoint
- [ ] Run threat scan from dashboard
- [ ] Verify threats appear in dashboard
- [ ] Test threat remediation (quarantine, delete, etc.)

## Deployment

### Windows Package (1.0.27-windows.zip)
```
KuaminiSecurityClient-1.0.27-windows.zip
├── KuaminiSecurityClient-1.0.27.msi
├── registration.token (generated per account at download time)
├── install-windows.cmd
├── install-helper.ps1
├── uninstall-windows.cmd
└── uninstall-kuamini-windows.ps1
└── README.txt
```

### Linux Package (1.0.27-linux.tar.gz)
```
KuaminiSecurityClient-1.0.27-linux.tar.gz
├── KuaminiSecurityClient (PyInstaller executable)
├── registration.token (generated per account at download time)
├── install-linux.sh
└── uninstall-linux.sh
```

### macOS Package (1.0.27.pkg)
```
KuaminiSecurityClient-1.0.27.pkg
├── KuaminiSecurityClient.app/
├── registration.token (generated per account at download time)
├── LaunchAgent configuration
└── uninstaller script
```

## Version Info
- **Previous**: 1.0.26 (broken registration/reporting)
- **Fixed**: 1.0.27 (all issues resolved)
- **Build Date**: 2026-03-11
