-- ⚠️  DEVELOPMENT ONLY - DO NOT RUN IN PRODUCTION ⚠️
-- Seed Test Users for Local Development
--
-- This file creates test users for local development and testing.
-- Run manually in Supabase SQL Editor for development environments only.
--
-- Test Users Created:
-- 1. Regular User: testuser@example.com / TestUser123!
-- 2. Admin User: admin@example.com / AdminUser123!

-- Test User 1: Regular user (not admin)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'testuser@example.com',
  crypt('TestUser123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Create corresponding entry in auth.identities for test user
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000000001',
    'email', 'testuser@example.com',
    'email_verified', true,
    'provider_id', '00000000-0000-0000-0000-000000000001'
  ),
  'email',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- Create public.users entry for test user
INSERT INTO public.users (
  id,
  first_name,
  last_name,
  is_admin,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test',
  'User',
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test User 2: Admin user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',
  crypt('AdminUser123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Create corresponding entry in auth.identities for admin
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000000002',
    'email', 'admin@example.com',
    'email_verified', true,
    'provider_id', '00000000-0000-0000-0000-000000000002'
  ),
  'email',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- Create public.users entry for admin user
INSERT INTO public.users (
  id,
  first_name,
  last_name,
  is_admin,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Admin',
  'User',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify users were created
SELECT
  u.email,
  p.first_name,
  p.last_name,
  p.is_admin
FROM auth.users u
LEFT JOIN public.users p ON u.id = p.id
WHERE u.email IN ('testuser@example.com', 'admin@example.com');
