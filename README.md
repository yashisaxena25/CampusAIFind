# CampusFind AI

**Lost something? Let AI help you find it.**

An AI-assisted lost & found platform for a college campus. Report a lost or
found item; a transparent matching engine compares descriptions, categories,
colors, brands, locations, and timing to suggest possible matches — never
final verdicts. Ownership is always confirmed by the people involved.

This is a working full-stack build of **Phase 1 (MVP core) + the matching
engine + messaging + a basic admin dashboard**, from the original spec's
25-section plan. See "What's built vs. what's next" below for exactly where
the line is.

---

## Quick start

```bash
npm install
cp .env.example .env      # then edit JWT_SECRET at minimum
npm run dev
```

Open http://localhost:3000.

There's no external database to set up — it uses Node's built-in SQLite
(`node:sqlite`, stable enough for this MVP) and stores the file at
`data/campusfind.sqlite`, created automatically on first run.

There's no email server wired up either: when you register, the OTP is
printed to the server console **and** shown directly on the verification
screen (clearly labeled "demo mode"), so the whole signup flow works
out of the box without any provider keys.

### Try the flow

1. Register with an email ending in `.edu`, `.ac.in`, or `.edu.in` (configurable
   in `.env` via `COLLEGE_EMAIL_DOMAINS`).
2. Verify with the on-screen code.
3. Report a lost item at `/lost/new`.
4. In a second browser/incognito window, register a second account and report
   a *similar* found item at `/found/new` — you'll see the AI match score and
   reasons immediately.
5. Visit `/matches` from either account to confirm/reject the match and try
   the built-in messaging thread.
6. To try the admin dashboard, open the SQLite file (or use any SQLite
   client) and run: `UPDATE users SET role='admin' WHERE email='you@college.edu';`
   then visit `/admin`.

---

## Architecture

```
Next.js App Router (single app, frontend + API routes together)
├── Frontend: React Server/Client Components + Tailwind
├── API routes (/src/app/api/**): Node runtime, JWT session auth
├── Data layer: node:sqlite (see "Why not Postgres/Prisma" below)
└── Matching engine: in-process, synchronous (src/lib/match.ts)
```

Matching runs **synchronously on report submission** in this MVP (there's no
job queue yet) — fine at hackathon/small-campus scale. See the roadmap for
when to introduce a queue.

### Why not PostgreSQL + Prisma + pgvector, per the original spec?

That's still the right call for a real deployment, and the schema below
maps cleanly onto it. This build uses `node:sqlite` purely because the
sandboxed environment it was built in couldn't reach Prisma's or
better-sqlite3's binary-download hosts. Swapping the data layer means
rewriting `src/lib/db.ts` (and the raw SQL calls in the API routes) to use
`@prisma/client` — the table shapes don't need to change. Embeddings +
`pgvector` for real semantic search would slot in the same way (see the AI
section below).

### Database schema

| Table | Purpose |
|---|---|
| `users` | account, role (student/faculty/admin), college verification, OTP, ban flag |
| `lost_items` | one row per lost report; public fields vs. private fields split at the API layer |
| `found_items` | one row per found report |
| `matches` | one row per (lost, found) pair scored ≥ threshold; per-signal scores + reasons + status |
| `verifications` | scaffolded for the private Q&A ownership-verification flow (see roadmap) |
| `messages` | per-match internal chat, so users never have to share contact info to talk |

### AI matching engine (`src/lib/match.ts`)

Produces the same *shape* of output the full pipeline should: a 0–100 score,
a per-signal breakdown, and human-readable reasons — e.g.

```
Same category: Water Bottles & Flasks
Same color: Blue
Similar location reported
Found within 1 day(s) of being lost
→ 77% match
```

Today the "text similarity" signal is **token-overlap (Jaccard)**, not LLM
embeddings, and there's no image signal, since no vision model or vector DB
is wired up yet. The weights (`DEFAULT_WEIGHTS`) are just a config object —
tune them or move them to a DB table without touching the scoring logic.

**Upgrade path to the full spec'd pipeline:**
1. Replace `tokenize()`/`jaccard()` in `textSimilarity` with an embeddings
   call (Anthropic/OpenAI/local model) + cosine similarity. Store the
   embedding in `item_images.embedding` (add this column) and use
   `pgvector` for the two-stage retrieve-then-rerank flow described in the
   original spec.
2. Add an `imageScore` the same way, using a vision model to describe the
   uploaded photo, then compare descriptions or embeddings.
3. Everything downstream (weights, thresholds, match statuses, the
   `/matches` UI) stays the same — this is intentionally a drop-in swap.

### Privacy model

Public list/detail endpoints (`GET /api/lost`, `GET /api/found`) return only
non-identifying fields (title, category, color, rough location, date, a
90-character teaser of the description). Full description, brand, model,
identifying marks, and additional details are only returned when
`isOwner` is true. This is enforced server-side in the API route, not just
hidden in the UI.

### Reward flow

Rewards are **pledged only** — no payment integration yet, per spec section 5.
`reward_status` moves `no_reward → reward_offered → reward_released` when the
owner marks their item recovered. Wiring up Razorpay later means: charge/hold
the pledge at creation time, and release it on the same "mark recovered"
action instead of just flipping a status string.

---

## What's built vs. what's next

**Done (this build):**
- College-email + OTP registration, JWT sessions, roles (student/faculty/admin)
- Lost + found multi-step report wizards, image upload (stored as data URLs — see note below)
- Privacy-safe public dashboards with search/category/location filters
- Matching engine + automatic match generation on every new report
- Matches page: confirm / reject / flag-dispute, safe-handover location suggestions
- Per-match internal messaging (no contact info required)
- Admin dashboard: analytics, report moderation (remove fake listings), dispute list, user ban/unban
- Owner actions: mark lost item recovered (releases pledged reward status), mark found item returned, cancel report

**Not built yet (clear next steps, in priority order):**
1. **Ownership verification Q&A flow** (spec §4) — the `verifications` table
   exists but there's no UI/API for "describe one unique thing inside the
   wallet" yet. This is the most important gap for fraud prevention.
2. **Real embeddings + vision AI matching** — see upgrade path above.
3. **Real email delivery** for OTPs (currently console + on-screen only).
4. **External image storage** (Cloudinary/S3) — images are currently stored
   as base64 data URLs directly in SQLite, which is fine for a demo but
   won't scale storage-wise.
5. **Notifications** (email/push) when a new match appears — right now you
   only see it by visiting `/matches`.
6. **Background job queue** (BullMQ + Redis) once matching needs to run
   against thousands of items instead of a full-table scan per submission.
7. **Razorpay integration** for real reward payouts.

---

## Environment variables

See `.env.example`. At minimum, set `JWT_SECRET` to something random before
any shared/deployed use — the default is a dev-only placeholder.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · `node:sqlite` ·
`bcryptjs` · `jsonwebtoken` · `zod`
