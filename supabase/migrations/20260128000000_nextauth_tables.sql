-- =============================================================================
-- NextAuth.js Migration: Auth Tables for Self-Hosted PostgreSQL
-- =============================================================================
-- This migration creates the necessary tables for NextAuth.js authentication
-- to replace Supabase Auth. Run this on the dc3-1 PostgreSQL server.
--
-- Creates:
-- 1. users - Standalone user table (no auth.users dependency)
-- 2. phone_otps - Stores phone OTP verification codes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- USERS TABLE (Standalone - not linked to Supabase auth.users)
-- This is the new self-hosted users table that replaces the Supabase-linked one
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone TEXT,
    name TEXT,
    avatar_url TEXT,
    password_hash TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique email constraint (only for non-null emails)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

-- Unique phone constraint (only for non-null phones)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Add comments
COMMENT ON TABLE users IS 'User profile data for NextAuth.js authentication';
COMMENT ON COLUMN users.email IS 'User email address (unique, for email/password auth)';
COMMENT ON COLUMN users.phone IS 'User phone number in E.164 format (unique, for phone OTP auth)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for email/password authentication';
COMMENT ON COLUMN users.is_admin IS 'Admin flag for access control';

-- -----------------------------------------------------------------------------
-- PHONE OTPs TABLE
-- Stores one-time passwords for phone authentication
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS phone_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick phone lookup
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);

-- Index for cleanup of expired OTPs
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires_at ON phone_otps(expires_at);

-- Add comment
COMMENT ON TABLE phone_otps IS 'Stores phone OTP codes for authentication';

-- -----------------------------------------------------------------------------
-- CLEANUP FUNCTION
-- Automatically delete expired OTPs
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM phone_otps WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_otps() IS 'Removes expired OTP codes older than 1 hour';

-- -----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- Automatically update updated_at timestamp on users table
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- VERIFICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    RAISE NOTICE 'NextAuth migration complete.';
    RAISE NOTICE 'Tables created: users, phone_otps';
END $$;
