# Lazy audit compatibility assets

The former 973,886-byte Aeldari compatibility script is now a 27,832-byte generated registry: a 97.1% reduction for this startup asset (946,054 fewer uncompressed bytes). It contains three complete bundled-sample corrections and fingerprints identifying 252 historical imported payloads. The unchanged historical replacement data lives in `aeldari-audit-data.js` and loads only when incoming rule payloads match a legacy entry. Current maintained rules and unrelated faction records do not need this asset. Other source-summary modules remain unchanged.

Fingerprints only decide whether a download could be useful. The full original exact-payload comparison still decides whether a replacement applies. Admin edits, provenance, timing and guide hints retain the same protection. There is no change to rule data in the database.

Catalog loading waits for required compatibility data before publishing records, including cached runtime loads and full Workshop loads. Loading failure leaves the current catalog intact and permits retry. New/imported editing records perform the same preparation before saving. Browser downloads are shared across concurrent requests and reused once loaded.

The authoritative payload remains in the data module. `npm run build` regenerates the small registry deterministically before copying assets to `docs/`; Node consumers retain the full synchronous compatibility API.

Tests compare all 255 replacements against the original behavior, cover bundled sample corrections without downloading historical data, unrelated/edited rules, concurrent requests, failed downloads and invalid script registration. Catalog integration tests cover publication gating, cached loads and failure preservation. A real Chromium check observed zero historical-data requests at startup, exactly one request for two concurrent legacy requests, the expected corrected Protect rule, and no page errors.

Syntax checks, build, full suite (791 passing, 0 failing), final focused loader/catalog tests and whitespace checks passed. Browser startup verification bypasses account sign-in and uses local assets; this is not an authenticated production load-time benchmark.

The build is prepared, not published.
