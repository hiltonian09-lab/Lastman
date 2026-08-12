# Last Man Standing — Product & Architecture Plan

Status: Draft for review · Not yet built
Owner: Hilton (Platform Owner) · Prepared: 2026-08-12

---

## 1. What we're building

A multi-tenant "Last Man Standing" (LMS) football prediction platform with three roles:

| Role | Who | Core capability |
|---|---|---|
| **Player** | General public | Joins games (public or via invite), picks one team per round, tracks status |
| **Game Owner (Admin)** | Pays a per-player admin fee to host a private game | Creates a game, invites players via code/link, sets their own entry fee & prize pool (handled entirely off-platform between them and their players), manages round deadlines |
| **Platform Owner** | You | Creates official/global games open to all users, sets admin-fee pricing, tracks games/users/feedback/revenue platform-wide — never touches player stakes or prize money |

**Money model in one line**: the platform is a software-rental tool, not a stakes-holder. The only money that ever flows through Stripe on this platform is the Game Owner's flat **admin fee for using the software** (£10 minimum + per-player balance — see §6). Entry fees and prize money between a Game Owner and their players are arranged and settled entirely off-platform; the app never collects, holds, or pays out player stakes. This is a deliberate structuring decision to keep the platform out of gambling-regulation territory (see §6 compliance note).

Reference points used to ground the rules and feature set: Tippd, LMS App, My Last Man, Play Last Man, LastManStandingHQ.

---

## 2. Game rules (v1 ruleset)

Standard LMS, configurable per game by the owner:

- Each round, a player picks **one team** to win outright in a selected match.
- A **win** = pick advances. A **draw or loss** = eliminated (or loses a life, if lives are enabled).
- A team **cannot be reused** by the same player within the same game.
- **Lives**: game owner can configure 0–3 extra lives per player (default 0 = single life, classic LMS).
- **Missed pick deadline**: auto-assign policy configurable per game — default is "lowest-alphabetical unused team still in the round," matching the common industry default (Tippd/My Last Man behavior). Owner can instead choose "auto-eliminate on missed pick."
- **Postponed/abandoned fixtures**: pick is voided for elimination purposes — player carries over to next round with that team still available (does not count as a used team, does not count as a win for a competition victory).
- **Winner determination**: if all remaining players are eliminated in the same round, the prize is split equally among them, unless the owner has enabled a tiebreaker (e.g., total-goals prediction on a nominated match) for a sole winner.
- **Multi-league picks**: a Game Owner selects a **set of leagues** for their game at creation (e.g. Premier League + Championship + La Liga). Each gameweek/round, a player's pick pool is the **union of every team with a fixture that week across all selected leagues** — not one pick per league, one pick total from the combined pool. This is what makes the "not enough teams left" problem rare, since a bigger league set means a bigger weekly pool.
- **Round-validity / team-availability rule** (this is the rule you described): a round is valid and goes ahead as long as **every active player has at least one unused team with a fixture that gameweek**, considered per player, not across the whole player base. It does **not** matter if specific already-used teams (e.g. Man Utd, Chelsea) aren't playing that week — those are irrelevant to players who've already used them. The engine computes, per player: `available_pool = teams_with_fixture_this_gameweek(selected_leagues) − player.used_teams`. The round proceeds normally as long as `available_pool` is non-empty for that player. Only if a specific player has exhausted every team playing that week does the missed-pick/auto-assign policy kick in for that player alone — it's a per-player edge case, never a reason to void the whole round.

These are defaults, not hardcoded — every game has a `rules` config (JSON) so owners can tune lives, deadline policy, league set, and tiebreaker behavior per game.

---

## 3. Roles & permissions matrix

| Action | Player | Game Owner | Platform Owner |
|---|---|---|---|
| Browse & join public games | ✅ | ✅ | ✅ |
| Make picks in joined games | ✅ | ✅ (if also playing) | ✅ |
| Create a private game | ❌ | ✅ (after £10 min admin fee) | ✅ |
| Record entry fee / prize pool info (display-only, not processed by platform) | ❌ | ✅ (own games) | ✅ (own games) |
| Generate invite codes/links | ❌ | ✅ (own games) | ✅ (own games) |
| Cap player count | ❌ | ✅ (own games) | ✅ (own games) |
| Create global/open games (visible platform-wide) | ❌ | ❌ | ✅ |
| Set admin-fee pricing (minimum + per-player rate) | ❌ | ❌ | ✅ |
| View platform revenue/analytics, user feedback, game activity | ❌ | ❌ (own game only) | ✅ (all games) |
| Override results / resolve disputes | ❌ | ✅ (own games) | ✅ (any game) |
| Cancel a game (pre-lock) | ❌ | ✅ (own games; £10 min fee non-refundable) | ✅ |

