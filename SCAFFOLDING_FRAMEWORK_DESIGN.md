# Project Scaffolding Framework - Design Document

## Overview

A reusable git submodule that provides enterprise-grade project management, documentation, and quality infrastructure for software projects. Designed to work with AI coding assistants (Claude Code, GitHub Copilot) to establish clear scope, requirements, implementation plans, and quality standards from day one.

## Problem Statement

Every new project requires:

- Clear scope definition and requirements
- Architecture decision tracking
- Implementation planning and checklists
- AI assistant instructions and context
- Testing and quality infrastructure setup
- Progress tracking and session management
- Commit conventions and workflows

Typically, teams either:

1. Start from scratch each time (inefficient, inconsistent)
2. Copy-paste from previous projects (outdated, project-specific)
3. Skip documentation (technical debt, unclear scope)

## Solution

A **git submodule-based framework** that provides:

- **Templates**: Customizable documentation templates
- **Scripts**: Automated setup and scaffolding
- **Patterns**: Proven project management patterns
- **Standards**: Quality and testing infrastructure
- **AI Integration**: Pre-configured AI assistant instructions

## Architecture

### Repository Structure

```
project-scaffold/
├── README.md                          # Framework overview and quick start
├── docs/
│   ├── GETTING_STARTED.md            # How to use this framework
│   ├── CUSTOMIZATION_GUIDE.md        # How to customize for your project
│   └── PHILOSOPHY.md                 # Why this approach works
├── templates/
│   ├── planning/
│   │   ├── PROGRESS.md.template      # Session tracking template
│   │   ├── IMPLEMENTATION_CHECKLIST.md.template
│   │   ├── ARCHITECTURE_DECISIONS.md.template
│   │   ├── SESSION_MANAGEMENT.md     # Best practices (not a template)
│   │   ├── PRODUCT_REQUIREMENTS.md.template
│   │   ├── TECHNICAL_ARCHITECTURE.md.template
│   │   └── PROJECT_OVERVIEW.md.template
│   ├── ai-assistants/
│   │   ├── CLAUDE.md.template        # Quick reference for Claude Code
│   │   ├── CLAUDE_CODE_INSTRUCTIONS.md.template
│   │   └── copilot-instructions.md.template
│   ├── development/
│   │   ├── SETUP_GUIDE.md.template
│   │   ├── DEPLOYMENT_GUIDE.md.template
│   │   ├── TESTING_STRATEGY.md.template
│   │   └── API_DOCUMENTATION.md.template
│   └── configs/
│       ├── .prettierrc               # Prettier config
│       ├── .prettierignore          # Prettier ignore
│       ├── .eslintrc.template       # ESLint config template
│       └── .husky/                  # Git hooks templates
├── scripts/
│   ├── init.sh                      # Initialize in existing project
│   ├── scaffold.sh                  # Create new project with scaffold
│   ├── update-progress.sh           # Helper for updating progress
│   └── validate.sh                  # Validate documentation completeness
├── examples/
│   ├── web-app/                     # Example: Full-stack web app
│   ├── api-service/                 # Example: Backend API
│   └── mobile-app/                  # Example: Mobile application
└── VERSION                          # Framework version for updates
```

### Key Components

#### 1. Documentation Templates

**Purpose**: Provide structure without being prescriptive

**Features**:

- Placeholder variables (e.g., `{{PROJECT_NAME}}`, `{{TECH_STACK}}`)
- Sections marked as optional/required
- Examples for common scenarios
- Guidance comments that can be removed

**Templates**:

- `PROGRESS.md` - Track sessions, metrics, blockers, weekly goals
- `IMPLEMENTATION_CHECKLIST.md` - Phase-based task breakdown with acceptance criteria
- `ARCHITECTURE_DECISIONS.md` - ADR format for key decisions
- `PRODUCT_REQUIREMENTS.md` - Features, user stories, acceptance criteria
- `TECHNICAL_ARCHITECTURE.md` - Tech stack, database schema, API design
- `CLAUDE.md` - Quick reference for Claude Code
- `CLAUDE_CODE_INSTRUCTIONS.md` - Detailed AI assistant instructions
- `copilot-instructions.md` - GitHub Copilot guidance

