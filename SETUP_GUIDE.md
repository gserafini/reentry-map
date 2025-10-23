# Reentry Map - Setup Guide

This guide will walk you through setting up the Reentry Map development environment
step-by-step.

## Prerequisites

Before you begin, ensure you have:
- Node.js 20.x or later ([download](https://nodejs.org))
- npm 10.x or pnpm 9.x
- Git ([download](https://git-scm.com))
- A code editor (VS Code recommended)
- A Supabase account ([sign up](https://supabase.com))
- A Google Cloud account for Maps API ([sign up](https://console.cloud.google.com))
- An OpenAI account for AI features ([sign up](https://platform.openai.com))

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project:
   - **Name**: reentry-map
   - **Database Password**: (generate and save securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free (for development)

4. Wait for project to provision (~2 minutes)

5. Get your project credentials:
   - Go to Project Settings > API
   - Copy **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - Copy **anon/public key** (starts with `eyJ...`)
   - Copy **service_role key** (starts with `eyJ...`) - keep this secret!

## Step 2: Set Up Database

1. In Supabase dashboard, go to SQL Editor
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/20250101000000_initial_schema.sql`
4. Paste into editor and click "Run"
5. Verify tables created: Go to Database > Tables
6. Repeat for other migration files in order:
   - `20250101000001_rls_policies.sql`
   - `20250101000002_functions_triggers.sql`
   - `20250101000003_seed_data.sql`

## Step 3: Configure Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project: "Reentry Map"
3. Enable APIs:
   - Go to APIs & Services > Library
   - Enable "Maps JavaScript API"
   - Enable "Geocoding API"
   - Enable "Places API"

4. Create API credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy the API key
   - Click "Edit API key"
   - Under "API restrictions", select "Restrict key"
   - Check: Maps JavaScript API, Geocoding API, Places API
   - Under "Application restrictions", select "HTTP referrers"
   - Add: `localhost:3000/*` and your production domain
   - Save

## Step 4: Configure OpenAI API

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to API keys
3. Click "Create new secret key"
4. Name it "Reentry Map Development"
5. Copy the key (starts with `sk-...`)
6. **Important**: Save this key securely - you can't view it again

## Step 5: Clone and Install
```bash
# Clone the repository
git clone https://github.com/gserafini/reentry-map.git
cd reentry-map

# Install dependencies
npm install
# or if using pnpm:
# pnpm install

# Copy environment variables template
cp .env.example .env.local
```

## Step 6: Configure Environment Variables

Edit `.env.local` with your credentials:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...your-maps-key
GOOGLE_MAPS_KEY=AIza...your-maps-key

# OpenAI
OPENAI_API_KEY=sk-...your-openai-key

# App URL (development)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Cron secret (generate random string)
CRON_SECRET=your-random-secret-string

# Optional: Phone validation
ABSTRACT_API_KEY=your-abstract-api-key
```

## Step 7: Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the Reentry Map home page with the map and search interface.

## Step 8: Create Admin User

1. Sign up through the app using your phone number
2. Verify with OTP code
3. In Supabase dashboard:
   - Go to Authentication > Users
   - Find your user
   - Copy the User UID
   - Go to SQL Editor
   - Run this query (replace with your UID):
```sql
   UPDATE users SET is_admin = true WHERE id = 'your-user-uid';
```
4. Refresh the app - you should now see "Admin" in navigation

## Step 9: Verify Installation

Test each feature:

- [ ] Home page loads with map
- [ ] Search bar works
- [ ] Can browse resources (should see 10 seed resources)
- [ ] Can view resource details
- [ ] Can click "Get Directions" (opens Google Maps)
- [ ] Can sign in with phone number
- [ ] Can favorite a resource (after sign in)
- [ ] Can write a review (after sign in)
- [ ] Admin dashboard accessible (if admin)

## Step 10: Optional - Install Recommended VS Code Extensions
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode"
  ]
}
```

## Troubleshooting

### Database Connection Fails
- Check Supabase project is running
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check firewall isn't blocking Supabase

### Map Doesn't Load
- Verify Google Maps API key is correct
- Check API is enabled in Google Cloud Console
- Check browser console for errors
- Verify HTTP referrer restrictions allow localhost

### Authentication Fails
- Check Supabase Auth is enabled
- Verify phone auth is configured in Supabase
- Check you have phone credits (Supabase gives free credits)

### AI Agents Fail
- Verify OpenAI API key is correct
- Check you have API credits
- Check OpenAI API status

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules` and reinstall
- Check Node.js version is 20.x+
- Check all dependencies installed

## Next Steps

Now that your environment is set up:

1. Read through the codebase structure in `TECHNICAL_ARCHITECTURE.md`
2. Review the PRD in `PRODUCT_REQUIREMENTS.md`
3. Start building features following the `DEVELOPMENT_PLAN.md`
4. Test thoroughly using `TESTING_GUIDE.md`

## Getting Help

- Check existing issues: [GitHub Issues](https://github.com/gserafini/reentry-map/issues)
- Read documentation in `/docs` folder
- Contact: gserafini@gmail.com