Auth model: every user has a single account with a `role` flag (`player`, `game_owner`, `platform_owner`). `game_owner` is really a capability unlocked the moment someone pays the admin fee to host — any player can become a game owner. `platform_owner` is a fixed flag on your account(s) only, and is now a genuinely lightweight role: pricing config + a dashboard (games, users, feedback, projected/actual revenue) rather than an operator of player money.

---

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + SSR | **Next.js 15 (App Router)** via `@cloudflare/next-on-pages` | Full React ecosystem, file-based routing, server components for fast game/round pages, easiest Stripe SDK support |
| Hosting | **Cloudflare Pages** (Functions on Workers runtime) | Matches requirement; generous free tier; edge latency for global players |
| Database | **Cloudflare D1** (SQLite at the edge) | Matches requirement; relational model fits games/rounds/picks well |
| Object storage | **Cloudflare R2** | Team badges, league logos, user avatars, exported reports |
| Cache / rate limiting | **Cloudflare KV** + Workers Cache API | Cache fixture/results API responses, session tokens, invite-code lookups |
| Background jobs | **Cloudflare Cron Triggers (Workers)** | Poll fixtures API, lock picks at kickoff, resolve rounds after full time, send round-result notifications |
| Auth | **Lucia Auth** or **Auth.js (NextAuth) Cloudflare adapter**, email+password and Google/Apple OAuth, D1-backed sessions | Cloudflare-native, no external auth vendor dependency/cost |
| Payments | **Stripe** — Stripe Checkout + Stripe Connect (Express) | Checkout for entry fees/hosting fees; Connect so game owners can eventually receive prize payouts if you support cash prizes, or skip Connect entirely if all games are "bragging rights + platform takes hosting fee only" |
| Fixtures/results data | **API-Football** (api-sports.io) primary, cached hard in KV/D1 to stay inside rate limits; football-data.org as a free-tier fallback for major leagues only | Live scores, fixture postponement status, results |
| Email/notifications | **Resend** (Cloudflare-friendly) for transactional email; Web Push (optional v2) | Round reminders, elimination notices, invite emails |
| Styling | **Tailwind CSS v4** + shadcn/ui, custom "Royal Blue Premium" theme | Fast to build a premium, consistent UI |
| Monorepo tooling | Single Next.js app to start (no need for a monorepo at MVP scale) | Simpler ops, one deploy target |

### Why not Remix / plain Workers
Next.js gets you the richest component ecosystem and the smoothest Stripe + shadcn/ui integration, at the cost of slightly heavier builds — acceptable given Cloudflare's next-on-pages adapter is mature.

---

## 5. Data model (Cloudflare D1 / SQLite)

