# Shared Space Marine datasheets

The reviewed catalog has 1,094 Space Marine unit entries representing 177 source
datasheets. Seventy-four datasheets are present in all twelve Space Marine folders.
The other 103 appear in the parent folder and their own chapter only. Consolidation
retains exactly those memberships; it does not grant chapter units to other chapters.

The parent entry is the editable shared datasheet. Profiles, model counts, common
keywords, Legends status and guide hints are maintained once. `unitMemberships`
retain each faction's original unit ID, additional chapter keywords and complete
ability references, including wargear and parameter values. Chapter ability variants
remain separate rule records. Leader options are resolved to the corresponding
bodyguard IDs available in that chapter, preserving every original attachment list.

The Workshop shows the same shared editor in each applicable chapter folder. Its
chapter selector changes the related abilities shown without discarding unsaved
profile edits. Reports from chapter practice and guided play point to the shared
datasheet. Saved army lists and uploads keep their original identities and names.

The 917 chapter copies remain disabled, linked by `sharedUnitId`. Their original
profiles, source records, ability links and prior revisions remain intact. Imported
source refreshes preserve sharing; full imports cannot silently resurrect an archived
copy or replace a shared datasheet with an unshared one.

`scripts/marine-unit-baseline.json` records the reviewed keys, revisions and complete
content fingerprints. `scripts/share-marine-units.cjs` refuses changed records or
scope, checks shared mechanics and each chapter's keywords and attachments, then
generates the admin import transaction and a membership summary. Its batches respect
the existing 1,000-entry RPC limit and commit together in one transaction. It does
not connect to the database. No schema or access-policy changes are required.

Verification covers all 1,094 runtime views and exact deterministic question-bank
hashes for all twelve factions before and after consolidation, as well as one-edit
profile propagation, chapter isolation, builder references, correction reports and
import guards. The original source remains the pinned community dataset documented
in CREDITS.md and AUDIT-SPACE-MARINES.md.
