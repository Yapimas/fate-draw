# Fate Draw ✦

One fate card a day. A random adjective + noun becomes your destiny ("Feral
Landlord"), a score of 0–100 decides how the universe feels about you, and a
prophecy is drawn from that verdict.

## Features

- **Magic-link style login** (demo mode): enter an email, "check your inbox",
  tap the link, pick a username — no passwords.
- **No login wall**: the app opens straight into a guest slot ("Wanderer").
  "Sign in ✦" sits in the top bar for anyone who wants an account; the guest's
  cards and streak migrate into the account on first sign-in, and signing out
  returns you to guest mode instead of a locked door.
- **One draw per day, per user**, resetting at **midnight UTC** (not local
  time). If you've already drawn, the app silently shows today's card again
  with a friendly note — never an error.
- **Streaks**: +1 for each consecutive UTC day; miss a day and it's back to 0.
- **Collection page**: every past card with date, score, category and comment,
  most recent first. Tap any tile to reopen the full card and re-download it.
- **Shareable 9:16 card** (mobile story format) in dark tarot styling.
  "Save / Share" exports a high-res PNG (~1080×1920) and uses the native share
  sheet on supporting devices (Instagram/WhatsApp), or downloads the file.
- **Card-pick ceremony with synthesized sound**: a burst of cards flies out,
  three face-down survivors remain, you pick one, the losers shatter into
  fragments, and your card spins down like a slot reel with synced ticks —
  capped by a reward fanfare that scales with rarity (Disaster's comic deflation
  → Absolute Fate's full dopamine cascade). All SFX are generated live with the
  Web Audio API (`src/lib/sounds.ts`), no audio files needed.
- **🧪 Test mode**: toggle the beaker chip in the top bar to unlock a
  "↻ Redraw (test)" button under today's card — it deletes today's record and
  reruns the ceremony as many times as you like (streak math untouched).
  The preference persists across reloads.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # typechecks then bundles into dist/
npm run preview  # serve the production build locally
```

## Demo-mode data & auth

Everything lives in `localStorage` under the `fatedraw.*` keys:

| Key                    | Contents                                   |
| ---------------------- | ------------------------------------------ |
| `fatedraw.store.v1`    | users (email → username) and all draws     |
| `fatedraw.session.v1`  | currently signed-in email                  |

To wipe everything (fresh streaks, empty collection):

```js
localStorage.clear() // run in DevTools console
```

The magic link is simulated: after entering an email you get a mock inbox with
an "Open Magic Link" button. The flow mirrors a real implementation exactly.

## Daily reset rule

"Today" is computed as `new Date().toISOString().slice(0,10)` — always the UTC
date, regardless of the viewer's timezone (`src/lib/utc.ts`). A draw stored for
`2026-08-25` stays visible until `2026-08-26T00:00:00Z`.

## Streak logic

Consecutive days ending today — or yesterday, if you haven't drawn yet today
(`computeStreak` in `src/lib/fate.ts`). Miss one day → reset to 0.

## Score → category mapping

Ranges live directly in `comments.json` and are applied in file order:
Disaster 0–10 · Bad 10–30 · Neutral 30–60 · Good 60–85 · Legendary 85–99 ·
Absolute Fate 100.

## Project structure

```
src/
  App.tsx                 state machine: auth → username → home ⇄ collection
  components/
    AuthView.tsx          email form + mock inbox with magic-link button
    UsernameView.tsx      first-time username setup
    HomeView.tsx          draw button / today's card / streak / UTC countdown
    CollectionView.tsx    stats + history grid + full-card modal
    FateCard.tsx          the 9:16 shareable card (deterministic starfield)
  lib/
    utc.ts                UTC date helpers + countdown math
    fate.ts               random draws, category mapping, streak calc
    storage.ts            localStorage-backed users/sessions/draws
    exportCard.ts         PNG export + native share sheet
  data/                   adjectives.json · nouns.json · comments.json
```

## Upgrading to real emails later

The UI flow was designed to match Supabase/Firebase magic links 1:1. Swap
`sendMagicLink` / `consumeMagicLink` in `src/lib/storage.ts` for
`supabase.auth.signInWithOtp({ email })` + session detection, replace the
localStorage store with database queries, and keep every component as-is.
