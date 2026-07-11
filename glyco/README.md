# GlycoOrder · Eat in the Right Order (POC)

Snap a photo of your meal — AI identifies the foods, the built-in database supplies each item's
**glycemic index (GI)**, and a local rule engine tells you the smartest **eating order**
(fiber → protein & fat → starches & sugars last) to blunt the post-meal glucose spike.
The goal: don't change *what* you eat — change the *order* you eat it in.

## Features

- **Photo analysis**: snap or pick a meal photo, optional text note
- **Food breakdown**: portion estimate, category, GI level (Low/Med/High) + value, carbs — each item tagged 📚 database or 🤖 AI estimate
- **Eating order**: step-by-step plan with the reason for each step
- **Tips**: 2–4 concrete suggestions for this exact meal
- **Meal log with follow-up**: log meals, then record whether you followed the order, how you felt 1–2h later, and (optionally) your post-meal glucose — building your personal evidence that order matters
- **Trends dashboard**: turns your follow-up log into personal evidence — average feeling & post-meal glucose broken down by whether you followed the order, plus both metrics' trend over time (reuses `../js/charts.js`)
- **Today strip & streak**: today's meals / carbs / glycemic load at a glance, logging streak
- **Burn it off**: when today's glycemic load runs high, concrete exercise suggestions sized to the excess
- All data stays in your browser's localStorage; JSON export available

## Usage

Static PWA frontend + a small backend proxy (`../glyco-server/`) that holds the Anthropic key
server-side so users don't need their own:

```bash
# from the repo root — index.html loads ../js/charts.js (shared with the sibling app),
# which 404s if you serve from inside glyco/ instead
python3 -m http.server 8000
# open http://localhost:8000/glyco/
```

The frontend calls a deployed `glyco-server` instance by default (see `js/api.js` →
`PROXY_BASE`) — point it at a local instance for development:

```bash
cd glyco-server
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY + Upstash Redis + RevenueCat secrets
npm start               # listens on :8080
```

No Settings screen setup is required anymore — analysis "just works" up to the free-tier
weekly quota (5 photos/week); unlimited access is a subscription (RevenueCat, App Store /
Play Store only — the plain web PWA stays free-tier).

## Architecture (hybrid: AI recognizes, local data decides)

| Job | Done by |
|---|---|
| Photo → foods & portions | Claude vision model, server-side (`glyco-server/src/lib/anthropicClient.js`) |
| Quota / entitlement gating | `glyco-server` (Upstash Redis quota counter + RevenueCat-webhook-fed entitlement cache) |
| Food → GI / carbs | Built-in database lookup, client-side (`glyco/js/gidb.js`, ~190 Western & Asian foods) |
| Eating order, tips, meal GL | Local rule engine (`glyco/js/order.js`), zero tokens |

- GI values primarily referenced from the University of Sydney GI Database and nutrition literature; carbs approximate
- Foods missing from the database fall back to AI estimates, marked 🤖
- Photos are downscaled client-side (1344px long edge JPEG) and POSTed base64 to `glyco-server`'s `/api/analyze`, which relays to the Claude Messages API with the key never leaving the server
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) (`output_config.format` + JSON Schema) guarantee a fixed response shape
- Model is fixed server-side to `claude-haiku-4-5` (~US$0.003/photo) — no client-side model choice anymore, both for cost control and so a compromised/tampered client can't force expensive calls through the proxy
- Free tier: 5 analyses/week (device-scoped, tracked in Redis). Paid tier: unlimited, managed by RevenueCat; the same device ID doubles as RevenueCat's `appUserID` so quota tracking and entitlement lookups share one identity

## Roadmap

- [x] Trends: followed-order vs not, feeling & glucose over time (reuse lwbro_trend charts)
- [x] Backend proxy + weekly quota + paywall shell (`glyco-server/`, RevenueCat wiring stubbed pending Capacitor)
- [ ] Capacitor wrap (iOS + Android), real RevenueCat purchase flow, App Store / Play Store submission
- [ ] Guided meal mode ("start eating" → step-by-step pacing)
- [ ] Reminders / gamification
- [ ] HealthKit / CGM integration

## Development notes (session handoff)

- **Live URL**: https://lwbroo.github.io/lwbro_trend/glyco/ — GitHub Pages serves the repo's
  **default branch** (`claude/zi-wei-ba-zi-planner-rnaz10`) from the root; this app lives in `glyco/`.
- **Deploy convention**: commit on a work branch, then fast-forward push it onto the default branch
  (`git push origin <work-branch>:claude/zi-wei-ba-zi-planner-rnaz10`). Pages redeploys automatically (~40s).