```
users
  id (pk), email (unique), password_hash (nullable if OAuth-only),
  name, avatar_url, role ('player' | 'platform_owner'),
  stripe_customer_id, created_at

games
  id (pk), name, slug (unique), owner_id (fk -> users.id),
  type ('private' | 'platform_official'),
  league_ids (json array), rules_json,
  display_entry_fee_cents (nullable, informational only — shown to players, never processed by platform),
  display_prize_pool_note (text, nullable — e.g. "winner takes the pot, paid by organiser"),
  currency, max_players (nullable = unlimited),
  status ('draft' | 'open' | 'locked' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'),
  blocked_at (nullable), blocked_reason (nullable, e.g. 'admin_fee_balance_failed'),
  invite_code (unique, nullable for open/public games),
  visibility ('public' | 'invite_only'),
  starts_at, created_at

admin_fee_config (platform-wide, editable by Platform Owner only)
  id (pk), minimum_fee_cents (default 1000 = £10.00),
  per_player_fee_cents (default 199 = £1.99), currency, effective_from

admin_fee_charges
  id (pk), game_id (fk), owner_id (fk),
  stripe_customer_id, stripe_payment_method_id (saved after the minimum-fee Checkout, for the off-session balance charge),
  minimum_fee_cents, minimum_fee_payment_intent_id, minimum_fee_status ('pending'|'paid'|'failed'),
  balance_cents (nullable until computed at round-1 lock),
  balance_payment_intent_id, balance_status ('not_due'|'pending'|'paid'|'failed'|'retrying'),
  player_count_at_lock (nullable until round-1 locks),
  created_at, balance_charged_at

game_entries
  id (pk), game_id (fk), user_id (fk),
  lives_remaining, status ('active'|'eliminated'|'winner'),
  joined_at, eliminated_at_round_id (nullable)

rounds
  id (pk), game_id (fk), round_number,
  deadline_at, status ('upcoming'|'locked'|'resolved'),
  created_at
  -- no single league_id: a round's team pool spans every league in games.league_ids,
  -- computed at pick-time from fixtures within that gameweek's date window

fixtures
  id (pk), external_id (from data provider), league_id,
  home_team_id, away_team_id, kickoff_at,
  status ('scheduled'|'live'|'postponed'|'finished'|'abandoned'),
  home_score, away_score, updated_at

picks
  id (pk), round_id (fk), game_entry_id (fk), fixture_id (fk),
  team_id (picked team), result ('pending'|'win'|'loss'|'draw'|'void'),
  auto_assigned (bool), created_at

teams
  id (pk), name, short_name, crest_url, league_id

leagues
  id (pk), name, country, provider_id

invites
  id (pk), game_id (fk), code (unique), created_by (fk -> users.id),
  max_uses (nullable), uses_count, expires_at

game_messages
  id (pk), game_id (fk), sender_id (fk -> users.id, must be the game owner),
  body (text, max ~1000 chars), sent_at

notifications
  id (pk), user_id (fk), type ('round_reminder'|'elimination'|'owner_broadcast'|'game_blocked'|'game_unblocked'|...),
  payload_json, read_at, created_at
```

Indexes: `game_entries(game_id, user_id)` unique; `picks(game_entry_id, round_id)` unique (one pick per round); `picks` unique on `(game_entry_id, team_id)` where team already used, enforced at application layer plus a DB check.

---

## 6. Stripe integration — admin fee only, single money flow

The platform has exactly **one** Stripe money flow: the Game Owner paying the platform for the use of the software. Player-to-player entry fees and prize money are never processed, held, or transferred by the platform — they're arranged directly between the Game Owner and their players, off-platform. The app only ever *displays* what the organiser tells it (`display_entry_fee_cents`, `display_prize_pool_note`) for the players' benefit; those fields are never wired to Stripe.

**Two-step admin fee, matching your spec:**

1. **£10.00 minimum fee, charged upfront, non-refundable.** When a Game Owner publishes a private game, they go through Stripe Checkout for the £10 minimum. Checkout is set to `setup_future_usage: off_session` so the card is saved for step 2. Recorded in `admin_fee_charges` (`minimum_fee_*`). Game moves to `open` once this succeeds. Cancelling the game afterward does **not** refund this fee (matches your instruction).
2. **Balance charged after the round-1 pick deadline (roster lock).** Once round 1 locks, a Cron-triggered Worker counts `player_count_at_lock` for that game and computes:
   `balance_cents = max(0, player_count_at_lock × per_player_fee_cents − minimum_fee_cents)`
   e.g. 12 players × £1.99 = £23.88, minus the £10 already paid = **£13.88** charged off-session to the saved card. If the game only attracts ≤5 players (5 × £1.99 = £9.95), the balance is £0 — the £10 minimum already covers it, which is exactly the floor it's designed to be.
3. **Failed balance charge handling** (per your instruction): retry with Stripe's built-in Smart Retries first. If it still fails after the retry window, the **entire game is blocked**: `games.status → 'blocked'`, `blocked_reason = 'admin_fee_balance_failed'`. Every player in that game loses access — the game/pick/standings pages show a "this game is temporarily unavailable" state instead of game content, and no further picks can be made or resolved. The Game Owner gets a persistent banner + notification with a link to update their payment method and retry the charge. As soon as the balance is paid, `status` returns to `in_progress` and access is restored for everyone; the current round's deadline is automatically extended by however long the game was blocked, so players aren't penalised for the organiser's billing issue. Players see a plain-language reason ("the organiser's payment needs updating") rather than a generic error.

