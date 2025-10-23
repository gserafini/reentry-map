# Session Management Guide

Best practices for working efficiently with Claude Code across multiple sessions while conserving tokens and maintaining context.

## Token Conservation Strategies

### 1. Use Reference Documents Instead of Rereading

**DON'T**: Ask Claude to reread entire documentation files every session
**DO**: Reference specific sections or create summary documents

```
❌ "Read TECHNICAL_ARCHITECTURE.md and PRODUCT_REQUIREMENTS.md"
✅ "Refer to the database schema in TECHNICAL_ARCHITECTURE.md lines 80-450"
✅ "Check the PRD for user authentication requirements (section 2.4)"
```

### 2. Leverage Task Agents for Research

**DON'T**: Do extensive research in the main conversation thread
**DO**: Use the Task agent (general-purpose) for research and web fetching

```
❌ Main thread: Multiple WebFetch calls + reading large docs
✅ Task agent: "Research HeroUI setup and return installation steps"
```

**Token Savings**: Research in Task agents doesn't consume main thread tokens

### 3. Use Exploration Agents for Codebase Discovery

**DON'T**: Manually grep and glob through the codebase repeatedly
**DO**: Use Task agent with subagent_type=Explore for codebase questions

```
❌ Multiple Grep + Glob + Read operations
✅ Task(Explore): "Find all API routes and their authentication patterns"
```

### 4. Create Checkpoint Documents

After major milestones, create summary documents:

- `PROGRESS.md` - What's been completed
- `NEXT_STEPS.md` - What's queued up
- `BLOCKERS.md` - Current issues

This allows quick context restoration without reading git history.

### 5. Use TodoWrite Extensively

**Critical**: TodoWrite provides persistent context across sessions

```typescript
// Start of session
TodoWrite: Load incomplete todos from previous session

// During work
TodoWrite: Update task status in real-time

// End of session
TodoWrite: Ensure all current work is tracked
```

## Context Management Strategies

### 1. Focused Sessions

Each session should have a clear, scoped goal:

- ✅ "Set up testing infrastructure"
- ✅ "Implement resource list component"
- ❌ "Build the entire app"

### 2. Session Handoff Template

At the end of each session, create a handoff:

```markdown
## Session Summary - [Date]

### Completed

- Task 1
- Task 2

### In Progress

- Task 3 (blocked by X)

### Next Session Should

1. Complete Task 3
2. Start Task 4
3. Test Task 1-2

### Key Decisions

- Decision 1: Rationale
- Decision 2: Rationale

### Files Modified

- file1.ts
- file2.tsx
```

### 3. Architecture Decision Records (ADRs)

Document significant decisions in `ARCHITECTURE_DECISIONS.md`:

- What was decided
- Why it was decided
- What alternatives were considered
- Impact on the project

### 4. Progress Tracking

Maintain `PROGRESS.md` with:

```markdown
## Week 1: Foundation (Current)

- [x] Project initialization
- [x] Documentation setup
- [ ] Testing infrastructure
- [ ] Database setup

## Metrics

- Files created: 45
- Tests passing: 0/0
- Coverage: 0%
```

## Efficient Work Patterns

### Pattern 1: Planning → Implementation → Testing → Documentation

**Session 1: Planning**

- Review requirements
- Create task checklist
- Make architectural decisions

**Session 2: Implementation**

- Implement features from checklist
- Mark todos as complete
- Create tests

**Session 3: Testing & Documentation**

- Run tests
- Fix bugs
- Update documentation

### Pattern 2: Incremental Feature Development

Build features in small, testable chunks:

```
❌ Build entire auth system in one session
✅ Session 1: Phone input component + validation
✅ Session 2: OTP component + Supabase integration
✅ Session 3: Session management + protected routes
```

### Pattern 3: Test-Driven Workflow

1. Write test (red)
2. Implement feature (green)
3. Refactor (clean)
4. Document
5. Commit

This creates natural checkpoints and reviewable progress.

## File Organization for Sessions

### Keep These Files Updated

**Critical** (update every session):

- `TODO.md` or TodoWrite state
- `PROGRESS.md`
- `.env.local` (when adding new variables)

**Important** (update when relevant):

