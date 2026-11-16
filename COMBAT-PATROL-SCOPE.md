# Regular-army site scope

Combat Patrol-specific content is inactive site-wide at the owner’s request. No records, original imports or review work were deleted.

The archive covers **702 records: 174 units, 37 detachments and 491 rules**. Of these, 464 had been enabled and 238 were already disabled or linked to shared records. Every record is now disabled and marked `siteExcluded: combat-patrol`, so it stays out of normal Workshop browsing/review and the timeline even when showing disabled entries. Runtime catalogs, list building, the Guide and practice cannot activate a tagged record simply by toggling `enabled`.

Classification uses Combat Patrol-only mode metadata, explicit Combat Patrol detachment scopes, and rules owned only by Combat Patrol units. Shared abilities with regular-army owners remain active; mixed-mode records are not treated as Combat Patrol-only. GSC’s regular scope is now 24 units, nine detachments and 135 rule summaries. Existing saved lists are retained; removed source units no longer receive Combat Patrol ability content.

The preserved snapshot is `tests/fixtures/combat-patrol-archive-before.json`. `scripts/archive-combat-patrol.cjs` refuses revision/content drift and creates a reviewable, reversible payload. All 702 source records retain their prior versions in catalog history. Complete live read-back matched every expected field and revision. The other **8,977 catalog records** were unchanged. No schema, account, saved-list or report data changed.

New source imports archive explicit Combat Patrol-only units/detachments and linked abilities instead of enabling them. Replacement imports, direct saves and batch writes preserve existing exclusions. The bundled online fallback’s 22 Aeldari Combat Patrol entries are also inactive.

Validation: the full 700-test suite passed, followed by targeted content and archive tests for write safeguards (eight archive regressions after adding the direct-save test). Hosted checks run the final suite. Desktop/mobile browser checks cover absence from unit search, the real Guide, timeline detachment options and faction review while retaining regular GSC rules.
