# Fate Draw

One fate card a day. A random adjective + noun becomes your destiny ("Feral Landlord"), a score of 0–100 decides how the universe feels about you, and a prophecy is drawn from that verdict.

## Features

- **Username/password authentication** with SHA-256 hashing (Web Crypto API) + JWT. Register or sign in — no magic links, no external email dependency.
- **No login wall**: the app opens straight into a guest slot ("Wanderer"). "Sign in" sits in the top bar for anyone who wants an account; the guest's cards and streak migrate into the account on first sign-in, and signing out returns you to guest mode instead of a locked door.
- **One draw per day, per user**, resetting at **midnight UTC** (not local time). If you've already drawn, the app silently shows today's card again with a friendly note — never an error.
- **Streaks**: +1 for each consecutive UTC day; miss a day and it's back to 0.
- **Collection page**: every past card with date, score, category and comment, most recent first. Tap any tile to reopen the full card and re-download it.
- **Shareable 9:16 card** (mobile story format) in dark tarot styling. "Save" exports a high-res PNG (~1080×1920), copies to clipboard, uses the native share sheet on supporting devices (Instagram/WhatsApp), or downloads the file.
- **Card-pick ceremony with synthesized sound**: a burst of cards flies out, three face-down survivors remain, you pick one, the losers shatter into fragments, and your card spins down like a slot reel with synced ticks — capped by a reward fanfare that scales with rarity (Disaster's comic deflation → Absolute Fate's full dopamine cascade with slot machine win sound). All SFX are generated live with the Web Audio API (`src/lib/sounds.ts`), no audio files needed.
- **Terms & Privacy modal** with entertainment disclaimer.
- **XP & Level system**: earn XP based on card rarity + streak multiplier, level up over time.
- **Daily Leaderboard**: see top draws of the day sorted by rarity.
- **Profile dropdown**: click your avatar to see XP, level, stats, and sign out.

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

## Data & auth

Everything lives in `localStorage` under the `fatedraw.*` keys:

| Key                    | Contents                                   |
| ---------------------- | ------------------------------------------ |
| `fatedraw.store.v2`    | users (email → username + password_hash) and all draws |
| `fatedraw.session.v2`  | currently signed-in email                  |

To wipe everything (fresh streaks, empty collection):

```js
localStorage.clear() // run in DevTools console
```

Passwords are hashed client-side using SHA-256 via the Web Crypto API (`src/lib/auth.ts`). No Node.js crypto modules in the browser bundle.

## Daily reset rule

"Today" is computed as `new Date().toISOString().slice(0,10)` — always the UTC date, regardless of the viewer's timezone (`src/lib/utc.ts`). A draw stored for `2026-08-25` stays visible until `2026-08-26T00:00:00Z`.

## Streak logic

Consecutive days ending today — or yesterday, if you haven't drawn yet today (`computeStreak` in `src/lib/fate.ts`). Miss one day → reset to 0.

## XP & Level System

- Base XP per rarity: Disaster 10, Bad 20, Neutral 30, Good 50, Legendary 100, Absolute Fate 200
- Streak multiplier: 1x (streak 0-2), 1.25x (3-6), 1.5x (7-13), 2x (14+)
- XP required per level: 100 * level^1.5 (escalating)
- Level displayed in profile dropdown

## Score → category mapping

Ranges live directly in `comments.json` and are applied in file order:
Disaster 0–10 · Bad 10–30 · Neutral 30–60 · Good 60–85 · Legendary 85–99 · Absolute Fate 100.

## Project structure

```
src/
  App.tsx                 state machine: auth (login/register) → username → home ⇄ collection ⇄ leaderboard
  components/
    LoginView.tsx         email + password sign in
    RegisterView.tsx      email + username + password registration
    UsernameView.tsx      first-time username setup
    HomeView.tsx          draw button / today's card / streak / UTC countdown
    CollectionView.tsx    stats + history grid + full-card modal
    LeaderboardView.tsx   daily leaderboard sorted by rarity
    FateCard.tsx          the 9:16 shareable card (deterministic starfield)
    CardPickOverlay.tsx   ceremony animation (burst, pick, spin, reveal)
    LegalModal.tsx        terms & privacy modal
    ProfileDropdown.tsx   user profile menu with XP, level, stats
  lib/
    utc.ts                UTC date helpers + countdown math
    fate.ts               random draws, category mapping, streak calc, XP calc
    storage.ts            localStorage-backed users/sessions/draws (username/password + XP)
    auth.ts               SHA-256 hashing, JWT utilities (browser-compatible)
    exportCard.ts         PNG export + clipboard + native share sheet
    sounds.ts             Web Audio API synthesized SFX (slot machine win for Absolute Fate)
  data/                   adjectives.json · nouns.json · comments.json
```

## Environment variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_JWT_SECRET=your-jwt-secret
```

Supabase is optional — used only for cloud sync of draws/username. Without it, everything works locally.

## Supabase schema (optional)

```sql
create table profiles (
  id uuid references auth.users primary key,
  username text unique,
  password_hash text,
  xp int default 0,
  level int default 1,
  updated_at timestamp with time zone default now()
);

create table draws (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  draw_date date not null,
  card_name text not null,
  score int not null,
  category text not null,
  comment text,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;
alter table draws enable row level security;

create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can read own draws" on draws for select using (auth.uid() = user_id);
create policy "Users can insert own draws" on draws for insert with check (auth.uid() = user_id);
create policy "Users can delete own draws" on draws for delete using (auth.uid() = user_id);
```

Run: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;` (adds password column for local auth).