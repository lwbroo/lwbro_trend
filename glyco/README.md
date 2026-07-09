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
- **Today strip & streak**: today's meals / carbs / glycemic load at a glance, logging streak
- **Burn it off**: when today's glycemic load runs high, concrete exercise suggestions sized to the excess
- All data stays in your browser's localStorage; JSON export available

## Usage

Pure static web app, no backend:

```bash
cd glyco
python3 -m http.server 8000
# open http://localhost:8000
```

First run: open **Settings** and paste your own Anthropic API key
([create one here](https://platform.claude.com/settings/keys)).
The key is stored only in your browser; the app talks directly to the Anthropic API.

## Architecture (hybrid: AI recognizes, local data decides)

| Job | Done by |
|---|---|
| Photo → foods & portions | Claude vision model (`js/api.js`) |
| Food → GI / carbs | Built-in database lookup (`js/gidb.js`, ~190 Western & Asian foods) |
| Eating order, tips, meal GL | Local rule engine (`js/order.js`), zero tokens |

- GI values primarily referenced from the University of Sydney GI Database and nutrition literature; carbs approximate
- Foods missing from the database fall back to AI estimates, marked 🤖
- Photos are downscaled client-side (1344px long edge JPEG) and sent base64 to the Claude Messages API
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) (`output_config.format` + JSON Schema) guarantee a fixed response shape
- Direct browser calls require the `anthropic-dangerous-direct-browser-access: true` header
- Default model `claude-haiku-4-5` (~US$0.003/photo); `claude-opus-4-8` selectable

## Roadmap

- [ ] Trends: followed-order vs not, feeling & glucose over time (reuse lwbro_trend charts)
- [ ] Guided meal mode ("start eating" → step-by-step pacing)
- [ ] Reminders / gamification
- [ ] HealthKit / CGM integration
- [ ] Capacitor wrap → App Store (with backend proxy so users don't need their own API key)

## Development notes (session handoff)

- **Live URL**: https://lwbroo.github.io/lwbro_trend/glyco/ — GitHub Pages serves the repo's
  **default branch** (`claude/zi-wei-ba-zi-planner-rnaz10`) from the root; this app lives in `glyco/`.
- **Deploy convention**: commit on a work branch, then fast-forward push it onto the default branch
  (`git push origin <work-branch>:claude/zi-wei-ba-zi-planner-rnaz10`). Pages redeploys automatically (~40s).
- **Verification**: drive the app in headless Chromium with the Anthropic API mocked
  (`page.route("https://api.anthropic.com/**", ...)` returning a recognition JSON) — checks DB matching,
  order engine, follow-up persistence without spending tokens.
- **Current state (v0.4)**: English UI · hybrid architecture (see table above) · meal log with follow-up
  (followed-order / feeling 1–5 / optional glucose, stored as `record.followup`) · Today strip + streak +
  burn-it-off card (triggers when today's GL > 60).
- **Pending decision**: visual redesign — four directions (A Clinical Calm / B Midnight Metabolic /
  C Kitchen Journal / D Citrus Energy) were proposed; waiting for the owner to pick one, then rebuild
  `css/style.css` (and only it, ideally) in that direction.
- **Next on roadmap** (owner-approved order): design rebuild → trends charts (reuse `../js/charts.js`)
  → guided meal mode → Capacitor/App Store with backend proxy.

> For dietary-order guidance only — not medical advice. If you have diabetes, follow your doctor's and dietitian's instructions.
