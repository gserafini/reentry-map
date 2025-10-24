-- Reentry Map - Seed Data
-- Migration: 20250101000003_seed_data.sql
-- Description: Sample resources for Oakland area testing

-- Insert sample resources (Oakland, CA area)
INSERT INTO resources (name, description, services_offered, phone, email, website, address, latitude, longitude, primary_category, categories, tags, hours, status)
VALUES
  (
    'Oakland Job Center',
    'Comprehensive employment services including job training, resume assistance, and placement for individuals reentering the workforce.',
    ARRAY['Job training', 'Resume building', 'Interview preparation', 'Job placement'],
    '(510) 555-0101',
    'info@oaklandjobs.org',
    'https://oaklandjobs.org',
    '1 Frank H. Ogawa Plaza, Oakland, CA 94612',
    37.8044,
    -122.2712,
    'employment',
    ARRAY['employment', 'education'],
    ARRAY['job-training', 'career-support', 'resume-help'],
    '{"monday": "9:00 AM - 5:00 PM", "tuesday": "9:00 AM - 5:00 PM", "wednesday": "9:00 AM - 5:00 PM", "thursday": "9:00 AM - 5:00 PM", "friday": "9:00 AM - 5:00 PM"}',
    'active'
  ),
  (
    'Bay Area Community Services',
    'Transitional housing and support services for individuals and families. Case management, housing assistance, and life skills training.',
    ARRAY['Transitional housing', 'Case management', 'Housing search', 'Life skills'],
    '(510) 555-0102',
    'housing@bayareacs.org',
    'https://bayareacs.org',
    '2111 International Blvd, Oakland, CA 94606',
    37.7829,
    -122.2345,
    'housing',
    ARRAY['housing', 'general-support'],
    ARRAY['transitional-housing', 'case-management'],
    '{"monday": "8:00 AM - 6:00 PM", "tuesday": "8:00 AM - 6:00 PM", "wednesday": "8:00 AM - 6:00 PM", "thursday": "8:00 AM - 6:00 PM", "friday": "8:00 AM - 4:00 PM"}',
    'active'
  ),
  (
    'Oakland Food Bank',
    'Free food distribution for individuals and families in need. No documentation required. Open to all community members.',
    ARRAY['Food pantry', 'Hot meals', 'Groceries', 'Nutrition counseling'],
    '(510) 555-0103',
    'help@oaklandfoodbank.org',
    'https://oaklandfoodbank.org',
    '8400 Enterprise Way, Oakland, CA 94621',
    37.7515,
    -122.1822,
    'food',
    ARRAY['food'],
    ARRAY['food-pantry', 'hot-meals', 'no-questions-asked'],
    '{"monday": "10:00 AM - 2:00 PM", "wednesday": "10:00 AM - 2:00 PM", "friday": "10:00 AM - 2:00 PM"}',
    'active'
  ),
  (
    'Alameda County Health Services',
    'Healthcare services including primary care, mental health, substance abuse treatment, and medication assistance. Sliding scale fees.',
    ARRAY['Primary care', 'Mental health counseling', 'Substance abuse treatment', 'Prescription assistance'],
    '(510) 555-0104',
    'appointments@achealthservices.org',
    'https://achealthservices.org',
    '1000 San Leandro Blvd, San Leandro, CA 94577',
    37.7249,
    -122.1565,
    'healthcare',
    ARRAY['healthcare', 'mental-health', 'substance-abuse'],
    ARRAY['primary-care', 'mental-health', 'sliding-scale'],
    '{"monday": "8:00 AM - 5:00 PM", "tuesday": "8:00 AM - 5:00 PM", "wednesday": "8:00 AM - 5:00 PM", "thursday": "8:00 AM - 5:00 PM", "friday": "8:00 AM - 5:00 PM"}',
    'active'
  ),
  (
    'East Bay Community Law Center',
    'Free legal assistance for low-income individuals. Specializing in criminal record expungement, family law, and housing rights.',
    ARRAY['Expungement services', 'Family law', 'Housing rights', 'Legal consultation'],
    '(510) 555-0105',
    'intake@ebclc.org',
    'https://ebclc.org',
    '2921 Adeline St, Berkeley, CA 94703',
    37.8544,
    -122.2708,
    'legal-aid',
    ARRAY['legal-aid'],
    ARRAY['expungement', 'free-legal', 'criminal-record'],
    '{"monday": "9:00 AM - 5:00 PM", "tuesday": "9:00 AM - 5:00 PM", "wednesday": "9:00 AM - 5:00 PM", "thursday": "9:00 AM - 5:00 PM"}',
    'active'
  ),
  (
    'Oakland ID Services',
    'Assistance obtaining California ID cards, birth certificates, and other essential documents. Free or low-cost services.',
    ARRAY['ID card assistance', 'Birth certificate', 'Social security card', 'Document recovery'],
    '(510) 555-0106',
    'docs@oaklandid.org',
    'https://oaklandid.org',
    '150 Frank H. Ogawa Plaza, Oakland, CA 94612',
    37.8048,
    -122.2720,
    'id-documents',
    ARRAY['id-documents', 'general-support'],
    ARRAY['identification', 'documents', 'low-cost'],
    '{"tuesday": "10:00 AM - 3:00 PM", "thursday": "10:00 AM - 3:00 PM"}',
    'active'
  ),
  (
    'New Beginnings Clothing Closet',
    'Free professional clothing for job interviews and work. Shoes, accessories, and hygiene items also available.',
    ARRAY['Professional clothing', 'Interview attire', 'Shoes', 'Hygiene products'],
    '(510) 555-0107',
    'info@newbeginningscc.org',
    NULL,
    '3300 Elm St, Oakland, CA 94609',
    37.8219,
    -122.2585,
    'clothing',
    ARRAY['clothing'],
    ARRAY['professional-attire', 'free', 'job-readiness'],
    '{"monday": "12:00 PM - 4:00 PM", "wednesday": "12:00 PM - 4:00 PM", "friday": "12:00 PM - 4:00 PM"}',
    'active'
  ),
  (
    'AC Transit Discount Pass Program',
    'Reduced fare public transportation passes for qualifying individuals. Covers bus and BART within Alameda County.',
    ARRAY['Discounted transit passes', 'Bus passes', 'BART access', 'Application assistance'],
    '(510) 555-0108',
    'passes@actransit.org',
    'https://actransit.org/discount',
    '1600 Franklin St, Oakland, CA 94612',
    37.8085,
    -122.2681,
    'transportation',
    ARRAY['transportation'],
    ARRAY['public-transit', 'discount', 'mobility'],
    '{"monday": "8:00 AM - 5:00 PM", "tuesday": "8:00 AM - 5:00 PM", "wednesday": "8:00 AM - 5:00 PM", "thursday": "8:00 AM - 5:00 PM", "friday": "8:00 AM - 5:00 PM"}',
    'active'
  ),
  (
    'Oakland Hope Center',
    'Faith-based support services including meals, counseling, Bible study, and community connection. All welcome regardless of faith.',
    ARRAY['Hot meals', 'Spiritual counseling', 'Support groups', 'Community events'],
    '(510) 555-0109',
    'welcome@oaklandhope.org',
    'https://oaklandhope.org',
    '4500 Foothill Blvd, Oakland, CA 94601',
    37.7804,
    -122.1759,
    'faith-based',
    ARRAY['faith-based', 'food', 'general-support'],
    ARRAY['meals', 'counseling', 'community'],
    '{"sunday": "9:00 AM - 12:00 PM", "wednesday": "6:00 PM - 8:00 PM"}',
    'active'
  ),
  (
    'Oakland Adult Education',
    'Free GED classes, ESL instruction, computer skills training, and vocational certification programs for adults.',
    ARRAY['GED preparation', 'ESL classes', 'Computer training', 'Vocational certificates'],
    '(510) 555-0110',
    'enroll@oaklandadulted.org',
    'https://oaklandadulted.org',
    '1025 2nd Ave, Oakland, CA 94606',
    37.7956,
    -122.2617,
    'education',
    ARRAY['education'],
    ARRAY['ged', 'esl', 'job-training', 'free-classes'],
    '{"monday": "6:00 PM - 9:00 PM", "tuesday": "6:00 PM - 9:00 PM", "wednesday": "6:00 PM - 9:00 PM", "thursday": "6:00 PM - 9:00 PM"}',
    'active'
  );

-- Add some sample ratings (simulate community engagement)
-- Note: These would normally come from real users, this is just for testing
INSERT INTO resource_ratings (resource_id, user_id, rating)
SELECT
  r.id,
  (SELECT id FROM auth.users LIMIT 1), -- Uses first admin user if exists
  (RANDOM() * 2 + 3)::INTEGER -- Random rating between 3-5
FROM resources r
WHERE (RANDOM() < 0.7); -- 70% of resources get a rating

COMMENT ON TABLE resources IS 'Seed data contains 10 Oakland-area reentry resources for testing';