#### 2. Initialization Scripts

**`init.sh`** - Add scaffold to existing project:

```bash
#!/bin/bash
# Usage: ./project-scaffold/scripts/init.sh

# 1. Detect project type (web, API, mobile)
# 2. Ask for project details (name, description, tech stack)
# 3. Generate documentation from templates
# 4. Set up quality tools (optional: ESLint, Prettier, Husky)
# 5. Create initial git commits
# 6. Display next steps
```

**`scaffold.sh`** - Create new project with scaffold:

```bash
#!/bin/bash
# Usage: ./scaffold.sh my-new-project

# 1. Create project directory
# 2. Initialize git repository
# 3. Add scaffold as submodule
# 4. Run init.sh
# 5. Create initial file structure
```

#### 3. Process Patterns

**Phase-Based Implementation**:

- Phase 0: Foundation & Quality Infrastructure
- Phase 1-N: Feature implementation phases
- Each phase has clear deliverables and review points

**Session Management**:

- Start each session by reading PROGRESS.md
- Use TodoWrite for tracking tasks
- End each session by updating PROGRESS.md
- Commit frequently (every 15-30 min)

**ADR (Architecture Decision Records)**:

- Document all significant decisions
- Include context, options, rationale, consequences
- Status: Proposed, Accepted, Deprecated, Superseded

#### 4. AI Assistant Integration

**Claude Code Instructions**:

- File: `CLAUDE.md` (quick reference)
- File: `CLAUDE_CODE_INSTRUCTIONS.md` (detailed guide)
- Includes: Code patterns, testing philosophy, commit conventions
- Updated with project-specific details during init

**GitHub Copilot Instructions**:

- File: `.github/copilot-instructions.md`
- Includes: Quality standards, testing requirements, code patterns
- Integrates with Copilot's workspace context

#### 5. Quality Infrastructure Templates

**Testing Setup**:

- Vitest configuration for unit tests
- Playwright configuration for E2E tests
- Coverage thresholds
- Test examples

**Code Quality**:

- ESLint configuration (flat config)
- Prettier configuration with Tailwind plugin
- Husky + lint-staged for pre-commit hooks
- TypeScript strict mode

**Environment Validation**:

- T3 Env setup with Zod
- .env.example template
- Type-safe environment variables

## Usage Scenarios

### Scenario 1: Add to Existing Project

```bash
# Add as git submodule
git submodule add https://github.com/yourorg/project-scaffold.git .scaffold
cd .scaffold
git checkout main

# Run initialization
./scripts/init.sh

# Follow prompts:
# - Project name: "Reentry Map"
# - Project type: "Full-stack web application"
# - Tech stack: "Next.js, Supabase, TypeScript"
# - AI assistants: "Claude Code, GitHub Copilot"
# - Quality tools: "Yes - ESLint, Prettier, Husky"

# Generated files:
# - PROGRESS.md (customized)
# - IMPLEMENTATION_CHECKLIST.md (customized)
# - ARCHITECTURE_DECISIONS.md (with initial ADRs)
# - CLAUDE.md (with tech stack details)
# - .github/copilot-instructions.md
# - .prettierrc, .eslintrc.js, .husky/pre-commit

# Commit the scaffold
git add .scaffold/ PROGRESS.md IMPLEMENTATION_CHECKLIST.md ...
git commit -m "feat: initialize project scaffold and documentation"
```

### Scenario 2: Create New Project

```bash
# Create new project with scaffold
./project-scaffold/scripts/scaffold.sh my-awesome-app

# Prompts same as Scenario 1
# Creates complete project structure with:
# - Git repository
# - All documentation
# - Quality tools configured
# - Initial file structure
# - First commit
```

### Scenario 3: Update Scaffold

```bash
# Update submodule to latest version
cd .scaffold
git pull origin main
cd ..

# Review changes
git diff .scaffold/

# Apply updates selectively
./scaffold/scripts/update.sh

# Commit updates
git add .scaffold/
git commit -m "chore: update project scaffold to v2.1.0"
```

## Customization

### Variables

Templates use `{{VARIABLE}}` syntax:

