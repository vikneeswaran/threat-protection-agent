-- ============================================
-- TRIGGERS FOR AUTOMATIC OPERATIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trigger_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_endpoints_updated_at
  BEFORE UPDATE ON endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_threats_updated_at
  BEFORE UPDATE ON threats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_account_settings_updated_at
  BEFORE UPDATE ON account_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Auto-update endpoint used_licenses count
-- ============================================
CREATE OR REPLACE FUNCTION update_account_used_licenses()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE accounts SET used_licenses = used_licenses + 1 WHERE id = NEW.account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE accounts SET used_licenses = used_licenses - 1 WHERE id = OLD.account_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_endpoint_license_count
  AFTER INSERT OR DELETE ON endpoints
  FOR EACH ROW EXECUTE FUNCTION update_account_used_licenses();

-- ============================================
-- Auto-create account settings on account creation
-- ============================================
CREATE OR REPLACE FUNCTION create_default_account_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO account_settings (account_id, settings)
  VALUES (NEW.id, '{
    "theme": "dark",
    "notifications_enabled": true,
    "email_alerts": true,
    "auto_quarantine": false,
    "scan_schedule": "daily"
  }'::jsonb)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_account_settings
  AFTER INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION create_default_account_settings();
