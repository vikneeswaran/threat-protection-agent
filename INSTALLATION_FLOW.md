# Kuamini Security Client v1.0.27 - Installation & Registration Flow

## Complete Flow Diagram

```
User Downloads from Dashboard
        ↓
https://kuaminisystems.com/securityAgent/installers/{account_id}
        ↓
Server generates JWT token with accountId
        ↓
Server creates ZIP with:
  - KuaminiSecurityClient-1.0.27.msi
  - registration.token (JWT with accountId)
  - install-windows.cmd
  - install-helper.ps1
        ↓
User runs install-windows.cmd
        ↓
install-windows.cmd calls install-helper.ps1
        ↓
install-helper.ps1 validates registration.token:
  ✓ File exists
  ✓ Length > 50 chars
  ✓ Not "placeholder-token"
        ↓
install-helper.ps1 passes token to MSI via REGISTRATIONTOKEN parameter
        ↓
MSI installs to C:\Program Files\Kuamini Security Client\
        ↓
MSI creates config dir: %LOCALAPPDATA%\KuaminiSecurityClient\
        ↓
Agent (main.py) starts automatically
        ↓
main.py loads config and token:
  1. Checks %LOCALAPPDATA%\KuaminiSecurityClient\config.json
  2. If missing, creates default with:
     - agent_id: UUID (generated)
     - registration_token: from registration.token file
     - account_id: decoded from JWT token
        ↓
Agent calls register() endpoint:
  POST /api/securityagent/agent/register
  Payload:
  {
    "installationToken": "[JWT token]",
    "installerVersion": "1.0.27",
    "platform": "Windows"
  }
        ↓
Server validates token and returns:
  {
    "installation_instance_id": "[UUID]",
    "endpoint_id": "[UUID]",
    "account_id": "[account UUID]"
  }
        ↓
Agent persists IDs to config.json
        ↓
Agent sends heartbeat:
  POST /api/securityagent/agent/heartbeat
  Payload:
  {
    "installationInstanceId": "[UUID]",
    "agentId": "[UUID]",
    "hostname": "[computer name]",
    "os": "windows",
    "osVersion": "[version]"
  }
        ↓
Dashboard shows new endpoint
        ↓
Agent starts threat scanning
        ↓
When threats detected:
  POST /api/securityagent/agent/threat
  Payload:
  {
    "agent_id": "[UUID]",
    "account_id": "[account UUID]",
    "threat_name": "[threat]",
    "severity": "high",
    "file_path": "[path]",
    "detected_at": "[timestamp]"
  }
        ↓
Dashboard displays threats in real-time
```

## Key Fixes in v1.0.27

### Fix #1: Token Validation in Installer
**Before (v1.0.26):**
```powershell
# Would fail silently if token was missing or empty
$token = Get-Content $tokenPath -Raw
if (-not $token) { exit 1 }
```

**After (v1.0.27):**
```powershell
# Validates token before install
if ($content -and $content.Trim().Length -gt 50 -and $content.Trim() -ne "placeholder-token") {
    $tokenContent = $content.Trim()
    # Pass to MSI
}
```

### Fix #2: Account ID Derivation from JWT
**Before (v1.0.26):**
```python
# account_id was never populated
if not cfg.get("account_id"):
    # No logic to extract from token
    pass
```

**After (v1.0.27):**
```python
def _decode_account_id_from_token(token: str | None) -> str | None:
    # Decodes JWT payload and extracts accountId
    # Tries multiple formats and positions
    # Returns account_id for threat reporting
    
if not config.get("account_id") and config.get("registration_token"):
    derived = _decode_account_id_from_token(config.get("registration_token"))
    if derived:
        config["account_id"] = derived
```

### Fix #3: Threat Reporting with Account ID
**Before (v1.0.26):**
```python
payload = {
    "agent_id": self.agent_id,
    "account_id": None,  # ← EMPTY!
    "threat_name": threat.get("threat_name"),
    # ...
}
# Server rejects: account_id is required
```

**After (v1.0.27):**
```python
# In ThreatReporter.__init__
if not account_id and registration_token:
    account_id = _decode_account_id_from_token(registration_token)

# account_id is now always populated
payload = {
    "agent_id": self.agent_id,
    "account_id": self.account_id,  # ← NOW POPULATED
    "threat_name": threat.get("threat_name"),
}
```

## File Token Locations (Priority Order)

The agent searches for registration token in this order:

