# Imperial Agents study audit — 16 November 2026

Source-bound review of the uploaded Agents catalog, pinned 40kdc source and current 11th-edition faction reference, with selected corrections checked against the official **v1.3 faction pack, effective 14 October 2026**. This does not certify every Codex entry, weapon characteristic, points cost or army-construction choice.

| Coverage | Count |
| --- | ---: |
| Uploaded units / named profiles | 33 / 40 |
| Rules and abilities | 138 |
| Detachments | 6 |
| Usable study summaries | 123 |
| Named source issues | 12 |
| Missing effect records | 3 |
| Rule / unit / faction edits | 138 / 4 / 1 |

Every unit, rule and detachment in the pinned uploaded source is represented. Ten attachment lists, all datasheet ability links and detachment references resolve. A table of 163 source weapons covers all datasheet weapon references; weapon characteristic values and points are not certified. Historical Legends sheets outside this upload are not silently added.

## Corrections

- The Agents-specific **Grey Knights Terminator Squad** becomes **T6**, and its **Corvus Blackstar** becomes **M14**, retaining the removal of AIRCRAFT. These sheets remain separate from native Grey Knights and Deathwatch versions. The ordinary Agents **Ministorum Priest** already has Support instead of Leader, and that correct source is preserved.
- **Inquisitorial Agents** gains the source-supported intermediate 6–12 model choices. The original uploaded source, stable identities and all unchanged profile values remain intact.
- **Assigned Agents** now contains the complete 1/1/1, 2/2/1 and 3/3/2 battle-size allowances, every-model IMPERIUM requirement, dedicated-transport deployment condition and separate Retinue exemptions. Its reviewed faction metadata enables the runtime integration documented in [ALLIED-AGENTS.md](ALLIED-AGENTS.md). The canonical faction also recognises “Agents of the Imperium” imports.
- **Assassins:** Dead Shot includes its +15-inch hidden detection range and limited shooting duration. Shieldbreaker retains the once-per-battle rifle use, +1 Wound and Critical Wound conversion. Shadow Assignment restricts Warlord selection, limits one of each Assassin type, and permits the swap only for an Agents army; it is not a one-Assassin-total rule. Coteaz’s Spy Network includes the actual enemy ability trigger and 2+ roll. Artemis’s return is once per battle per army, with the stated phase-end 2+ roll and 3 wounds.
- **Acrobatic Escape** retains distinct Fight-end and opponent-turn-end windows, the greater-than-3-inch gate and mandatory next own Movement ingress. Defensive Armour of Contempt and Truesilver Armour use opponent-turn Shooting or either-turn Fight and expire after the attacker, rather than the whole phase. Other checked defensive windows receive the same split where supported.
- **Recovered mechanics:** readable, source-bound summaries replace empty imports for Adaptive Tactics, Digital Weapons, Displacer Field, Exact Punishment, Execution Order, Gift of the Prescient, Hellfire/Kraken Rounds, Line of Fire, No Escape, Rapid Tactical Relocation, Rites of Exorcism, Ritual of Warding and Selfless Bodyguard. The original no-effect payloads remain historical records, not the authority for the corrected description. Core costs, precise source target restrictions, usage caps, excluded weapon types, objective identity, transport and recipient restrictions remain visible.
- **Attachments and equipment:** Inquisitor transport permission follows the eligible Bodyguard. Rites of Teleportation benefits the attached Inquisitors. Loyal Henchmen requires an actual Inquisitor, and Ministorum Sermon an actual Priest. Equipment-bound banner, shield, Narthecium, Cherub and other references retain their model/unit and wargear gates.
- **Explicit cross-army abilities:** Kroyle supports only the stated Agents or IMPERIUM INFANTRY BATTLELINE recipients; Warrant of Trade redeploys up to D3 eligible Imperial Battleline units rather than an automatic three. The Guide does not infer access to host army rules from those specific permissions.

