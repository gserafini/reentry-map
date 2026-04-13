export const MAC_PATCHRIGHT_MODULE =
  '/Users/gserafini/.claude/scripts/social/node_modules/patchright'

function escapeForSingleQuotes(value) {
  return String(value).replace(/'/g, "\\'")
}

export function buildMacPatchrightFetchCommand(url) {
  const safeUrl = escapeForSingleQuotes(url)

  return `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no gserafini@100.72.66.60 "node -e \\"
      const { chromium } = require('${MAC_PATCHRIGHT_MODULE}');
      (async () => {
        const b = await chromium.launch({ headless: true });
        const p = await b.newPage();
        await p.goto('${safeUrl}', { waitUntil: 'networkidle', timeout: 15000 });
        const t = await p.evaluate(() => document.body.innerText);
        await b.close();
        process.stdout.write(t.slice(0, 5000));
      })();
    \\\""`
}
