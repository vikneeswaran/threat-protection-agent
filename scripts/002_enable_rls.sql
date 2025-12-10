-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Helper function to get user's account_id
CREATE OR REPLACE FUNCTION get_user_account_id()
RETURNS UUID AS $$
  SELECT account_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(required_roles user_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = ANY(required_roles)
    AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get all descendant account IDs (for parent accounts to see children)
CREATE OR REPLACE FUNCTION get_descendant_accounts(parent_id UUID)
RETURNS TABLE(account_id UUID) AS $$
  WITH RECURSIVE descendants AS (
    SELECT id FROM accounts WHERE id = parent_id
    UNION ALL
    SELECT a.id FROM accounts a
    INNER JOIN descendants d ON a.parent_account_id = d.id
  )
  SELECT id FROM descendants;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- ACCOUNTS RLS
-- ============================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own account and descendant accounts
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (
  id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

-- Only super_admin/admin can update their account
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (
  id = get_user_account_id() 
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

-- Only super_admin can create sub-accounts
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (
  parent_account_id = get_user_account_id()
  AND user_has_role(ARRAY['super_admin']::user_role[])
);

-- ============================================
-- PROFILES RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view profiles in their account tree
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (
  id = auth.uid()
);

-- Super_admin/admin can update profiles in their account
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (
  account_id = get_user_account_id()
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

-- Super_admin can create admins, admin can create operators/viewers
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  account_id = get_user_account_id()
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

-- ============================================
-- ENDPOINTS RLS
-- ============================================
ALTER TABLE endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "endpoints_select" ON endpoints FOR SELECT USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

CREATE POLICY "endpoints_insert" ON endpoints FOR INSERT WITH CHECK (
  account_id = get_user_account_id()
);

CREATE POLICY "endpoints_update" ON endpoints FOR UPDATE USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  AND user_has_role(ARRAY['super_admin', 'admin', 'operator']::user_role[])
);

CREATE POLICY "endpoints_delete" ON endpoints FOR DELETE USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

-- ============================================
-- POLICIES RLS
-- ============================================
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policies_select" ON policies FOR SELECT USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

CREATE POLICY "policies_insert" ON policies FOR INSERT WITH CHECK (
  account_id = get_user_account_id()
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

CREATE POLICY "policies_update" ON policies FOR UPDATE USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

CREATE POLICY "policies_delete" ON policies FOR DELETE USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

-- ============================================
-- THREATS RLS
-- ============================================
ALTER TABLE threats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threats_select" ON threats FOR SELECT USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

CREATE POLICY "threats_insert" ON threats FOR INSERT WITH CHECK (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

CREATE POLICY "threats_update" ON threats FOR UPDATE USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  AND user_has_role(ARRAY['super_admin', 'admin', 'operator']::user_role[])
);

-- ============================================
-- THREAT ACTIONS RLS
-- ============================================
ALTER TABLE threat_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threat_actions_select" ON threat_actions FOR SELECT USING (
  threat_id IN (
    SELECT id FROM threats 
    WHERE account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  )
);

CREATE POLICY "threat_actions_insert" ON threat_actions FOR INSERT WITH CHECK (
  threat_id IN (
    SELECT id FROM threats 
    WHERE account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  )
  AND user_has_role(ARRAY['super_admin', 'admin', 'operator']::user_role[])
);

-- ============================================
-- AUDIT LOGS RLS
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

-- ============================================
-- ACCOUNT SETTINGS RLS
-- ============================================
ALTER TABLE account_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_settings_select" ON account_settings FOR SELECT USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

CREATE POLICY "account_settings_update" ON account_settings FOR UPDATE USING (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

CREATE POLICY "account_settings_insert" ON account_settings FOR INSERT WITH CHECK (
  account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

-- ============================================
-- LICENSE ALLOCATIONS RLS
-- ============================================
ALTER TABLE license_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "license_allocations_select" ON license_allocations FOR SELECT USING (
  from_account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  OR to_account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
);

CREATE POLICY "license_allocations_insert" ON license_allocations FOR INSERT WITH CHECK (
  from_account_id = get_user_account_id()
  AND user_has_role(ARRAY['super_admin', 'admin']::user_role[])
);

-- ============================================
-- ENDPOINT POLICIES RLS
-- ============================================
ALTER TABLE endpoint_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "endpoint_policies_select" ON endpoint_policies FOR SELECT USING (
  endpoint_id IN (
    SELECT id FROM endpoints 
    WHERE account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  )
);

CREATE POLICY "endpoint_policies_insert" ON endpoint_policies FOR INSERT WITH CHECK (
  endpoint_id IN (
    SELECT id FROM endpoints 
    WHERE account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  )
  AND user_has_role(ARRAY['super_admin', 'admin', 'operator']::user_role[])
);

CREATE POLICY "endpoint_policies_delete" ON endpoint_policies FOR DELETE USING (
  endpoint_id IN (
    SELECT id FROM endpoints 
    WHERE account_id IN (SELECT get_descendant_accounts(get_user_account_id()))
  )
  AND user_has_role(ARRAY['super_admin', 'admin', 'operator']::user_role[])
);

-- ============================================
-- LICENSE TIERS - Public read access
-- ============================================
ALTER TABLE license_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "license_tiers_select" ON license_tiers FOR SELECT USING (true);
