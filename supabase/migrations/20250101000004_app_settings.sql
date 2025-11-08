-- Create app_settings table for runtime configuration
-- This allows admins to toggle features without code deployment

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feature Flags
  sms_auth_enabled BOOLEAN DEFAULT FALSE,
  sms_provider_configured BOOLEAN DEFAULT FALSE,

  -- Contact Info
  support_email TEXT,
  support_phone TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings (single row, will be updated via admin panel)
INSERT INTO app_settings (
  sms_auth_enabled,
  sms_provider_configured,
  support_email
) VALUES (
  FALSE, -- SMS disabled by default until provider configured
  FALSE, -- Provider not configured yet
  'support@reentrymap.org'
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_settings_timestamp
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- Row Level Security (RLS)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (public config)
CREATE POLICY "Settings are viewable by everyone"
  ON app_settings FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Add helpful comments
COMMENT ON TABLE app_settings IS 'Application-wide settings and feature flags for runtime configuration';
COMMENT ON COLUMN app_settings.sms_auth_enabled IS 'Whether SMS/phone authentication is enabled (requires provider configuration)';
COMMENT ON COLUMN app_settings.sms_provider_configured IS 'Whether an SMS provider (Twilio, etc.) has been configured in Supabase';