**Platform Owner controls** (`admin_fee_config`, editable at any time, versioned by `effective_from` so past games keep the pricing they were created under): minimum fee amount, per-player rate, currency.

**Revenue dashboard** for the Platform Owner: total admin fees collected, minimum-fee-only games vs. games that crossed into balance-due territory, failed/retrying charges, games/players/feedback overview — pure analytics, no stakes-tracking.

**Compliance note — why this materially reduces (not eliminates) regulatory exposure**: because the platform never collects or distributes player stakes or prize money, and the admin fee is flat, charged regardless of outcome, and scoped to software usage (per-player, not per-pound-staked), this looks much more like SaaS billing than gambling operation. To keep it that way in substance, not just label: (a) never let the per-player fee scale with the entry fee or prize size the organiser sets, (b) keep the Terms of Service explicit that the platform doesn't hold, guarantee, or arbitrate any prize pool, and (c) still get a quick solicitor sanity-check before charging real money at scale — "we never touch player money" is a strong position but not a substitute for actual legal sign-off in your target jurisdiction(s).

---

## 7. Invitations & owner-to-league communication

- Every private game gets a unique **invite code** (e.g. `LMS-8F3K2Q`) and a shareable link `https://app.tld/join/8F3K2Q`.
- Owner can set `max_uses` and `expires_at` on the code.
- Joining via code auto-registers the pending user into `game_entries` once they sign up/sign in.
- Public/platform-official games skip invite codes entirely — visible in a "Browse Games" list, joinable by any authenticated user until `max_players` or `starts_at` is hit.
- **Broadcast messages**: the Game Owner can send a message to every player currently in their game (`game_messages`) — e.g. "picks lock Friday 6pm," "prize pool update," "well played everyone." Delivered as an in-app notification to all `game_entries` for that game, plus an email via Resend for players who have email notifications enabled. One-way (owner → league), not a group chat, to keep v1 simple; a full chat thread is a plausible v2 addition if there's demand.

---

## 8. Platform Owner console (your role)

A dedicated `/owner` admin area (gated by `role = 'platform_owner'`), scoped to exactly what you described — track, price, and observe, without ever handling player money:

