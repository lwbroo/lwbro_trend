// Bundled by esbuild (see package.json "build:purchases") into js/vendor/purchases-capacitor.js.
// The npm package ships ESM-with-bare-imports only, and this app has no bundler pipeline
// for its own scripts — this is the one dependency that needs one, so it gets a scoped entry.
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
window.Purchases = Purchases;
window.PurchasesLogLevel = LOG_LEVEL;
