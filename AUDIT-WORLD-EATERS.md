# World Eaters study audit — 16 November 2026

Source-bound audit of the preserved live catalog, pinned 40kdc community mechanics and current faction reference, with explicit corrections checked against the official faction pack **v1.3, effective 30 September 2026**. This is a study-readiness review, not certification of every Codex entry, weapon, points value or army-construction choice.

| Coverage | Count |
| --- | ---: |
| Units / named profiles | 34 / 34 |
| Rules and abilities | 147 |
| Detachments | 9 |
| Usable study summaries | 138 |
| Named source issues | 7 |
| Missing effect records | 2 |
| Rule edits / unit edits | 147 / 8 |

All units, rules and detachments in the pinned faction source are represented. Six attachment lists, all unit ability references and all detachment references resolve; 102 source weapon records cover the datasheets’ weapon references. Weapon characteristic values and points are not certified by this pass. Every prior rule description was an importer placeholder. Original source payloads, identifiers, enabled states, faction/detachment records, existing rule scopes and named Combat Patrol variants remain intact.

## Corrections and retained restrictions

- Ordinary **Chaos Terminators** become **T6**; **Khârn**, **Khorne Berzerkers** and the ordinary **Master of Executions** become **T5**, following official v1.3 page 7. Named Frenzied Reavers profiles retain their separate values. The already-correct Heldrake M12, OC0 and removal of AIRCRAFT remain unchanged.
- Intermediate composition choices are restored for Bloodcrushers, Chaos Terminators, Eightbound, Exalted Eightbound, Flesh Hounds and Khorne Berzerkers. These are composition-tier choices, not points validation.
- **Blessings of Khorne** retains its eight-dice pool, every double/triple threshold, up-to-two activation limit, distinct dice allocation, expiry, melee-only Total Carnage trigger and Infantry-only Decapitating Strikes. The ordinary and named Combat Patrol records remain separate.
- **Angron:** Driven by Ultimate Rage grants nearby WORLD EATERS melee Hit/Wound re-rolls of 1, replacing the old ignore-modifiers menu. Wrathful Presence chooses one of three options for the round. Reborn in Blood requires actual destruction, spends a triple 6 instead of round-start Blessings, and returns Angron with 8 wounds using Deep Strike in the Reinforcements step of the next own Movement phase. It is not an immediate return or a way to summon an Angron merely held in Reserves.
- **Defiler:** Unleash Wrath occurs at the end of the opponent’s Movement phase, selects an enemy set up within 12 inches that phase, and permits shooting or a charge, with no Charge bonus. Scuttling Walker applies during the move and retains its end-position restrictions.
- **Reactive moves:** Blood Surge and Berzerker’s Wrath retain the casualty/eligibility requirement; the latter replaces the distance with 8 inches rather than adding the normal bonus again. Fury Unleashed moves the disembarking Berzerkers, not the Rhino, and cannot combine with Unrelenting Advance. Full-Throttle Assault targets a not-yet-moved Rhino but grants the passengers’ assault-disembark procedure. Loping Speed and Meet Any Challenge retain the actual enemy-move/setup trigger and 8-inch distance.
- **Split timings:** Blessing of Burning Blood, Daemonic Resistance and In the Shadow of Brass Idols appear during opponent-turn Shooting and either-turn Fight. Apoplectic Clarity appears during own-turn Shooting and either-turn Fight. Daemonic Fury uses own Fight-phase start despite the core table’s broader turn field; the consulted current faction wording supports this restriction.
- **Recipients:** daemon relay targets and their WORLD EATERS recipients remain distinct. Wrath of Khorne and Aspire to Infamy benefit only CHARACTER models, excluding EPIC HERO units, not every Bodyguard. Attached-provider conditions, enhancement bearers/upgrades and equipment gates remain explicit.
- **Resources and limits:** Blood Tithe includes all four purchased abilities, their costs and battle-long durations; Idols includes all three exclusive auras, ordinary once-per-option limits, 6/9-inch emitter ranges and the BATTLELINE grant. Summoned by Slaughter brings an existing Bloodletters Reserves unit, with once-per-round, transport-passenger and wholly-within placement restrictions. It does not create a new unit. CP costs and stricter per-battle/per-round limits remain visible.

The stored Wrath of Khorne variant already restricts the benefit to CHARACTER models more precisely than the pinned enrichment. Both effect/trigger fingerprints are recorded, and the stored original remains intact. The Vessels of Wrath source version-label difference is also retained.

## Outstanding source issues

These nine entries are excluded from practice answers and distractors. Source-review records still explain the known effect and the precise missing/conflicting procedure; missing records do not borrow another unit’s rule.

| Rule | Remaining issue |
| --- | --- |
| Berzerker Charge — Frenzied Reavers | No effect mechanics supplied |
| Icon of Khorne — named Frenzied Reavers units | No effect mechanics supplied |
| Berzerker Frenzy — Khârn | Confirm destruction/removal/return procedure and precise phase eligibility |
| Blessings of Khorne — Frenzied Reavers | Combat Patrol Total Carnage import lacks the ordinary melee-destruction restriction |
| Blood-hungry Annihilator | Damage re-roll uses an undefined “failure” scope; nearest-target wording needs confirmation |
| Fire Riders | Move-ended permission and incomplete movement/end-position restrictions |
| Frenzied Focus | Improved Critical Hit threshold lacks an explicit attack-type scope |
| Super-heavy War Engine | Provisional borrowed mechanic lacks a complete Khorne Lord of Skulls movement/tall-terrain procedure |
| Unleash Hell | Missing hit gate, transport-selection exception and complete recipient procedure |

## Homepage and reporting

World Eaters leaves the homepage’s WIP roster after the audit is applied. The other five areas remain. The notice now explains that WarPlanner is in early development, asks players to confirm suspicious information against current official rules, and links to **Report a rule error**. The link enters the existing Guide reporting flow and opens both “More Stuff and Things” and the report form. A player without a running Guide first sees the list-selection setup and then reaches the form; no report is sent merely by clicking the link.

The separate opponent-focused practice draft remains unpublished on its own branch.

## Reproduction and validation

`scripts/audit-world-eaters.cjs` never connects to a database. It checks the exact baseline, imported/pinned/core hashes, all covered source IDs, profiles, weapon references, attachment and detachment links, then produces 155 expected-revision payloads. Any saved edit, changed revision, added/missing native entry or changed source blocks that baseline repair. The existing administrator import RPC applies the changes atomically and preserves revision history. Do not rerun the baseline payload after application.

Validation: all 594 automated tests pass, including focused source/scope/timing/profile/quiz regressions, syntax/build/bundle checks, and Chromium checks at 1440px and 390px. Browser checks cover the homepage notice, fresh and resumed reporting links, World Eaters timeline timing rows and rule states, editable T6 Terminator profiles and intermediate squad choices. No page errors or horizontal overflow were observed. Source metadata and fingerprints are retained in the audit fixture and per-rule audit records.

Sources: [official World Eaters v1.3 faction pack](https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_world_eaters-rxxj1fzeoh-kfx1cectxb.pdf), [current faction reference](https://wahapedia.ru/wh40k11ed/factions/world-eaters/), [pinned 40kdc data](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b/data/core/world-eaters).

Live verification: all 191 World Eaters records match the reviewed expected result, including 155 revision increments and 155 preserved history entries. The other 9,124 catalog records retain the same key/revision/data digest.
