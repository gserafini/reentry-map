# Reentry Map

> Helping people navigate reentry by connecting them with resources in their community

A mobile-first web application that provides an accurate, up-to-date directory of reentry resources powered by community knowledge and AI automation.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

## Overview

Reentry Map addresses a critical need: people leaving incarceration struggle to find accurate information about resources that accept them. Resource information is scattered, outdated, and hard to search by location.

Our solution is a community-driven, AI-enhanced resource directory that:

- Makes it easy to find resources near you
- Shows which resources accept people with criminal records
- Provides real reviews from people who've used the services
- Keeps information accurate through automated verification
- Works on any device without app store downloads

## Key Features

### For Users

- **Location-Based Search** - Find resources near you with interactive map view
- **Smart Search & Filtering** - Search by category, distance, and keywords
- **Community Reviews** - Read honest feedback from people who've been there
- **Save Favorites** - Keep track of important resources
- **Mobile-First PWA** - Install to your phone's home screen, works offline

### For the Community

- **Suggest Resources** - Know a helpful place? Share it with others
- **Report Issues** - Keep information accurate by reporting changes
- **Rate & Review** - Help others make informed decisions

### For Administrators

- **AI Automation** - Automated resource discovery and enrichment
- **Verification System** - Quarterly checks on phone numbers and websites
- **Moderation Dashboard** - Review community suggestions and reports

## Tech Stack

**Frontend**

- Next.js 16 (App Router) with React Server Components
- TypeScript 5.7 (strict mode)
- Tailwind CSS 4.0 for styling
- shadcn/ui component library

**Backend**

- Next.js API Routes
- Supabase (PostgreSQL 16 with PostGIS)
- Supabase Auth (Phone/SMS OTP)
- Row Level Security (RLS)

**Integrations**

- Google Maps JavaScript API (maps, geocoding)
- OpenAI API (GPT-4o-mini for AI agents)

**Infrastructure**

- Vercel (hosting, edge network)
- Supabase Cloud (database, auth, storage)
- Progressive Web App (PWA)

## Project Management

This project uses **[Agent Success Pack](https://github.com/gserafini/agent-success-pack)** for project management and documentation—a framework optimized for AI-assisted development.

**Key Documents**:

- [PROGRESS.md](PROGRESS.md) - Current status, session notes, metrics
- [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - Phase-based task breakdown
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Key technical decisions (ADRs)
- [CLAUDE.md](CLAUDE.md) - Quick reference for AI assistants

**Why this approach?**

- 🎯 Clear scope and requirements from day one
- 📊 Track progress across sessions
- 🤖 Optimized for AI-assisted development (Claude Code, GitHub Copilot)
- ✅ Enforced quality standards
- 📝 Document decisions for future reference

Learn more: [Agent Success Pack on GitHub](https://github.com/gserafini/agent-success-pack)

## Project Status

**Phase 0: Foundation** - ✅ Complete
**Phase 1: MVP** - In Development (5-week timeline)

- [x] Week 1: Foundation & Core Infrastructure
- [ ] Week 2: Location Features & Map View
- [ ] Week 3: User Authentication & Favorites
- [ ] Week 4: Reviews, Suggestions & AI Agents
- [ ] Week 5: Polish, Testing & Launch

**Target Launch**: Oakland, CA with 50+ verified resources

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or pnpm
- Supabase account
- Google Maps API key
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/gserafini/reentry-map.git
cd reentry-map

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure your .env.local with:
# - Supabase credentials
# - Google Maps API key
# - OpenAI API key

# Run database migrations in Supabase SQL Editor

# Start development server
npm run dev
```

Visit [http://localhost:3003](http://localhost:3003) to see the app.

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

## Documentation

Comprehensive documentation is available:

- **[CLAUDE.md](CLAUDE.md)** - Quick reference for AI assistants
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Mission and goals
- **[TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)** - System design and database schema
- **[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)** - Feature requirements and user stories
- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - Week-by-week implementation plan
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Step-by-step environment setup
- **[TESTING_STRATEGY.md](TESTING_STRATEGY.md)** - Testing procedures
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - API endpoints reference

## Architecture Highlights

### Database

- PostgreSQL 16 with PostGIS for geospatial queries
- Full-text search indexes for fast resource lookup
- Database triggers for automatic aggregate calculations
- Row Level Security on all tables

### AI Agent System

Three autonomous agents keep data fresh:

- **Discovery Agent** - Finds new resources from 211 directories and government sites
- **Enrichment Agent** - Fills in missing data via web scraping and APIs
- **Verification Agent** - Quarterly checks on phone numbers and business status

### Security & Privacy

- Phone-based authentication (no passwords)
- All API keys secured server-side
- Row Level Security enforces data access
- HTTPS enforced, input validation on all endpoints

## Core Principles

- **Dignity & Respect** - Never stigmatizing language, neutral helpful tone
- **Simplicity** - Clear language (4th grade reading level), minimal clicks
- **Mobile-First** - Designed for phones, enhanced for desktop
- **Accessibility** - WCAG 2.1 AA compliant, keyboard navigation, screen reader support
- **Community-Driven** - User contributions valued and acted upon
- **Performance** - Fast on slow connections, works on 3G

## Contributing

We welcome contributions! Whether you're:

- A developer who wants to code
- Someone with knowledge of reentry resources
- A user with feedback on the experience

Please reach out or submit an issue.

## Roadmap

### Phase 1 (Current) - Core Directory

Basic resource directory with search, map, reviews, and favorites

### Phase 2 - Enhanced Features

- Document scanning (release papers)
- Calendar reminders for appointments
- Multi-stop transportation routing
- Spanish language support
- Push notifications

### Phase 3 - Community Features

- Coach messaging
- Check-in tracking
- Goal setting
- Peer connections
- Job matching

### Phase 4 - Scale & Integration

- Native mobile apps (iOS/Android)
- Voice search and SMS interface
- Integration with case management systems
- Outcomes tracking and grant reporting

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contact

**Project Owner**: Gabriel Serafini
**Email**: gserafini@gmail.com
**Repository**: https://github.com/gserafini/reentry-map

## Acknowledgments

Built with support from the reentry community and powered by:

- Next.js and Vercel
- Supabase
- Google Maps Platform
- OpenAI
- The open source community

---

**Status**: Phase 1 MVP in active development
**Last Updated**: October 2025
