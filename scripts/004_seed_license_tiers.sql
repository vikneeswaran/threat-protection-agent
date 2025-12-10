-- Seed license tiers data
INSERT INTO license_tiers (name, min_endpoints, max_endpoints, price_per_endpoint, support_type, response_time, trial_days)
VALUES
  ('free', 1, 5, 0.00, 'none', NULL, 15),
  ('basic', 1, 50, 5.00, 'email', '12-48 hours', NULL),
  ('pro', 50, 500, 10.00, 'email_phone', '2-8 hours', NULL),
  ('enterprise', 500, 50000, 10.00, 'email_phone', '< 15 minutes', NULL)
ON CONFLICT DO NOTHING;
