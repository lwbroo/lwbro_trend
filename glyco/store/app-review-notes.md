# App Store Connect — App Review notes

Paste into **App Review Information → Notes** when submitting. Update the bracketed
placeholders before submitting.

## Demo account
None needed — Glyco Navigator has no sign-in of any kind. The review flow is:
1. Open the app, tap "Analyze this meal", take or choose a photo of any meal.
2. The app identifies the foods and shows the recommended eating order.
3. Log tab shows past meals; Trends tab shows aggregate stats (works with 0 logs too,
   shows an empty state).
4. Settings → Subscription card only appears on-device (native build), and shows the
   free-tier/unlimited status plus a "Restore purchases" button.

## Why this app needs a camera
Camera/photo-library access is used exclusively to photograph a meal for the core
food-order feature. No other use.

## Health/medical content — why this isn't a medical device
Glyco Navigator suggests an eating *order* (fiber → protein/fat → starches/sugars last) for
a photographed meal, based on published research that eating order affects post-meal
glucose response. It does **not**:
- Diagnose, treat, or claim to manage diabetes or any condition
- Provide dosing, medication, or clinical guidance
- Claim clinical/diagnostic accuracy for its food or portion recognition (it's an AI
  estimate, clearly labeled as such in the UI with a 🤖 vs 📚 database tag)

The in-app disclaimer (visible in Settings, and shown contextually) reads: "For
dietary-order guidance only — not medical advice. If you have diabetes, follow your
doctor's and dietitian's instructions." This is the same framing used throughout the
app — see `glyco/js/i18n.js` key `disclaimer`.

If Review has follow-up questions about the health-content classification, happy to
provide more detail — reach [YOUR NAME] at [YOUR CONTACT EMAIL].

## Subscriptions
- Auto-renewable subscription, managed via RevenueCat + StoreKit/Play Billing.
- Subscription Display Name: **Glyco Navigator Pro** — must be entered exactly this way
  in App Store Connect / Play Console so the store listing matches the in-app copy
  (`js/i18n.js` → `subscription_active`).
- Free tier: 3 photo analyses/week, no time limit on the app itself.
- Paid tier: unlimited photo analyses, US$2.99/month, with a 7-day free trial before
  billing starts (Introductory Offer, configured in App Store Connect — this note must
  keep matching whatever's actually entered in the subscription product; update both
  together if either changes).
- "Restore purchases" is available in Settings → Subscription card at all times.

## Privacy Policy URL
https://lwbroo.github.io/lwbro_trend/glyco/privacy.html

## Support URL
[FILL IN — e.g. a GitHub Issues link, or reuse the privacy policy page with a contact
section, which it already has]

## Anything else Review might flag
- The app calls an external backend (`glyco-server`, deployed on Render) to do photo
  recognition server-side, so no API key or model choice is exposed in the app UI —
  this is intentional, not a broken/incomplete feature.
- The web version at https://lwbroo.github.io/lwbro_trend/glyco/ exists (same code,
  PWA) and intentionally does **not** show the subscription/paywall upgrade button —
  only informs the user that unlimited access is app-only. This is a deliberate
  App-Store-vs-web feature gate, not a bug.
