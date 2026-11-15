# Shared Workshop rules

A rule can have multiple `data.memberships`, each containing a faction and its
allowed detachment names. An empty detachment list means faction-wide. Memberships
are pairs: a detachment selected for one faction is not assigned to another faction.
Existing single-faction/single-detachment records continue to work unchanged.

In the Workshop, open a rule and choose **Use in multiple factions / detachments**.
Add faction memberships and select their detachments. Each faction folder shows
the same editable rule. Saving its wording, timing or restrictions updates all its
memberships. Different effects or eligibility restrictions require separate rules.

Armour of Contempt consolidates 50 reviewed imports into one shared record across
Space Marines and 11 chapters. Its 1CP cost, phase limit, attacked-unit restriction,
attack-sequence duration and reference-only status are preserved. Original imported
rows remain disabled with `sharedRuleId` links; their source records and previous
revisions remain available. Linked imports are inspectable in the shared editor.
Runtime catalog references resolve their old IDs to the shared rule; account rosters
and original uploads are untouched. Source-only imports preserve these links, and
full replacements of linked imports are rejected to prevent duplicate resurrection.

`scripts/share-armour-of-contempt.cjs` checks the complete reviewed payload and
revision for all 50 originals before generating an administrator import transaction.
It does not connect to the database. Run it with a current catalog JSON path and an
output SQL path. The generated transaction uses the existing admin import RPC,
expected revisions and catalog history trigger. It is a one-time consolidation,
not an overwrite command for later edits. No database schema or access-policy
changes are required. Same-named rules are never automatically merged.