## Availability and conflicting sources

The official v1.3 pack removes the Aquila Kill Team datasheet. The uploaded historical sheet is preserved with a visible source-review note, excluded from Assigned Agents suggestions and excluded from profile quiz generation. Its existing inclusion is not silently rewritten into a Deathwatch datasheet.

A separately linked PDF has a November-looking filename but identifies itself as v1.2 with an older rules layout. Both PDFs are fingerprinted. The explicitly effective-dated v1.3 supplement and current 11th-edition reference are used, and the conflicting Intraneural Biotech cost/frequency is flagged. No assumption is made that a filename overrides document content.

The stored Preacher Teguen Zealot scope differs from the pinned phase scope. Both fingerprints are retained. Its named usage cap is not borrowed from the ordinary Priest.

## Outstanding source work

These 15 records remain visibly marked and excluded from quiz answers and distractors:

| Record | Remaining issue |
| --- | --- |
| Assigned Agents — Inquisitor’s Hand | Missing effect mechanics; do not copy the ordinary rule into the patrol |
| Marked for Death — Inquisitor’s Hand | Missing effect mechanics |
| Auspex Array — equipped wargear copy | Missing effect mechanics |
| Auspex Array — unqualified copy | Resolve the equipment gate and same-name duplicate |
| At All Costs | Lost designated-objective identity and ambiguous numeric Leadership modifier |
| Deathwatch Mission Tactics | Critical-Wound Precision gate and DEATHWATCH versus ORDO XENOS recipient mismatch |
| Emperor’s Will | Movement-phase permission expires before Shooting in the source |
| Imperial Law | Missing beneficiary and attack-direction scope |
| Intraneural Biotech | Current versus historical cost/frequency conflict |
| Kill Team — Aquila | Removed sheet and conflicting generic transport/terrain procedure |
| Killer Reflexes | Unbound destruction trigger and bearer-destruction side effect |
| Nuncio-acquila | Missing timing, range and visibility procedure |
| Overkill — named Inquisitor’s Hand Eversor | Incomplete decision/benefit procedure; preserve its separate variant |
| Tome-skull — ordinary unit | Missing activation and visibility procedure |
| Zealot — Preacher Teguen | Stored/pinned duration conflict and missing named usage cap |

All six uploaded detachment definitions and their original scopes remain unchanged. Nothing grants every unit from another Imperial faction to an Agents army; requisitioned options come from the uploaded Agents sheets.

## Reproduction and verification

`scripts/audit-agents.cjs` performs no database calls. It checks the exact baseline, source IDs, raw/pinned/core hashes, all profiles and links, then generates 143 expected-revision imports. Saved edits, changed revisions or added/missing native catalog entries invalidate that baseline. Apply through the existing atomic administrator import RPC to preserve history; do not rerun the same payload after applying it.

Validation covers 621 automated tests, syntax/build/bundle checks and desktop/mobile Chromium at 1440px and 390px. Scenarios include native-versus-allied source selection, native Battleline attachment, separate Retinue exemptions, battle-size limits, saved-list persistence, Guide abilities, native-rule isolation, canonical correction routing, workshop timing rows and editable T6/M14 profiles. The separate opponent-focused quiz draft remains unpublished.

Sources: [official v1.3 faction pack](https://assets.warhammer-community.com/eng_14-10_wh40k_-faction_pack_imperial_agents-5bv5lemlti-phvkqckp17.pdf), [current 11th-edition faction reference](https://wahapedia.ru/wh40k11ed/factions/imperial-agents/), [pinned 40kdc source](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b/data/core/agents-of-the-imperium). Source fingerprints and 13 consulted unit-page references are retained in the audit fixture.

Live verification: all 178 Agents records match the expected result. The 143 updated entries have matching revision increments and preserved history. All other 9,500 catalog records retain the same key/revision/data digest. The completed audit also removes Imperial Agents from the homepage WIP roster.
