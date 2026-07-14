# iOS release runbook

Everything up to "Install Xcode" was already done from the command line in this repo
(Capacitor `ios/` project, RevenueCat SPM dependency wired in, real icons/splash).
Beyond that, **the project's actual buildability is already verified** —
`.github/workflows/glyco-ios-build.yml` builds it on GitHub's macOS runners (which
ship full Xcode) and boots it in the iOS Simulator on every push; see
`store/screenshots/ios-01-analyze.png` for a real screenshot from that run. Simulator
builds need no signing/Apple Developer account at all, which is how that's possible
without step 1 below being done yet.

The steps below are the ones that need a full Xcode.app + your Apple ID on your own
Mac, which is why they couldn't be completed from this dev environment (only Xcode
Command Line Tools are installed here, not the full IDE — installing it requires
signing into the Mac App Store).

## 1. Enroll in the Apple Developer Program
https://developer.apple.com/programs/enroll/ — $99/year, needs your Apple ID.
Takes anywhere from minutes to ~48h if identity verification is required.

## 2. Install Xcode
Mac App Store → Xcode (large download, ~10-15GB). Requires being signed into the Mac
App Store with your Apple ID.

## 3. Open the project
```
cd glyco
npm run sync        # rebuilds www/ and refreshes ios/ from the current source
npx cap open ios     # opens ios/App/App.xcworkspace in Xcode
```

## 4. Signing
- Select the `App` target → **Signing & Capabilities**
- Team: select your Apple Developer team (available once step 1 is done)
- Enable **Automatically manage signing** — Xcode will create the provisioning
  profile and App ID (`com.lwbroo.glycoorder`) for you on first build

## 5. Build & test on a simulator, then a real device
- Simulator: select any iPhone simulator as the run destination, ⌘R
  - Note: in-app purchases (RevenueCat) do **not** work in the simulator without
    additional StoreKit configuration file setup — test the core photo-analysis flow
    here, save purchase testing for a real device or TestFlight
- Real device: connect via cable, select it as the destination, ⌘R. This is where to
  verify the full flow: photo → analysis → quota chip → paywall → purchase → restore

## 6. Create the app in App Store Connect
https://appstoreconnect.apple.com → My Apps → + → New App
- Bundle ID: `com.lwbroo.glycoorder` (select the one Xcode registered in step 4)
- SKU: any unique string, e.g. `glycoorder-ios`
- Fill in name, subtitle, category (likely Health & Fitness or Food & Drink),
  description, keywords, support URL, marketing URL (optional)
- **Privacy Policy URL**: `https://lwbroo.github.io/lwbro_trend/glyco/privacy.html`
- Age rating questionnaire: answer honestly — no objectionable content, medical/
  treatment information is informational only (see `app-review-notes.md`'s framing
  if a question asks about medical/health claims)

## 7. Create the subscription product
App Store Connect → your app → **Subscriptions** → create a subscription group, then
a subscription within it (decide monthly/annual pricing — not set anywhere in this
codebase yet, it's your call). Note the **Product ID** you choose — you'll need it
when attaching the product in RevenueCat (see `revenuecat-setup.md`).

## 8. Screenshots
Required sizes per device class Apple currently requires (check App Store Connect's
own list at submission time, it changes). Fastest way to get real screenshots: run the
app in the iOS Simulator at the required screen sizes and use Xcode's ⌘S screenshot
capture, or `xcrun simctl io <device> screenshot out.png`.

## 9. TestFlight (recommended before public submission)
- Xcode → Product → Archive → once archived, the Organizer window can upload straight
  to App Store Connect
- App Store Connect → TestFlight tab → add yourself as an internal tester, install via
  the TestFlight app, run through the full flow once for real (this is the "test on a
  real device" step from #5, but via the exact binary you're about to submit)

## 10. Submit for review
App Store Connect → fill in the build, complete the **App Review Information** notes
using `app-review-notes.md` in this folder (fill in its placeholders first — contact
email, final subscription price/duration), submit.

## Reference
- `revenuecat-setup.md` — dashboard config that must happen alongside/after this
- `app-review-notes.md` — paste into App Review Information → Notes
- `play-data-safety.md` — the Android equivalent concerns, useful for cross-checking
  consistency between the two store listings
