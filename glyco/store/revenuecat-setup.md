# RevenueCat dashboard setup

The app and backend already assume specific identifiers below (hardcoded, not
guesses) — matching them exactly in the dashboard means zero code changes after
this setup, just filling in keys.

## 1. Create the project
1. Sign up / log in at https://app.revenuecat.com
2. Create a new project (e.g. "GlycoOrder")

## 2. Add the two apps
- **iOS app**: bundle ID `com.lwbroo.glycoorder` (must match `glyco/capacitor.config.json`
  and the Xcode project's bundle identifier exactly)
- **Android app**: package name `com.lwbroo.glycoorder`

Each needs its store credentials attached before purchases work end-to-end:
- iOS: an App Store Connect **In-App Purchase Key** (Users and Access → Integrations →
  In-App Purchase, generate a key, upload the `.p8` to RevenueCat)
- Android: a **Google Play service account JSON** with access to the app (Play Console
  → Setup → API access), uploaded to RevenueCat

(Both require the store accounts from steps 6/7 to exist first — see the iOS/Android
release runbooks in this folder.)

## 3. Create the entitlement
RevenueCat → **Entitlements** → New entitlement:
- **Identifier: `unlimited`** — must be exactly this. It's hardcoded as the default in
  `glyco-server/src/lib/entitlement.js` (`REVENUECAT_ENTITLEMENT_ID`) and in
  `glyco/js/app.js` (`REVENUECAT_ENTITLEMENT_ID` constant). You *can* use a different
  identifier, but then you must set `REVENUECAT_ENTITLEMENT_ID` in the server's env
  AND change the constant in `app.js` to match — using `unlimited` avoids that.

## 4. Create the product(s) + attach to the entitlement
Create the actual subscription product(s) in App Store Connect / Play Console first
(see the release runbooks), then in RevenueCat:
- **Products** → import/add the product identifiers from both stores
- Attach each product to the `unlimited` entitlement

Decide the subscription structure (monthly? annual? both?) — not decided yet in this
codebase, so pick based on your pricing plan. A single monthly plan is the simplest
starting point.

## 5. Create an offering
RevenueCat → **Offerings** → create (or use) the **`default`** offering, add a package
wrapping your product(s). `app.js`'s purchase flow calls `Purchases.getOfferings()` and
uses `offerings.current.availablePackages[0]` — as long as `default` is marked as the
**current** offering with at least one package, no code changes are needed.

## 6. Get the Public SDK keys
RevenueCat → Project settings → **API keys**:
- Copy the **iOS Public app-specific API key** → paste into `glyco/js/app.js`,
  replacing `REVENUECAT_API_KEYS.ios` (currently the placeholder string
  `"REVENUECAT_IOS_PUBLIC_SDK_KEY"`)
- Copy the **Android Public app-specific API key** → paste into
  `REVENUECAT_API_KEYS.android` (currently `"REVENUECAT_ANDROID_PUBLIC_SDK_KEY"`)

`configurePurchases()` in `app.js` checks for the placeholder prefix and no-ops until
these are filled in, so the app runs fine before this step and picks up the real keys
the moment you replace them (no other code change needed) — just run `npm run sync`
in `glyco/` afterward to rebuild `www/` and push the change into `ios/`/`android/`.

## 7. Get the Secret API key + webhook secret (server-side, not the app)
- **Secret API key**: Project settings → API keys → Secret key → set as
  `REVENUECAT_SECRET_API_KEY` in `glyco-server`'s environment (Render dashboard)
- **Webhook secret**: RevenueCat → Project settings → **Webhooks** → add a webhook
  pointing at `https://lwbro-trend.onrender.com/api/revenuecat/webhook`, set an
  Authorization header value, and put that same value in `glyco-server`'s
  `REVENUECAT_WEBHOOK_SECRET` env var (Render dashboard). This is what lets
  cancellations/renewals update the entitlement cache without polling.

## Done when
- A test purchase (sandbox/test track) on a real device flips
  `subscription-status` in Settings to "Unlimited analyses active" and the quota
  chip disappears.
- "Restore purchases" works on a second device/reinstall with the same store account.