- Create **platform official games** — same game engine as private games, but `type = 'platform_official'`, visible to all users, with owner-set `max_players` and league selection (these can be admin-fee-exempt or use the same fee model, your call).
- Global settings: admin-fee minimum + per-player rate (`admin_fee_config`), featured games, banned users, fixture-data provider health.
- Revenue dashboard: total admin fees collected, split by minimum-only vs. balance-charged games, failed/retrying charges, active games, players per game.
- Users & feedback: user list/search, a lightweight in-app feedback/reports inbox, game activity feed.
- Manual override tools: force-resolve a round, correct a fixture result. (No refund tooling needed for entry fees/prizes since the platform never processes them; only the admin fee itself is ever refundable, and per your rule the £10 minimum isn't.)

---

## 9. Design system — "Royal Blue Premium"

No existing site to pull from, so this is a from-scratch premium direction:

- **Primary**: deep royal blue `#1B2A6B` → accent royal blue `#2A3FCE`
- **Background**: near-black navy `#0B0F1F` (dark mode default) with a light-mode alternate `#F5F7FC`
- **Accent/metallic**: warm gold `#C9A344` for winner states, prize amounts, and premium CTAs (sparingly — this is the "premium" signal)
- **Surface elevation**: subtle glassmorphism cards (`backdrop-blur`, 1px translucent borders) over the navy background — evokes a premium sports-book / fantasy-football feel
- **Typography**: a confident geometric sans for headings (e.g. Space Grotesk / General Sans), clean neutral sans for body (Inter)
- **Status colors**: alive = emerald green, eliminated = muted red/grey desaturated (never harsh — losing shouldn't feel punitive), pending pick = amber
- **Motion**: minimal, purposeful — round countdown timers, pick confirmation micro-animations, elimination reveal transitions

I'd mock up a homepage, game dashboard, and pick screen as an interactive artifact once the plan is approved, so you can react to the actual look before any real frontend code is written.

---

## 10. Core screens (MVP)

**Player**
- Landing / marketing page
- Sign up / login
- Browse games (public + "join via code")
- Game dashboard (my picks history, current round countdown, standings/survivors list, owner broadcast messages)
- **Fixtures view**: every fixture for the current gameweek across the game's selected leagues, with a prominent "next upcoming fixture" card (kickoff countdown) at the top — this is what a player sees before making their pick, and also what tells them why a team is or isn't in their pick pool that week
- Pick screen (available team pool for current round — teams with a fixture this gameweek, minus teams already used — team selector, deadline countdown)
- Profile & payment history
- Blocked-game state: if a game's admin-fee balance charge failed, players see a clear "this game is temporarily unavailable — the organiser's payment needs updating" screen instead of game content

**Game Owner**
- "Host a game" flow → configure rules and league set, optionally note an entry fee/prize pool for display only → Stripe Checkout for the £10 minimum admin fee (card saved for later balance charge) → game created in `open`
- Game management dashboard: invite link/code, entrants list, round-by-round results and fixtures, manual overrides, admin-fee status (minimum paid, balance pending/charged/failed)
- **Broadcast message composer**: send a message to every player in the game, delivered in-app + email
- Publish/cancel controls (cancelling after publish does not refund the £10 minimum)
- If the balance charge fails and the game gets blocked: a persistent "update payment method & retry" banner, since resolving this is the only way to restore the game for their players

**Platform Owner**
- `/owner` console: create official games, admin-fee pricing config, revenue dashboard, users & feedback, game activity/moderation

---

## 11. Cloudflare deployment plan

1. `wrangler.toml` targeting Pages project, D1 binding, KV binding, R2 binding, Cron Trigger for round-resolution worker.
2. Environments: `preview` (per-PR Cloudflare Pages preview deploys) and `production`.
3. D1 migrations managed via `wrangler d1 migrations`.
4. Secrets (Stripe keys, API-Football key, auth secrets) via `wrangler secret put`, never committed.
5. Cron worker (every 5–10 min during matchdays) to: pull live fixture updates, lock rounds at kickoff, resolve picks after full-time, push notifications.
6. Custom domain via Cloudflare DNS, automatic TLS.

---

## 12. Build phases

| Phase | Scope |
|---|---|
| **0 — Foundation** | Repo scaffold, Cloudflare Pages + D1 wired up, auth working, design system tokens in Tailwind |
| **1 — Core game engine** | Games, rounds, picks, fixture sync, elimination logic, standings — no payments yet, games are free to host/join |
| **2 — Player experience polish** | Browse/join UX, dashboards, notifications, mobile-responsive pass |
| **3 — Stripe: admin fee** | £10 minimum fee at publish (with saved card), automatic balance charge at round-1 lock, failed-charge handling |
| **4 — Platform Owner console** | Official/global games, admin-fee pricing config, revenue dashboard, users & feedback |
| **5 — Hardening & launch** | Rate limiting, abuse prevention on invite codes, load testing around kickoff times, light legal review of the admin-fee ToS language |

---

## 13. Open decisions needed from you before Phase 3+

1. ~~Real money payouts~~ — resolved: platform never touches player stakes or prize money; only the flat admin fee flows through Stripe.
2. ~~Platform cut % / hosting fee~~ — resolved: £10 minimum admin fee (non-refundable) + £1.99/player balance charged at round-1 lock. Confirm these defaults live in `admin_fee_config` and whether they should ever vary (e.g. a cheaper rate for platform-official games you run yourself).
3. **Jurisdiction**: which country/countries will this launch in first? Mostly relevant now for currency/localisation rather than gambling licensing, but still worth confirming for the ToS wording.
4. **Data provider budget**: API-Football paid tier ($) needed once past prototype rate limits — acceptable ongoing cost?
5. **Branding**: final name/logo — "Last Man Standing" is a generic/commonly-used term industry-wide, worth checking trademark conflicts (e.g. "LMS", "Tippd", "My Last Man" already exist) before settling on a final brand name.
6. **Failed balance-charge policy**: is "block the organiser from publishing new games until they pay" the right enforcement, or would you rather see something softer (e.g. a warning + grace period) given it doesn't affect players in the already-running game?

---

## Next step

Once you sign off on this plan (and the open decisions above), I'll scaffold the Next.js + Cloudflare project structure, D1 schema/migrations, and build the "Royal Blue Premium" homepage + pick screen as an interactive mockup so you can approve the look before we build out the full game engine.