```markdown
# {{PROJECT_NAME}} - Progress

**Last Updated**: {{TODAY_DATE}}
**Current Phase**: Phase 0 - Foundation
**Tech Stack**: {{TECH_STACK}}
```

### Sections

Templates mark optional sections:

```markdown
## Optional: Mobile App Configuration

<!-- REMOVE THIS SECTION IF NOT MOBILE APP -->

- Target platforms: iOS, Android
- Framework: React Native, Flutter, etc.

<!-- END OPTIONAL SECTION -->
```

### Project Types

Framework detects/asks for project type:

- `web-app`: Full-stack web application
- `api-service`: Backend API/microservice
- `mobile-app`: Mobile application
- `library`: NPM package/library
- `cli-tool`: Command-line tool
- `custom`: Custom project type

Each type includes:

- Relevant documentation templates
- Appropriate tech stack suggestions
- Type-specific checklists

## Benefits

### For Teams

1. **Consistency**: Same structure across all projects
2. **Onboarding**: New team members know where to find things
3. **Quality**: Enforced standards from day one
4. **Documentation**: Never forgotten or outdated
5. **AI-Friendly**: AI assistants have clear context

### For Solo Developers

1. **Organization**: Clear structure prevents chaos
2. **Focus**: Know what to work on next
3. **Accountability**: Track progress and blockers
4. **Reusability**: Copy patterns that work
5. **Learning**: Best practices built-in

### For AI Assistants

1. **Context**: Clear understanding of project scope
2. **Patterns**: Established code patterns to follow
3. **Quality**: Built-in testing and linting expectations
4. **Decisions**: Historical context via ADRs
5. **Progress**: Always know current state

## Implementation Plan

### Phase 1: Core Framework (Week 1)

- [ ] Create `project-scaffold` repository
- [ ] Extract templates from reentry-map
- [ ] Write `init.sh` script (basic version)
- [ ] Write README and GETTING_STARTED docs
- [ ] Add to reentry-map as submodule (dogfooding)

### Phase 2: Script Enhancement (Week 2)

- [ ] Interactive prompts for project details
- [ ] Template variable replacement
- [ ] Project type detection
- [ ] Quality tools setup automation
- [ ] Validation script

### Phase 3: Examples & Documentation (Week 3)

- [ ] Add web-app example
- [ ] Add API service example
- [ ] Write CUSTOMIZATION_GUIDE
- [ ] Write PHILOSOPHY doc
- [ ] Create video tutorial

### Phase 4: Distribution (Week 4)

- [ ] Public GitHub repository
- [ ] NPM package (optional: `npx create-project-scaffold`)
- [ ] Documentation website
- [ ] Blog post announcement
- [ ] Community feedback

## Success Metrics

- **Adoption**: Used in 3+ projects within first month
- **Time Savings**: 50% reduction in project setup time
- **Completeness**: 90%+ of projects have complete documentation
- **Satisfaction**: Positive feedback from team members
- **AI Effectiveness**: AI assistants produce better code faster

## Future Enhancements

1. **Interactive Web UI**: Configure project via web interface
2. **Template Marketplace**: Community-contributed templates
3. **CI/CD Integration**: Automated scaffold validation in CI
4. **Project Health Dashboard**: Visualize completeness, progress
5. **Multi-Language Support**: Templates in Spanish, French, etc.
6. **IDE Integrations**: VS Code extension for scaffold management

## Open Questions

1. **Versioning**: How to handle template updates in existing projects?
2. **Enforcement**: Should scaffold validate documentation completeness?
3. **Flexibility**: How much structure is too much?
4. **Naming**: `project-scaffold`, `project-framework`, or `project-starter`?
5. **Licensing**: MIT, Apache 2.0, or custom license?

## Next Steps

1. Create `project-scaffold` GitHub repository
2. Extract and templatize reentry-map documentation
3. Write basic `init.sh` script
4. Add as submodule to reentry-map (eat our own dog food)
5. Iterate based on real-world usage
6. Share with community for feedback

---

**Status**: Design Complete - Ready for Implementation
**Author**: Gabriel Serafini + Claude Code
**Date**: 2025-10-23
