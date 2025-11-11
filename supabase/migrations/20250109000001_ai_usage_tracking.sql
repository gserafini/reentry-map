-- AI Usage Tracking and Budget Control
-- Tracks all AI API calls for cost monitoring and budget management

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operation metadata
  operation_type TEXT NOT NULL, -- 'verification', 'enrichment', 'discovery', etc.
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  suggestion_id UUID REFERENCES resource_suggestions(id) ON DELETE SET NULL,

  -- AI provider details
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai')),
  model TEXT NOT NULL, -- 'claude-haiku-4-20250514', 'gpt-4o-mini', etc.

  -- Token usage
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  -- Cost tracking (in USD)
  input_cost_usd DECIMAL(10, 6) NOT NULL,
  output_cost_usd DECIMAL(10, 6) NOT NULL,
  total_cost_usd DECIMAL(10, 6) GENERATED ALWAYS AS (input_cost_usd + output_cost_usd) STORED,

  -- Performance
  duration_ms INTEGER,

  -- Context
  operation_context JSONB, -- Additional metadata (location, batch_id, etc.)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation_type ON ai_usage_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_resource ON ai_usage_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_suggestion ON ai_usage_logs(suggestion_id);

-- Create view for cost aggregation
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  operation_type,
  provider,
  model,
  COUNT(*) as api_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost_usd) as total_cost_usd
FROM ai_usage_logs
GROUP BY DATE_TRUNC('day', created_at), operation_type, provider, model
ORDER BY date DESC, total_cost_usd DESC;

-- Create view for budget tracking
CREATE OR REPLACE VIEW ai_budget_status AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(total_cost_usd) as month_total_usd,
  COUNT(*) as total_api_calls,
  SUM(CASE WHEN provider = 'anthropic' THEN total_cost_usd ELSE 0 END) as anthropic_cost_usd,
  SUM(CASE WHEN provider = 'openai' THEN total_cost_usd ELSE 0 END) as openai_cost_usd
FROM ai_usage_logs
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Add RLS policies (admin only)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all AI usage logs"
  ON ai_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "System can insert AI usage logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI API calls for cost monitoring and budget control';
COMMENT ON COLUMN ai_usage_logs.operation_type IS 'Type of AI operation: verification, enrichment, discovery';
COMMENT ON COLUMN ai_usage_logs.provider IS 'AI provider: anthropic (Claude), openai (GPT)';
COMMENT ON COLUMN ai_usage_logs.input_tokens IS 'Number of input tokens sent to AI';
COMMENT ON COLUMN ai_usage_logs.output_tokens IS 'Number of output tokens received from AI';
COMMENT ON COLUMN ai_usage_logs.total_cost_usd IS 'Total cost in USD (input + output)';
COMMENT ON COLUMN ai_usage_logs.operation_context IS 'Additional metadata about the operation (location, batch_id, etc.)';