- **Verification**: drive the app in headless Chromium with `glyco-server`'s endpoints mocked
  (`page.route("**/api/analyze", ...)` / `**/api/quota**` returning canned JSON) — checks DB matching,
  order engine, follow-up persistence, quota chip/paywall behavior without spending tokens or needing
  real Upstash/RevenueCat accounts. `glyco-server` itself has its own `node --test` suite
  (`glyco-server/test/`) using in-process HTTP stubs for Anthropic/Upstash/RevenueCat — no real
  credentials needed there either. Periodically also run one **non-mocked** local pass (real
  `glyco-server` + stubbed Anthropic/Redis, real frontend, real browser fetch) to catch CORS
  misconfiguration between the two origins — the one failure mode pure route-mocking can't surface.
- **i18n**: `js/i18n.js` holds en/zh dictionaries; `I18n.t(key, params)` for dynamic strings,
  `[data-i18n]` / `[data-i18n-html]` / `[data-i18n-ph]` attributes for static DOM. Language persists
  in settings, defaults from `navigator.language`. The recognition prompt (`api.js`) switches per
  language so food names come back localized; the order/tips/summary are rebuilt at render time so a
  live language switch re-translates the on-screen result. Food names in *saved* records are a snapshot
  in the language they were analyzed in.
- **Current state (v0.8)**: EN + 繁中 UI · Clinical Calm design (light/dark theme) · hybrid architecture
  (see table above) · meal log with follow-up (followed-order / feeling 1–5 / optional glucose, stored
  as `record.followup`) · Today strip + streak + burn-it-off card (triggers when today's GL > 60) ·
  **Trends tab** — personal-evidence dashboard: avg feeling / avg post-meal glucose grouped by whether
  the order was followed (bar charts, low-n bars dimmed), plus feeling/glucose trend lines over time
  (stays free for everyone — not a paywall differentiator) · **backend proxy** (`glyco-server/`) —
  no more user-supplied API key; free tier 5 analyses/week (quota chip on the Analyze tab, paywall
  modal on exhaustion), paid tier unlimited via RevenueCat. The RevenueCat purchase/restore calls
  themselves are stubbed (`isNative()`-gated no-ops in `app.js`) pending the Capacitor phase — the
  paywall UI, quota display, and backend quota/entitlement plumbing are real and tested.
- **charts.js is now theme- and domain-generic** (shared with the sibling app at `../js/charts.js`):
  `lineChart`/`barChart` read ink/grid/baseline colors from CSS custom properties at render time
  (`--ink`/`--ink-2`/`--muted`/`--grid`/`--baseline`/`--surface` — falls back to the sibling app's
  original light-theme hex if a variable isn't defined) instead of a hardcoded light palette, so dark
  mode renders correctly. `lineChart` accepts `opts.yMin`/`yMax`/`yStep` (default 1/5/1, the mood scale)
  and `barChart` accepts `opts.yMax`/`yStep`/`decimals` (default 5/1/1) for arbitrary ranges like
  glucose mg/dL. Both also accept `opts.emptyText`/`opts.tipFormat` so callers can localize the
  previously hardcoded Chinese empty-state and tooltip strings. `glyco/css/style.css` defines
  `--grid`/`--baseline` (aliased to `--line`/`--line-strong`) so this resolves per theme.
- **`glyco-server/`** (new, sibling folder): Node/Express, deployed to Render with **Root Directory =
  `glyco-server`** (this repo's first non-whole-repo Render service — the sibling `gigi-stock-war-room-2`
  project deploys its whole repo as one service, this one doesn't). Routes: `POST /api/analyze` (recognition,
  quota decrement/entitlement check), `GET /api/quota`, `POST /api/entitlement/sync` (on-demand RevenueCat
  refresh, called after purchase/restore), `POST /api/revenuecat/webhook` (keeps the entitlement cache warm
  so `/api/analyze`'s hot path never makes a synchronous RevenueCat call). Quota + entitlement cache both
  live in Upstash Redis (REST API, no client library) — see `.env.example` for the full env var list.
- **Owner action needed before this goes live** (no Mac required, just dashboard/account setup): create an
  Upstash Redis database, create the Render web service for `glyco-server` and fill in its env vars
  (`ANTHROPIC_API_KEY` especially), create a RevenueCat project + entitlement + webhook pointed at the
  deployed service. Then update `PROXY_BASE` in `glyco/js/api.js` from the placeholder to the real Render URL.
- **Mac-only follow-up** (not doable in a remote/Linux session): Capacitor scaffolding (`npx cap add ios`
  / `android`), a real PNG icon set replacing `manifest.webmanifest`'s single SVG, wiring
  `@revenuecat/purchases-capacitor` into the stubbed `app.js` calls, Xcode/Android Studio signing+build,
  Apple Developer Program + App Store Connect + App Review, Google Play Console + Data Safety form, and
  HealthKit (steps/CGM auto-read, explicitly a later phase).
- **Next on roadmap** (owner-approved order): Capacitor/App Store submission (above) → shareable result
  card (canvas → PNG) → PWA push reminders → guided meal mode.

> For dietary-order guidance only — not medical advice. If you have diabetes, follow your doctor's and dietitian's instructions.
