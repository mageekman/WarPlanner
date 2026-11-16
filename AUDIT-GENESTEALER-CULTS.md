# Genestealer Cults study-data audit — 2026-11-16

Scope: **186 uploaded records: 147 rules, 28 units with 30 named profiles, ten detachments and one faction**. The repair updates 147 rule summaries and 11 unit records (158 changes). IDs, imports, memberships, enabled states, profiles, faction and detachment records remain intact. This is a study-data audit, not certification of points, every weapon/Codex entry or full army legality.

## Completion follow-up — 2026-11-16

All twelve previously unresolved Claw of Ascension Combat Patrol summaries are now reviewed against the [current 11th-edition Combat Patrol reference](https://wahapedia.ru/wh40k11ed_cp/factions/claw-of-ascension/) (the reference identifies App 2.7.1, October 2026). The older 10th-edition PDF was not substituted. This is a community-reference review, not certification against the app itself. Where that reference states no separate expiry, the summary explicitly says so rather than inventing one.

The follow-up updates 12 existing rules and all four Combat Patrol units, and adds the missing **Brood Claim** ability: **17 catalog changes; 148 usable summaries, zero unresolved summary flags, 28 units and 33 named stat profiles**. It restores Shanus’s Leader link and the Metamorphs’ Cult Ambush link, records the distinct Jackal/Power Weapon/Wolfquad and Metamorph model profiles, and clears the four completed unit-review flags. Ordinary GSC rules, allied projection behavior, imports, IDs, model counts and attachment targets remain intact.

Combat Patrol Cult Ambush keeps its own 2-point starting pool, 2-point costs for five Jackals/Metamorphs, marker placement more than 9 inches from enemies and removal within 8 inches. No replacement cost is invented for Shanus or the Ridgerunner. Master Outrider is one 6-inch move, not two. Crossfire retains its per-target, per-turn restriction. Defensive and weapon reminders include current Movement-phase Overwatch timing. All thirteen reviewed/added rules are scoped to Claw of Ascension, with precise unit recipients; ordinary units do not inherit Combat Patrol benefits. The separate allied roster integration is documented in [AUDIT-GSC-ALLIES.md](AUDIT-GSC-ALLIES.md).

Reproduction: `node scripts/finish-gsc.cjs tests/fixtures/gsc-finish-before.json /tmp/gsc-finish`. The generator compares all 186 starting GSC records exactly before producing its revision-checked update. Source fingerprint, checked profiles and fixed roster composition are in `tests/fixtures/gsc-finish-sources.json`; review wording is in `scripts/gsc-finish-notes.json`. Historical initial-audit results below describe the state before this follow-up.

## Sources

- Preserved baseline: `tests/fixtures/gsc-audit-before.json`.
- [Pinned 40kdc-data core](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b/data/core/genestealer-cults) and enrichment, commit `6ea813f7706bc9a492026d8b4403af99a965162b`, CC BY 4.0. All unit, weapon, ability, composition, attachment, faction and detachment links are checked.
- [Official faction pack v1.1](https://assets.warhammer-community.com/eng_22-07_warhammer_40,000_faction_pack_genestealer_cults-vmkwgeydbr-sh7picbeqo.pdf), legal July 22, 2026: army-rule rewrite, selected detachment/datasheet updates and FAQs.
- [Current faction reference](https://wahapedia.ru/wh40k11ed/factions/genestealer-cults/) and all 24 ordinary unit pages, checked November 16, 2026. Main profiles match. The ordinary and Combat Patrol Jackal/Wolfquad profiles remain separate, with W2/W4 model distinctions retained.
- Structured snapshots, selected profile checks and SHA-256 source fingerprints: `tests/fixtures/gsc-audit-sources.json`. No full scraped page text or PDF is bundled. Original study wording and activation contexts: `scripts/gsc-study-notes.json`.

Three imported/pinned effect differences are explicitly fingerprinted: Frenzied Devotion, Mutagenic Regeneration and Psionic Parasitism. Raw imports are preserved; checked display summaries resolve the recipient, Hazardous and paired-unit restrictions rather than rewriting historical mechanics.

## Initial audit results

**135 usable summaries; 11 needing source review; one missing Combat Patrol effect.** All twelve unresolved rules are excluded from quiz answers and distractors. Four Combat Patrol units carry source-review notes and are excluded from statistics questions.

- Restored the complete Cult Ambush procedure: 6/10/14 starting Resurgence points, all printed costs, non-Character replacements at full strength with refreshed One Shot weapons, 32mm markers at the current 8″ distance, marker loss/rescue, base-contact/3″ placement, first-round return, reserve-denial restrictions, ordinary Strategic Reserves alternative, no Rapid Ingress and no automatic round-three destruction. Unused markers persist.
- Kept Cult Icon recovery separate: Acolytes/Metamorphs D3 or 3; Neophytes 3 or D3+3. Neither returns Characters or refreshes spent One Shot weapons.
- Corrected Locus Bodyguard to other attached Characters, rather than the whole unit or Locus itself. Preserved Biophagus, Clamavus, Locus and Nexos as Support models and all twelve source attachment entries. Aberrant bodyguard defenses require an actual attached Character in the Guide.
- Corrected Crossfire’s shared per-enemy non-stacking limit, shared Nexos/Kelermorph/Magus/Saboteur/Clamavus limits, bearer-specific Survey Augur/Spotter, and passenger-specific Truck Fire Support.
- Recovered empty ordinary effects, including Coordinated Trap, Acceptable Losses, Cult Icon, Cartographic Data-leech, Evasive Vanguard, In the Shadow of Iron, Divine Imperative, Psi Surge, Symbiotic Destruction, Synaptic Auger and Vengeance for the Martyr. Named target, visibility, endpoint, cost, usage and risk restrictions remain explicit.
- Restored current snap-shooting wording on Cloaked Assassin and the Explosives name on Primed and Ready. Summon the Cult retains its non-consumption exception when no legal marker placement exists.
- Split opponent-Shooting/either-Fight and own-Shooting/either-Fight timings; kept Cult Ambush and Downtrodden Rise in opponent Movement end, and Psi Surge’s different effect-expiry/reuse windows. Primed and Readied costs 2CP.
- Restored seven intermediate composition ranges, including Jackals’ source tiers and Neophytes 10–20, while retaining four Combat Patrol unit sizes. Profiles and points are unchanged.
- Removed GSC from the homepage faction WIP list; retained the development, accuracy-check and report notice. Core Rules & Stratagems remain on that list.

## Initial allies scope and remaining limits

Brood Brothers Auxilia’s summary includes the Astra Militarum 500/1000/1500-point allowance, all eight excluded keywords, GSC Warlord requirement, loss of Voice of Command and the Kasrkin FAQ. Integrated Tactics, Martial Espionage and paired Astra/GSC stratagems retain their actual recipients.

Final Day’s summary includes VANGUARD INVADER Tyranid allies at 500/1000/1500 points, AIRCRAFT/BROODLORD/GENESTEALERS exclusions, the Warlord ban, paired Synapse sacrifice/healing and Catalyst. These are distinct allowances; neither applies to every GSC detachment.

This audit does not create or clone the many allied Astra/Tyranid datasheets into GSC, add automatic cross-faction list-builder/Guide projections, or certify allied army legality. Those datasheets remain under their own factions and require separate allied-roster integration. The four Combat Patrol units and similarly named rules are not merged with ordinary counterparts.

Twelve Combat Patrol entries remain unresolved: Adaptable Fighters; Crossfire; Cult Ambush (empty source effect); Cult Zealotry; Dedicated to the End; Guerrilla Warriors; Heavy Munitions; Shanus’s Master Outrider; Practiced Eye; Shanus’s Priority Target; Survey Augur; Xenos Resilience. Current variant-specific wording is needed before treating them as verified.

The Cult Ambush table prints specific starting sizes. No cost is invented for unlisted intermediate starting strengths; restoring composition choices does not certify their points or Resurgence cost. Eyes of the Cult’s checked text states no separate expiry; none is invented. Weapon links are checked, but weapon stats and missing Legends/non-native datasheets are outside this uploaded-catalog audit.

## Reproduction and validation

```sh
node scripts/audit-gsc.cjs tests/fixtures/gsc-audit-before.json /tmp/gsc-audit
node tests/gsc-audit.test.cjs
npm run check
npm test
npm run build
npm run bundle
```

The generator has no database connection and rejects changed revisions, summaries, profiles, imports, catalog additions/removals and unreviewed source drift. Live application compares all 186 baseline rows inside the same transaction as the existing expected-revision catalog RPC. Other factions are verified through an aggregate revision/content digest.

Validation covers the real Guide’s attached/unattached defenses and faction rules, filtered timeline, source-restricted quiz banks, current costs, precise timings and stale-repair rejection. Browser QA at 1440px and 390px covers Guide, all-detachments plus ten detachment options, mixed timing editors, Wolfquad/Support profiles, homepage notice, errors and horizontal overflow. Tests submit no reports or live user-list changes.

## Live application

Applied November 16, 2026 through the existing catalog-import RPC, in one transaction after comparing all 186 baseline records. All **158 changed rows** advanced from revision 1 to 2 and retain revision-1 history. A complete read-back matched every expected field in all 186 GSC rows. The **9,492 other catalog rows** kept the same revision/content digest (`05095cf39d7b865042948acfdfc610e2`). Full suite: **666 tests passed**; final GSC regression run: **15 passed**. Syntax, build, bundle and desktop/mobile browser checks passed. No schema, authentication or user-list changes were made.

## Completion application and validation

The follow-up was applied through the existing revision-checked import RPC after exact comparison of all 186 starting GSC records. Sixteen existing records advanced one revision; Brood Claim was inserted as revision 1. Complete read-back matched all expected fields across all **187 GSC records**. The other **9,492 records** kept the same revision/content digest (`ca971ced191fc3b2686979686420142c`). Prior revisions are retained in catalog history. No schema, authentication, saved-list or report data changed.

**693 tests passed**, including ten completion regressions; syntax, build and bundle checks passed. Browser checks at 1440px and 390px covered Brood Claim in the real Guide, Claw-only timeline filtering, the three Cult Ambush timing rows, the 9-inch/8-inch distinctions, and editable Wolfquad/Power Weapon profiles. Existing allied support regressions also passed.
