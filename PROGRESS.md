# Progress Tracking

This project uses **pm.db** for centralized progress tracking.

## Quick Commands

```bash
# View recent progress
~/.claude/bin/pm session recent --days 7

# Record a new session (after completing work)
~/.claude/bin/pm session record \
  --title "Session title" \
  --summary "Brief summary" \
  --completed "Item 1|Item 2|Item 3" \
  --commits "abc1234,def5678"

# What to work on next
~/.claude/bin/pm next

# Search past sessions
~/.claude/bin/pm search "search term"

# View all project stats
~/.claude/bin/pm overview
```

## Database Location

```
~/.claude/pm.db
```

## Detailed Reports

Individual session reports are stored in `docs/progress/YYYY-MM-DD-title.md`.

## For Claude

Use `/do-progress` at end of session to:

1. Commit work to git
2. Create detailed progress report
3. Record session to pm.db

---

_Progress data migrated to pm.db on 2026-01-26. Historical sessions preserved in database._
