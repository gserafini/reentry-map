# Screenshots Command

Take responsive design screenshots at multiple viewport sizes (mobile, tablet, desktop).

## Instructions for Claude

When this command is invoked, you should:

1. **Run the screenshot script**:

   ```bash
   npm run screenshots
   ```

2. **Wait for completion** (takes ~10-15 seconds)

3. **Read and display the screenshots** in this order:
   - Mobile viewport (375x667)
   - Mobile full page
   - Tablet viewport (768x1024)
   - Desktop viewport (1280x800)
   - Desktop full page

4. **Analyze the screenshots** for:
   - Responsive design issues
   - Layout problems
   - Typography/spacing issues
   - Component alignment
   - Visual inconsistencies across viewports

5. **Provide specific feedback** with file:line references for any issues found

## Usage

User can invoke with:

- `/screenshots` - Screenshots of current localhost:3003
- `npm run screenshots` - Direct script execution
- `npm run screenshots http://localhost:3003/some-route` - Screenshots of specific route
- The script automatically captures both viewport and full-page screenshots

## Output

Screenshots are saved to `/tmp/reentry-map-screenshots/` with timestamp-based filenames.

## Notes

- Requires dev server to be running on port 3003
- Takes screenshots at 5 different viewport sizes
- Captures both "above the fold" and full-page screenshots
- Can be used during design work, PR reviews, or before demos
