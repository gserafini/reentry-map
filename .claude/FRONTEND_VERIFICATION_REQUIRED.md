# FRONTEND UI VERIFICATION CHECKLIST

⚠️ **CRITICAL**: Read this file BEFORE claiming any frontend work is "complete" or "production-ready"

## The Problem (2025-11-11 Incident)

Claude claimed admin dashboard was "production-ready" after `npm run quality` passed, but **never browsed the UI**. When user finally looked:
- **Critical crash bug**: TypeError in CoverageSnapshot.tsx
- **Page wouldn't load**: metrics.coveragePercentage.toFixed() on undefined
- **Multiple API 400 errors**: Components showing empty states
- **User frustration**: Had to explicitly say "USE FUCKING MCP SERVER"

**Lesson**: `npm run quality` passing ≠ UI works!

---

## MANDATORY Verification Steps

### ❌ WRONG Workflow (What I Did)
```
1. Write code
2. Run npm run quality ✅
3. See all tests pass ✅
4. Claim "production-ready" ❌ DISASTER
```

### ✅ CORRECT Workflow (What I Should Have Done)
```
1. Write code
2. Run npm run quality ✅
3. 🚨 BROWSE THE UI WITH PLAYWRIGHT MCP 🚨
4. Check browser console for errors
5. Test interactive elements
6. Verify data displays correctly
7. Take screenshots
8. ONLY THEN claim "complete"
```

---

## Step-by-Step Checklist

When working on **ANY** frontend code (components, pages, UI):

### Step 1: Automated Checks
```bash
npm run quality  # Must pass with 0 errors
```

### Step 2: Visual Browser Testing (MANDATORY)
```typescript
// Navigate to the page
mcp__playwright__browser_navigate({
  url: 'http://localhost:3003/your-page'
})

// Get page structure
mcp__playwright__browser_snapshot()

// Check for errors
mcp__playwright__browser_console_messages({ onlyErrors: true })

// Take screenshot
mcp__playwright__browser_take_screenshot({ fullPage: true })
```

### Step 3: Verify These Things

- [ ] **Page loads without crashing**
- [ ] **No red errors in browser console**
- [ ] **All components render visually**
- [ ] **No "undefined", "NaN", or null values displayed**
- [ ] **Interactive elements work** (buttons, toggles, dropdowns)
- [ ] **Real-time updates work** (if applicable)
- [ ] **Forms submit correctly** (if applicable)
- [ ] **No TypeErrors or ReferenceErrors**

### Step 4: Test User Interactions

**Click things!**
- Buttons should trigger actions
- Toggles should switch states
- Dropdowns should expand/collapse
- Forms should validate and submit
- Links should navigate

### Step 5: Only THEN Say "Complete"

**Forbidden phrases before verification:**
- ❌ "All quality checks passed!"
- ❌ "Production-ready!"
- ❌ "Phase complete!"
- ❌ "Ready to deploy!"

**Correct phrasing after verification:**
- ✅ "Quality checks passed ✓ AND browsed UI ✓"
- ✅ "Verified in browser - page loads correctly"
- ✅ "Tested interactive elements - all working"

---

## Examples of What to Catch

### Example 1: CoverageSnapshot Crash (2025-11-11)
```typescript
// ❌ BAD - Will crash if metrics.coveragePercentage is undefined
<Typography>{metrics.coveragePercentage.toFixed(1)}%</Typography>

// ✅ GOOD - Safe fallback
<Typography>{(metrics.coveragePercentage ?? 0).toFixed(1)}%</Typography>
```

**How to catch**: Browse to `/admin`, see if it loads without errors.

### Example 2: API Failures Not Handled
```typescript
// API returns 400 error, but component doesn't handle it
const { data } = await fetch('/api/endpoint')  // Returns 400
setMetrics(data)  // data is undefined or error object
```

**How to catch**: Check browser console for 400/500 errors.

### Example 3: Missing Null Checks
```typescript
// ❌ BAD - Crashes if user.profile is null
<Avatar src={user.profile.avatar} />

// ✅ GOOD - Handles null
<Avatar src={user.profile?.avatar || '/default.png'} />
```

**How to catch**: Browse the page, see if it renders without crashing.

---

## When This Applies

**ANY time you modify:**
- React components (`*.tsx`, `*.jsx`)
- Page files (`app/**/page.tsx`)
- Layout files (`app/**/layout.tsx`)
- Client components (`'use client'`)
- UI-related utilities
- Styling (Tailwind classes, CSS)

**Even for "small changes":**
- ✅ Still browse the UI
- ✅ Still check console
- ✅ Small bugs compound into big problems

---

## Why Automated Tests Aren't Enough

**What `npm run quality` checks:**
- ✅ TypeScript compiles
- ✅ ESLint rules pass
- ✅ Unit tests pass
- ✅ Build succeeds
- ✅ Dev server compiles
- ✅ Console check (basic pages only)

**What it DOESN'T check:**
- ❌ Does the UI actually load in a browser?
- ❌ Are there runtime errors (TypeError, etc.)?
- ❌ Do API calls succeed/fail gracefully?
- ❌ Are there console errors from API failures?
- ❌ Do interactive elements actually work?
- ❌ Is data displayed correctly (not "undefined")?

**Only a real browser can catch these.**

---

## FAQ

### Q: "But tests passed, isn't that enough?"
**A**: NO. Tests don't catch runtime errors, API failures, missing null checks, or visual issues.

### Q: "I made a tiny change, do I really need to browse?"
**A**: YES. Tiny changes can break things unexpectedly. Always verify.

### Q: "What if I forget?"
**A**: The pre-commit hook will ask you. If you skip it and user finds bugs, you've wasted their time.

### Q: "How long does this take?"
**A**: 30-60 seconds to navigate, check console, and verify. Much faster than debugging later.

### Q: "What if the page takes a long time to load?"
**A**: That's a signal something is wrong! Investigate before claiming complete.

---

## Summary

1. ✅ Run `npm run quality`
2. 🚨 **BROWSE THE UI WITH PLAYWRIGHT MCP** 🚨
3. ✅ Check browser console
4. ✅ Test interactions
5. ✅ Only then claim complete

**Never skip step 2.** Ever. No exceptions.

---

**Last Updated**: 2025-11-11 (after the incident that taught us this lesson)