- `ARCHITECTURE_DECISIONS.md`
- `BLOCKERS.md`
- `CHANGELOG.md`

**Reference** (rarely update):

- `TECHNICAL_ARCHITECTURE.md`
- `PRODUCT_REQUIREMENTS.md`
- `CLAUDE.md`

### Create These Working Files

For complex tasks, create temporary working docs:

- `WORKING_AUTH_IMPLEMENTATION.md`
- `WORKING_MAP_COMPONENT.md`

Delete or archive when complete.

## Git Commit Strategies

### Small, Focused Commits

**DON'T**: One massive commit per session
**DO**: Multiple small commits with clear messages

```bash
❌ git commit -m "work from session"

✅ git commit -m "feat: add Vitest configuration"
✅ git commit -m "test: add example unit test"
✅ git commit -m "docs: update testing guide"
```

### Commit After Each Feature

This creates natural review points:

```bash
# Complete feature
git add .
git commit -m "feat: add phone validation component"

# Show me for review
"I've committed the phone validation component.
 Check commit abc123 for review."
```

## Session Length Management

### Optimal Session Length

- **Short focused sessions**: 15-30 minutes (specific task)
- **Medium sessions**: 1-2 hours (feature implementation)
- **Long sessions**: 2-4 hours (multiple features)

### Break Points

Natural places to pause:

- ✅ After completing a feature
- ✅ After all tests pass
- ✅ After documentation update
- ✅ Before starting a complex new feature
- ❌ In the middle of debugging
- ❌ With failing tests

## Review and Demo Strategy

### When to Show Progress

Ask for review at these milestones:

1. **Feature completion**: "Phone validation is working, want to try it?"
2. **Visual changes**: "New UI component ready, take a look at localhost:3000"
3. **Major decisions**: "Should we use HeroUI or shadcn/ui? Here's my analysis..."
4. **Blockers**: "Stuck on Supabase auth error, here's what I've tried..."

### Demo Preparation

Before asking for review:

1. Ensure code compiles (`npm run build`)
2. Tests pass (`npm test`)
3. Linting clean (`npm run lint`)
4. Dev server running (`npm run dev`)
5. Clear instructions on what to test

## Token Budget Management

### Token Budget Awareness

- **Total tokens**: ~200k per session
- **Reserve**: Keep 20k for end-of-session tasks
- **Alert threshold**: When 50k tokens remaining, wrap up

### High Token Activities (Avoid)

- ❌ Reading entire large files repeatedly
- ❌ Multiple WebFetch calls in main thread
- ❌ Extensive code generation without planning
- ❌ Long back-and-forth on design decisions

### Low Token Activities (Prefer)

- ✅ Using Task agents for research
- ✅ Referencing docs with specific line numbers
- ✅ Small, focused file edits
- ✅ TodoWrite updates

## Recovery Strategies

### Starting a New Session

**Quick Start (5 minutes)**:

```bash
# 1. Check todos
"Show me the current TodoWrite state and recent commits"

# 2. Check progress
"What's in PROGRESS.md?"

# 3. Check blockers
"Any blockers documented?"

# 4. Resume
"Continue with the next incomplete todo"
```

**Full Context Start (15 minutes)**:

```bash
# 1. Review progress
"Read PROGRESS.md and last 5 git commits"

# 2. Check todos
"Show TodoWrite state and IMPLEMENTATION_CHECKLIST.md"

# 3. Review decisions
"What architectural decisions were made recently?"

# 4. Test status
"Run tests and show status"

# 5. Plan
"Based on progress, what should we work on next?"
```

### Handling Interrupted Sessions

If a session is interrupted:

1. Commit current work (even if incomplete)
2. Add TODO comments in code
3. Update TodoWrite with current status
4. Create a `HANDOFF_[DATE].md` with context

## Common Pitfalls to Avoid

### 1. Context Loss

**Problem**: Starting fresh each session without reviewing
**Solution**: Always check PROGRESS.md and TodoWrite state first

### 2. Scope Creep

**Problem**: Trying to do too much in one session
**Solution**: Stick to 3-5 focused todos per session

### 3. No Checkpoints

**Problem**: Working for hours without commits
**Solution**: Commit every 15-30 minutes or after each feature

### 4. Poor Communication

