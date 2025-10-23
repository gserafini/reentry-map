## Reentry Map — AI assistant instructions

Below are concise, repository-specific instructions for an AI coding assistant (Copilot-style) to be immediately productive in this codebase.

Keep responses short and actionable. Prefer small, incremental edits and run the project's checks locally after making changes.

1. Big picture
 - This is a Next.js (App Router) + Supabase app. Server Components are the default; use 'use client' only for interactive components.
 - Primary folders: `app/` (routes + pages), `components/` (UI pieces), `lib/supabase/` (client/server Supabase helpers), `styles/` (Tailwind input/output), and `ai-agents/` (agent implementations).
 - Data flows: UI -> API routes (or server components) -> Supabase. AI agents run server-side and log to `ai_agent_logs` table.

2. Essential developer workflows (commands)
 - Dev: `npm run dev` (runs Tailwind watcher + Next dev via `concurrently`). If port 3000 is taken Next will auto-pick another port (e.g., 3002).
 - Build: `npm run build` then `npm start` to run production build.
 - Tailwind: `npm run tailwind:build` (single run) or `npm run tailwind:watch` (watch mode).
 - Tests: `npm test` (Vitest), `npm run test:coverage` for coverage.
 - Lint: `npm run lint`.

3. Key patterns & conventions
 - Server Components by default. Example: `app/resources/page.tsx` queries Supabase server-side using `lib/supabase/server.ts`.
 - Create a server Supabase client per-request using `createServerClient` (do not cache globally). See `lib/supabase/server.ts` for cookie handling pattern.
 - Client-side Supabase usage should import `lib/supabase/client.ts` (browser-safe client).
 - Use Zod for schema validation on inputs and API routes. When adding endpoints, validate input early and return 4xx responses with clear messages.
 - Use `loading.tsx` and `error.tsx` in routes to provide loading/error UI for server components.

4. Files to reference for examples
 - `app/layout.tsx` — global layout, font and theme setup, imports compiled `styles/tailwind.css`.
 - `app/page.tsx` — homepage composition (DeployButton, EnvVarWarning, Hero components) and `hasEnvVars` usage.
 - `lib/supabase/server.ts` & `lib/supabase/client.ts` — Supabase client idioms and cookie handling.
 - `styles/tailwind-input.css` and `styles/tailwind.css` — Tailwind source and compiled output; the project runs Tailwind CLI externally.
 - `package.json` — scripts are important; prefer using the script commands rather than duplicating logic.

5. Integration points & secrets
 - Supabase: requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server-only).
 - Google Maps: `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (client) and `GOOGLE_MAPS_KEY` (server).
 - OpenAI: `OPENAI_API_KEY` (server-only). Always use server-side code or API routes for secret usage.

6. Testing and verification
 - After edits run: `npm run lint`, `npm run test`, `npm run tailwind:build` (if changing styles), and `npm run dev` to smoke test in the browser.
 - Keep changes small; prefer adding unit tests under `__tests__` or using `vitest` to assert behavior.

7. Common pitfalls and how to avoid them
 - Do not commit `.next/` or any build artifacts. `.gitignore` already excludes these.
 - Don't globalize the Supabase server client; create a new client per-request (see comment in `lib/supabase/server.ts`).
 - The dev flow uses an external Tailwind watcher to avoid Turbopack/native lightningcss issues — when editing styles run the Tailwind build manually if needed.

8. When creating new APIs or pages
 - Add route in `app/api/.../route.ts` and use `createServerClient()` for DB access.
 - Validate inputs with Zod and return structured JSON errors.
 - Add tests for API behavior and example cURL commands in the route's comments.

9. Commit & PR guidance for AI edits
 - Keep PRs small and focused (one feature/fix per PR).
 - Include the commands used to test the change in the PR description (lint/test/dev steps).
 - If a change touches environment variables, update `.env.example`.

10. Ask for clarification when uncertain
 - If a requested change affects deployment, CI, or DB schema, ask for explicit confirmation.
 - If an edit requires running migrations, request the migration file and the expected SQL changes.

If this looks good, I will commit the file and push. Reply with any missing topics you want included or adjustments to tone/length.
