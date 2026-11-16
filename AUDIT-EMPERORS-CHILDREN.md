# Emperor’s Children study-data audit — 2026-11-16

Scope: all 186 uploaded catalog records: **148 rules, 26 units and named profiles, 11 detachments, one faction**. The repair updates 148 rule records and 14 unit records (162 total); it does not replace imports, rename IDs, change enabled states, merge Combat Patrol variants, or alter other factions. This is a study-data audit, not certification of points, weapons, every Codex entry or full army legality.

## Sources and provenance

- Preserved live baseline: `tests/fixtures/ec-audit-before.json`.
- Pinned [40kdc-data EC core](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b/data/core/emperors-children) and enrichment, commit `6ea813f7706bc9a492026d8b4403af99a965162b`, CC BY 4.0. Unit, composition, profile, weapon-link, ability-link, leader, faction and detachment coverage is asserted.
- [Official faction pack v1.3](https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_emperors_children-xp2mhzppxs-1cvykicdxu.pdf), legal September 30, 2026: selected rules, profile and keyword updates.
- [Current faction reference](https://wahapedia.ru/wh40k11ed/factions/emperor-s-children/) and all 23 ordinary unit pages, checked November 16, 2026. These provide context outside the supplement; they are community references, not additional official certification.
- Source metadata and SHA-256 fingerprints: `tests/fixtures/ec-audit-sources.json`. No full PDF or scraped page text is bundled. Original summaries and source-bound review decisions: `scripts/ec-study-notes.json`.

Three imported/pinned mechanics differences are recorded explicitly: Callous Blades Daemonic Patrons (`scope`), Sensational Performance (`applies_to`), and Sustained by Agony (`effect`). The raw import is retained; reviewed display wording does not silently overwrite its historical mechanics.

## Corrections

- Replaced all placeholder descriptions with readable effects or named source gaps. **137 rules usable; 11 need source review; zero silently empty records.** All eleven unresolved rules are excluded from quiz answers and distractors.
- Added exact player/phase timing combinations, including opponent Shooting/either Fight defenses, poison Command callbacks, Icon of Excess end-phase tests, Dark Apparitions pickup/return, and Sinuous Breach’s Movement/Charge windows.
- Restored both Thrill Seekers target exclusions; full Favoured Champions designation/handoff; cumulative Pact thresholds and pledge bookkeeping; reciprocal Carnival empowerment, Sustained Hits FAQ and its 500/1000/1500-point daemon allowance.
- Corrected Armour of Abhorrence and Possessive Mania to the attacking unit’s sequence, not blanket phase-long protection. Clarified passengers versus transports, bearer versus unit, equipment gates, Leadership resurrection direction, per-model eligibility and once-per-turn/round/battle limits.
- Official ordinary profiles: Terminators/Kakophonist/Lucius **T6**; Infractors/Exultant/Sorcerer/Tormentors **T5**; Noise Marines **W3**. Fulgrim MOBILE, vehicle FRAME, and Heldrake M12/Sv3+/OC0 without AIRCRAFT were already present and are retained.
- Recovered intermediate source-composition counts for Fiends, Flawless Blades, Infractors, Seekers and Tormentors. This does not validate their points.
- Kept the three Callous Blades unit identities and profiles separate, with source-review notes rather than copying ordinary matched-play updates onto Combat Patrol.
- Removed EC from the homepage faction WIP list while retaining the general early-development, accuracy-check and rule-report notice. Specific source gaps remain visible in the Workshop/Guide.

## Remaining source gaps

Ten Callous Blades Combat Patrol rules require current variant-specific wording: Daemonic Patrons, Duellist’s Death, Excessive Assault, Icon of Excess, Invigorating Agonies, Martial Perfection, Nimble Strikes, Peerless Killer, Profane Desecration and Shatter Strike. Their imports include contradictory timing or incomplete restrictions and must not be substituted with similarly named ordinary rules.

Lord of the Host is absent from the checked current Lord Exultant datasheet. Its historical Infiltrators/Scouts grant remains flagged, not a verified deployment benefit. The unit carries the same warning.

Agonised Cacophony’s checked supplement gives no separate expiry for the detection-range increase; its summary does not invent one. Weapon records are cross-checked as links only: the application has no general weapon-profile catalog editor, and generic versus datasheet-specific weapon IDs must not be conflated. Raw sources and points are preserved.

## Reproduction and checks

```sh
node scripts/audit-ec.cjs tests/fixtures/ec-audit-before.json /tmp/ec-audit
node tests/ec-audit.test.cjs
npm run check
npm test
npm run build
npm run bundle
```

The generator has no database connection. It rejects any changed revision, profile, user summary, source mechanics, removed/added EC row or unreviewed source difference. Its payload uses expected revisions. Live application must compare all 186 baseline rows inside the same transaction as the existing catalog-import RPC, retaining revision history. Other factions are checked with an aggregate revision/content digest.

Browser QA at 1440px and 390px verifies the real Guide, all-detachments plus eleven detachment options, editable split timings, T5/W3 profile editors, homepage notice and absence of errors/horizontal overflow. No test submits a report or saves a user list to the live service.

## Live application

Applied November 16, 2026 through the existing catalog-import RPC in one transaction after an exact comparison of all 186 baseline rows. All **162 changed rows** advanced from revision 1 to 2 and have revision-1 history. A full read-back matched every expected field in all 186 EC records. The **9,492 other catalog rows** retained the same revision/content aggregate digest (`e644d2c36704c117b9e26fb9b7388243`). Local full suite: **636 tests passed**; final EC-specific regression run: **15 passed**. Syntax, build, bundle, and desktop/mobile browser checks passed.
