-- Manual Admin Promotion
-- This is a manual migration to promote users to admin status
-- Run this in the Supabase SQL Editor when you need to grant admin access

-- INSTRUCTIONS:
-- 1. Find the user's ID by their email:
--    SELECT id, email FROM auth.users WHERE email = 'user@example.com';
--
-- 2. Update the user to admin:
--    UPDATE users SET is_admin = TRUE WHERE id = 'USER_ID_HERE';
--
-- 3. Verify:
--    SELECT id, first_name, last_name, is_admin FROM users WHERE id = 'USER_ID_HERE';

-- EXAMPLE: Promote a user to admin
-- Replace 'USER_ID_HERE' with the actual UUID from auth.users

-- Step 1: Find user ID
-- SELECT id FROM auth.users WHERE email = 'admin@example.com';

-- Step 2: Promote to admin
-- UPDATE users
-- SET is_admin = TRUE
-- WHERE id = 'USER_ID_HERE';

-- Step 3: Verify
-- SELECT u.id, au.email, u.first_name, u.last_name, u.is_admin
-- FROM users u
-- JOIN auth.users au ON au.id = u.id
-- WHERE u.id = 'USER_ID_HERE';

-- REVOKE ADMIN ACCESS:
-- To remove admin privileges:
-- UPDATE users SET is_admin = FALSE WHERE id = 'USER_ID_HERE';

-- LIST ALL ADMINS:
-- To see all current admins:
-- SELECT u.id, au.email, u.first_name, u.last_name, u.is_admin, u.created_at
-- FROM users u
-- JOIN auth.users au ON au.id = u.id
-- WHERE u.is_admin = TRUE
-- ORDER BY u.created_at;