**Problem**: Making big decisions without discussing
**Solution**: Ask for input on architectural choices

### 5. Token Exhaustion

**Problem**: Running out of tokens mid-feature
**Solution**: Monitor token count, use Task agents, wrap up early

## Metrics to Track

Keep these in `PROGRESS.md`:

```markdown
## Project Metrics

### Code

- Total files: 150
- Lines of code: 5,432
- Test files: 25
- Test coverage: 75%

### Quality

- ESLint errors: 0
- TypeScript errors: 0
- Failing tests: 0
- Security issues: 0

### Progress

- Week 1: 80% complete
- Features completed: 12
- Features in progress: 3
- Features remaining: 35
```

## Session Templates

### Template: Feature Development Session

```markdown
## Session Goal

Implement [Feature Name]

## Pre-Session Check

- [ ] Read last session's handoff
- [ ] Check TodoWrite state
- [ ] Review relevant PRD section
- [ ] Run `git pull` and `npm install`

## Tasks

1. [ ] Write tests for feature
2. [ ] Implement feature
3. [ ] Update documentation
4. [ ] Create demo/screenshot
5. [ ] Commit and push

## Post-Session

- [ ] Update PROGRESS.md
- [ ] Update TodoWrite
- [ ] Create handoff if interrupted
- [ ] Ask for review if complete
```

### Template: Bug Fix Session

```markdown
## Session Goal

Fix [Bug Description]

## Pre-Session Check

- [ ] Reproduce bug locally
- [ ] Check error logs
- [ ] Review related tests

## Tasks

1. [ ] Write failing test that reproduces bug
2. [ ] Fix bug
3. [ ] Verify test passes
4. [ ] Add regression test
5. [ ] Update changelog

## Post-Session

- [ ] Commit with fix reference
- [ ] Close related issue
- [ ] Deploy to staging
```

### Template: Setup/Configuration Session

```markdown
## Session Goal

Set up [Tool/Infrastructure]

## Tasks

1. [ ] Research best practices
2. [ ] Install dependencies
3. [ ] Create configuration files
4. [ ] Write example/test
5. [ ] Update documentation
6. [ ] Update CLAUDE.md with usage patterns

## Post-Session

- [ ] Ensure `npm run build` works
- [ ] Ensure `npm test` works
- [ ] Document in appropriate guide
```

## Advanced Techniques

### 1. Parallel Task Execution

For independent tasks, create multiple Task agents:

```typescript
// Run these in parallel
Task(1): "Set up Playwright configuration"
Task(2): "Research HeroUI best practices"
Task(3): "Write database migration for users table"
```

### 2. Incremental Context Loading

Load context progressively:

```typescript
// Session start
"Show me PROGRESS.md" (100 tokens)

// If needed
"Show me the auth implementation section of TECHNICAL_ARCHITECTURE.md" (500 tokens)

// If still needed
"Show me the actual auth code in lib/supabase/auth.ts" (1000 tokens)
```

### 3. Cached Context

Create context caches for common scenarios:

- `CONTEXT_AUTH.md` - Everything about auth implementation
- `CONTEXT_DATABASE.md` - Database schema and patterns
- `CONTEXT_UI.md` - UI component standards

Reference these instead of original docs.

## Summary: Golden Rules

1. **Plan before coding** - Clear todos save tokens
2. **Use Task agents** - Keep main thread lightweight
3. **Commit frequently** - Create review checkpoints
4. **Document decisions** - ADRs prevent re-discussion
5. **Update PROGRESS.md** - Always know where you are
6. **Ask for review** - Show completed features
7. **Manage scope** - 3-5 todos per session max
8. **Monitor tokens** - Wrap up before exhaustion
9. **Test continuously** - Don't accumulate bugs
10. **Think long-term** - Build maintainable code

## Quick Reference Commands

```bash
# Start session
git pull && npm install
"Show PROGRESS.md and TodoWrite state"

# During session
npm run dev        # Development server
npm test          # Run tests
npm run lint      # Check code quality
git commit -am "feat: description"

# End session
npm run build     # Verify build works
"Update PROGRESS.md and TodoWrite"
git push
```

---

**Remember**: Efficient sessions are about focused work, clear communication, and good documentation. Quality over quantity!
