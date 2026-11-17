# WarPlanner performance audit — 16 November 2026

The largest bottlenecks are account/catalog startup and guide preparation. Cached page navigation is comparatively healthy. This audit made no application, database or deployment changes.

## 1. High: account entry downloads the entire editing catalog

`dist/content.js:193–209` fetches `select('*')` for every catalog row, 500 at a time. With 9,683 current records, that means 20 catalog HTTP requests in eight dependent waves (first page, then groups of at most three). It also fetches the admin role first. `dist/auth.js:45–49` waits for this complete operation before showing the app. There is no persistent runtime catalog/version cache in this path.

Read-only live database measurements, JSON text before HTTP compression:

| Data | Bytes |
|---|---:|
| Entire catalog, 9,683 rows | 28,913,822 |
| Enabled, non-alias, non-excluded runtime records, 5,700 rows | 16,785,900 |
| Import provenance in the full catalog | 11,527,109 |
| Summary audit metadata in the full catalog | 3,733,211 |
| Estimated runtime projection without historical/provenance/audit fields | 7,183,406 |

Recommendation: introduce a separately versioned runtime payload, retain full records for Workshop access, and cache the runtime payload with a catalog revision. The projection estimate represents approximately 75% less JSON than the current full read. It is not a ready-to-use blind field deletion: mechanics enrichment currently reads importSource for some records, so compute equivalent runtime summaries before dropping provenance. Preserve RLS, account isolation, atomic publication and revision-based invalidation. Loading a selected faction/list’s dependencies can reduce the runtime payload further.

## 2. High: applying the catalog blocks the main thread

Applying the 5,519-record historical fixture and rendering took 2,856–3,265 ms at 4× CPU throttling. This is a combined apply/render measurement; it excludes real database/network transfer and browser JSON response parsing. The fixture is 11.6 MB and is smaller and differently shaped than the live catalog, so these are representative CPU results, not live sign-in timings.

`dist/content.js:141–181` synchronously validates/clones records, expands memberships, enriches rules, rebuilds enhancements and unit links, and projects allies. `read()` also returns a complete deep copy that `load()` discards, the service records getter clones again, and `apply()` clones its input. The Workshop snapshot helps avoid repeated getters during rendering, but the startup copying and projection remain.

Recommendation: apply a lean, already-normalized runtime payload once per catalog version; remove discarded full copies and index faction, rule, unit and detachment lookups during normalization. Profile the individual normalization stages before moving work to a Worker; plain worker transfer of the full editing payload would also incur cloning cost.

## 3. Medium: guide preload contains long tasks despite yielding between pages

The current preload prepares 45 pages for both turns, yielding between pages with setTimeout. Full fixture scenarios took 2.2–2.5 seconds to prepare, with 12–13 tasks over 50 ms and a longest task of 181 ms. One page’s work can therefore block input even though the overall preparation process yields. Templates occupied only about 210–255 thousand characters: cached HTML size is not the main issue in these scenarios.

`dist/app.js:294–324` builds each page; `dist/lessons.js:207–210` scans the complete rule bank for step matching. Activation generation also scans rules and derives unit cards. The deck cache avoids repeated calculation after preparation, but first calculation still pays this cost across the global rule bank.

Recommendation: build an army-specific candidate set once, index candidates by phase/turn/window, and reuse unit/type grouping across pages. Retain complete up-front guide preparation, since it provides smooth navigation. Break expensive computation within individual page preparation into smaller jobs where needed; a yield only between pages cannot bound the longest task.

## 4. Medium: substantial eager startup assets

The checked docs entry references 30 scripts, CSS and the logo: 33 requests including HTML. Referenced asset bytes total 2,814,789; independently gzipping the assets produces approximately 824,903 bytes. This gzip figure is a local estimate, not an observed production transfer size.

Largest resources: Aeldari audit data 973,886 bytes; logo 484,499; Aeldari data 338,772; Supabase UMD 219,856. Workshop/import/reporting scripts and faction audit datasets are eagerly executed for all users before auth finishes.

Recommendation: lazy-load Workshop/import/reporting features and faction-specific audit datasets, preserving ordering dependencies. Serve appropriately sized logo/favicon assets. The current PNG is 1268×1241 and reused for the favicon. Keep the full original as an asset if needed, but avoid requiring it for a tiny favicon.

## 5. Low: full-state persistence on each guide transition

`dist/app.js:63–72` serializes and writes the entire local state, including the saved list library, then serializes the saved list library again on each save. Each committed guide transition calls save. With 100 synthetic saved lists and 2,000 review marks, saves had medians of 6.4–14.4 ms for 226–245 thousand serialized characters. Ordinary navigation saves were much smaller. This is a scaling risk for large libraries rather than the primary current bottleneck.

Recommendation: separate guide progress storage from roster/library storage, debounce noncritical writes, and save immediately at appropriate lifecycle boundaries. Preserve account-scoped keys and prevent losing checklist state.

## Navigation results

Headless Chromium, 390×844 touch viewport, 4× CPU throttle. Twenty sequential forward transitions per scenario:

| Scenario | Units | Catalog apply + render | Guide preparation | Navigation call p95 | Settled transition p95 |
|---|---:|---:|---:|---:|---:|
| Built-in Aeldari sample | 18 | Not applied | 965 ms | 12.0 ms | 224 ms |
| Historical catalog + Aeldari | 18 | 3,265 ms | 2,461 ms | 10.5 ms | 227 ms |
| Historical catalog + Marines | 20 | 2,856 ms | 2,205 ms | 8.3 ms | 204 ms |

The settled duration includes intentional animation and animation-frame scheduling. `dist/app.js:552–554` uses a 60–140 ms commit animation based on remaining drag distance; it is not all computational delay. A separate eight-command burst reached exactly the expected round/turn/phase/page, with no dropped commands. That burst exercises navigation directly, not physical touchscreen gesture recognition. No browser page errors occurred in these runs. These results are not field INP, LCP or end-to-end authenticated network measurements.

Post-run JS heap use was approximately 129–133 MB with the historical fixture versus 8.4 MB for the seed scenario, measured without forced GC and after the save stress test. This is an indication of allocation pressure, not evidence of a memory leak or a retained-heap measurement.

## Suggested implementation order and acceptance checks

1. Versioned runtime catalog, separate from full Workshop records. Verify exact rules/membership parity, atomic reloads, account transitions and current review summaries; measure actual authenticated transfer size and login time.
2. Normalize/index once and prepare only the imported army’s candidate rules. Preserve complete guide preload and verify no on-demand deck rebuilds while navigating; target page-preparation tasks below 50 ms on the same throttled harness.
3. Lazy-load admin/faction-only assets, resize delivery assets and separate progress persistence. Repeat the same scenarios and measure cold/warm loading, ordinary and large saved-list libraries, and repeated physical swipe input on a real mobile device.

Audit artifacts: browser-results.json, rapid-results.json, summary.json and assets.json. The browser harness uses isolated local profiles and bypasses auth/network, combining historical audit fixtures for CPU testing. It does not use user credentials or modify live data.