1. **Installation Directory**
   - `C:\Program Files\Kuamini Security Client\registration.token`

2. **Config Directory** (Backup by installer)
   - `%LOCALAPPDATA%\KuaminiSecurityClient\registration.token`

3. **Environment Variable**
   - `$env:REGISTRATION_TOKEN`

4. **Search Paths**
   - `%USERPROFILE%\Downloads\registration.token`
   - `%USERPROFILE%\Desktop\registration.token`
   - Current working directory

## Config File Format

Located at: `%LOCALAPPDATA%\KuaminiSecurityClient\config.json`

```json
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "account_id": "330e8400-e29b-41d4-a716-446655440001",
  "installation_instance_id": "770e8400-e29b-41d4-a716-446655440002",
  "endpoint_id": "880e8400-e29b-41d4-a716-446655440003",
  "registration_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "api_base": "https://kuaminisystems.com/api/securityagent/agent",
  "console_url": "https://kuaminisystems.com/securityAgent",
  "auto_register": true,
  "heartbeat_interval": 60
}
```

## Token Format (JWT)

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "accountId": "330e8400-e29b-41d4-a716-446655440001",
  "agentVersion": "1.0.27",
  "timestamp": "2026-03-11T10:00:00Z",
  "exp": "2026-03-12T10:00:00Z"
}
```

**Signature:**
```
HMAC-SHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

## Verification Checklist

After installation, verify:

- [ ] Agent process running: `Get-Process KuaminiSecurityClient`
- [ ] Config file created: `%LOCALAPPDATA%\KuaminiSecurityClient\config.json`
- [ ] agent_id populated (UUID format)
- [ ] account_id populated (decoded from token)
- [ ] installation_instance_id populated (returned from server)
- [ ] Agent log created: `%LOCALAPPDATA%\KuaminiSecurityClient\agent.log`
- [ ] Tray icon visible in system tray
- [ ] Endpoint appears in dashboard
- [ ] Heartbeat messages in log: `"Heartbeat successful"`
- [ ] Threat scan started: `"Starting threat scan"`
- [ ] Threats reported: `"Threat reported successfully"`

## Troubleshooting

### Issue: "No valid registration token found!"
```
Cause: registration.token missing from installer package
Solution: Regenerate package with token from https://kuaminisystems.com/securityAgent/installers/{account_id}
```

### Issue: "Account ID missing from registration token"
```
Cause: Token doesn't have accountId in JWT payload
Solution: Verify token format and regenerate from server
```

### Issue: "Threat reporting failed (HTTP 400)"
```
Cause: account_id is empty/null in threat payload
Solution: Check config.json for account_id; may need to re-register
```

### Issue: "Auto-registration failed"
```
Cause: Token invalid or API endpoint unreachable
Solution: Check agent.log for detailed error; restart agent
```

## API Endpoints Used

### 1. Register
```
POST /api/securityagent/agent/register
Body: {
  "installationToken": "JWT token",
  "installerVersion": "1.0.27",
  "platform": "Windows"
}
Response: {
  "installation_instance_id": "UUID",
  "endpoint_id": "UUID",
  "account_id": "UUID"
}
```

### 2. Heartbeat
```
POST /api/securityagent/agent/heartbeat
Body: {
  "installationInstanceId": "UUID",
  "agentId": "UUID",
  "hostname": "computer-name",
  "os": "windows",
  "osVersion": "10.0.19045"
}
```

### 3. Report Threat
```
POST /api/securityagent/agent/threat
Body: {
  "agent_id": "UUID",
  "account_id": "UUID",
  "threat_name": "Trojan.Generic",
  "severity": "high",
  "file_path": "C:\\path\\to\\file.exe",
  "detected_at": "2026-03-11T10:00:00Z"
}
```

### 4. Report Scan Summary
```
POST /api/securityagent/agent/scan-summary
Body: {
  "agent_id": "UUID",
  "account_id": "UUID",
  "scan_id": "UUID",
  "scan_type": "quick",
  "total_threats": 5,
  "severity_breakdown": {
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 0
  }
}
```

## Timeline for v1.0.27 Release

| Phase | Timeline | Action |
|-------|----------|--------|
| Build | Now | Create MSI with all fixes |
| Package | Today | Assemble Windows/Linux/macOS packages |
| Test | Tomorrow | Test installation on clean VM |
| Deploy | Week | Roll out to production |
| Notify | Week | Notify users to upgrade |

