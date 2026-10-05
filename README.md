# Project Mission Control
Vite + React + TypeScript + Tailwind + Supabase, deployable on Vercel.

## Setup
1. Install Node 18+. Run `npm install`.
2. Create a Supabase project. In the SQL editor, run `supabase/migrations/0001_core.sql` (tables + Row Level Security).
3. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API).
4. In Supabase → Authentication, enable Email. For quick testing, turn off "Confirm email".
5. `npm run dev` / `npm run build` / `npm run preview`.
6. First run: open Timeline and click "Load UH 2026/27 dates" (handbook v0.9; verify on Canvas).

## Vercel
Push to GitHub → import in Vercel (Vite preset) → add the two env vars under Settings → Environment Variables → deploy. `vercel.json` rewrites all routes to `index.html`, so refreshing `/timeline` etc. works.

## Upgrade note
Run `supabase/migrations/0002_guide.sql` after `0001_core.sql` (guided-journey progress).
