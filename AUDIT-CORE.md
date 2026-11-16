# Core study-data audit — 2026-11-16

Reviewed all 60 shared Core catalog records: 27 rules and 33 Guide steps. Twenty-six ability/stratagem summaries have source-bound rewrites; the mission-dependent Draw Secondaries reminder retains its wording. Phase steps retain their current sequence, with faction-neutral examples and an accurate Move Units prompt.

Sources: June 2026 official Core rules, Universal Rules Updates v1.1 (legal August 26, 2026), the current Core and Rules Appendix reference, and pinned 40kdc-data commit `6ea813f7706bc9a492026d8b4403af99a965162b`. URLs, SHA-256 fingerprints and structured source records are retained in `tests/fixtures/core-audit-sources.json`. Original imports remain intact. Review wording is in `scripts/core-study-notes.json`; the baseline-checked generator is `scripts/audit-core.cjs`.

Corrections include cover/Stealth affecting Ballistic Skill, 24-inch end-of-opponent-Movement Overwatch with no Hit re-rolls, Heroic Intervention's two charge modes and costs, opponent-only Counteroffensive, no Battle-shock Command Re-roll, Deep Strike at more than 8 inches, Firing Deck's model/weapon restrictions, and modern Hover/Super-heavy Walker rules. Explicit authored timings make the stratagems and Deep Strike editable in the Workshop timeline. Existing Guide toggles remain in effect. Generic datasheet references remain reference cards rather than being shown indiscriminately on every unit.

“Damaged Objective Control” remains **needs source review**: the import does not establish a universal current rule. Its warning requires a specific datasheet threshold/effect; it is excluded from quiz material. Other current source-specific gaps from faction audits remain flagged. Removing the completed Core heading from the homepage preserves the early-development accuracy notice and rule-report link.

The generator refuses changed revisions, data, added or missing Core records. Publication uses the existing revision-checked import RPC and history trigger, with full before/after comparison of all 60 Core rows and an unchanged digest for the other 9,618 records. No schema, account, saved-list or report data changes.
