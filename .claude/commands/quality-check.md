---
description: Run comprehensive quality checks before demo/commit
---

You are about to run quality checks on the Reentry Map application.

**Run these checks in order:**

1. **Lint Check**

   ```bash
   npm run lint
   ```

   - Must have 0 ESLint errors
   - Report any errors found

2. **Type Check**

   ```bash
   npx tsc --noEmit
   ```

   - Must have 0 TypeScript errors
   - Report any type issues

3. **Unit Tests**

   ```bash
   npm run test:run
   ```

   - All tests must pass
   - Report test results

4. **Build Check**

   ```bash
   npm run build
   ```

   - Build must succeed
   - Report any build errors

5. **E2E Tests** (optional, slower)

   ```bash
   npm run test:e2e
   ```

   - All E2E tests must pass
   - Playwright manages its own server

**Quick check:**

```bash
npm run quality
```

**Full check (including E2E):**

```bash
npm run quality:full
```

**Report Format:**

- ✅ or ❌ for each check
- Error details if any failures
- Summary: "All checks passed" or "X checks failed"

**This should be run:**

- Before every commit of frontend changes
- Before demoing to user
- Before marking a phase as complete
