# Google Play Console — Data Safety form worksheet

Answers to walk through **Play Console → App content → Data safety**. The form's exact
wording changes over time; use this as the source of truth for *what* to answer, not
literal copy-paste.

## Does your app collect or share any of the required user data types?
**Yes.**

## Data types collected

### Photos
- **Collected:** Yes — the meal photo you choose to analyze.
- **Shared:** Yes, with Anthropic (processes the image server-side to identify foods;
  not stored by Anthropic or by GlycoOrder's backend beyond the single request).
- **Processed ephemerally:** Yes — mark "This data isn't stored" for the server hop if
  the form offers that option; the image is not persisted server-side.
- **Purpose:** App functionality (core feature).
- **Optional:** No — required to use the photo-analysis feature (the app is unusable
  for its main purpose without it, but no other feature requires it).

### Device or other IDs
- **Collected:** Yes — a randomly generated, anonymous UUID created on first launch,
  stored locally. Not derived from any hardware identifier (not IMEI/Android ID/
  advertising ID).
- **Shared:** Yes, with the backend (quota + entitlement lookups) and RevenueCat
  (subscription status lookups).
- **Purpose:** App functionality (weekly quota enforcement, subscription status).
- **Optional:** No.

### Purchase history
- **Collected:** Yes — subscription status only (active/inactive), via RevenueCat.
  GlycoOrder's own backend never sees payment method, card details, or price paid.
- **Shared:** With RevenueCat (a subscription-management processor) and, per standard
  Play Billing flow, with Google.
- **Purpose:** App functionality (unlocking unlimited analyses).
- **Optional:** Yes — only applies to users who choose to subscribe.

## Data types NOT collected
Explicitly answer "No" for all of these — nothing in the codebase collects them:
- Name, email address, or any other personal identifiers
- Location (precise or approximate)
- Contacts
- Health info beyond the photo/quota flow above (no glucose/feeling log ever leaves
  the device — see below)
- Financial info beyond purchase history (no card numbers, no bank info)
- Messages, audio, files/docs beyond the meal photo itself
- App activity / analytics / crash logs (no analytics SDK is present in the app)
- Web browsing history
- Advertising ID (no ads, no ad SDKs)

## Note on the local meal log
Your saved meal log (photos, foods, order followed, feeling/glucose follow-up notes)
stays in the app's local storage on-device only — it is **not** collected or
transmitted anywhere, so it does not appear as a network-collected data type on this
form. If Play's review asks about the "Health info" checkbox specifically because of
the optional glucose field: that field is local-only and should be described as such
if the form has a free-text explanation box; it is not sent to any server.

## Security practices section
- **Data encrypted in transit:** Yes (HTTPS to the backend and to RevenueCat).
- **Users can request data deletion:** Describe as: local data is deletable anytime in
  Settings → Clear data; server-side data is anonymous, short-lived (auto-expires,
  see privacy policy), and deletion-on-request is available by contacting support
  (see privacy policy contact).
- **Independent security review:** No (small indie app — answer "No" unless this
  changes).

## Privacy policy URL
https://lwbroo.github.io/lwbro_trend/glyco/privacy.html

## Target audience / content rating
Not designed for or directed at children. Answer the "Target age group" question with
an adult/general audience selection, not the "primarily for children" track — this
also affects which Data Safety disclosures Play requires.
