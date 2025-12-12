-- Add agent_id column to endpoints for installer-provided identifiers
ALTER TABLE endpoints
  ADD COLUMN IF NOT EXISTS agent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_endpoints_agent_id ON endpoints(agent_id);
