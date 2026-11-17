# Performance implementation

Implemented the first three structural improvements from REPORT.md:

- Gameplay reads a versioned, active-only runtime catalog instead of full editing records. The account-scoped IndexedDB cache is used only after checking the current server manifest. Cold loads fetch bounded parallel pages; a catalog change retries once, and partial failures never replace the current records. Disabled and archived bundled defaults remain excluded.
- Workshop records, including full provenance and review metadata, load only when an administrator opens editing tools. Saves are blocked until complete records are loaded. Workshop/import/timeline scripts also load on demand. Report editing uses complete records.
- Guide sessions select the army's relevant rules once and cache phase activation candidates. The existing complete guide preload remains intact. Catalog, roster and preference changes invalidate preparation.

The additive runtime_catalog_projection Supabase migration was applied. All three functions use SECURITY INVOKER with an empty search path, authenticated execution only, and existing table RLS. No catalog rules or policies were edited. Authenticated paging, stale-version rejection and missing-session rejection were verified.

## Measurements

The same 5,700 active live records contain 15,243,852 bytes of full data JSON versus 6,930,519 bytes of runtime data JSON: a 54.5% reduction. This excludes row envelopes, compression and the separate manifest; it is not an observed network transfer size. Disabled/alias records are also omitted from runtime paging. Warm cached loads need the manifest but no catalog pages.

The same historical fixture, mobile viewport and 4× CPU throttle were used for before/after browser runs. Aeldari guide preload fell from 2,461 ms to 1,237 ms; Marines fell from 2,205 ms to 1,293 ms. Seed-only Aeldari was essentially unchanged (965 ms versus 949 ms). These are single local runs, not production latency guarantees. Catalog apply/render itself was not faster in the unchanged full-fixture benchmark; runtime payload reduction was measured separately. Navigation timings varied and do not establish a navigation speed improvement.

Eight rapid navigation commands reached the expected round/turn/phase/step without drops in 353 ms in the follow-up Marines run. This exercises navigation commands, not physical touch recognition.

Browser verification also covered real IndexedDB round-trip/removal and lazy loading of the Workshop, without page errors. Automated tests cover runtime cache versions, account isolation, malformed caches, catalog races, failed reloads, editor provenance and full-round card/target parity. Results and harnesses are included alongside this report. Authenticated production loading and physical touchscreen gestures still need field measurement.

## Remaining lower-priority work

Logo/favicon delivery sizing, faction audit asset loading, and separating saved-list persistence from guide progress remain follow-ups. These were lower-priority audit recommendations and are not claimed as completed here. The frontend build is prepared in docs/; it has not been published by this task.

The security advisor reported no function/RLS findings for this change. It also reported the pre-existing [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) Auth setting; that setting was not changed.

Final verification: `npm run check`, `npm test` (777 passed, 0 failed), `npm run build`, and `git diff --check` passed.
