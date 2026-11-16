# Leagues of Votann study-data audit — 2026-11-16

Scope: **193 uploaded records: 155 rules, 26 units with 29 named profiles, 11 detachments and one faction.** The repair updates all 155 rule summaries and 10 unit records (165 changes). IDs, imports, memberships, enabled states, named variants, profiles, faction and detachment records are preserved. This is not certification of points, full army legality or every Codex/weapon entry.

## Sources

- Preserved baseline: `tests/fixtures/votann-audit-before.json`.
- [Pinned 40kdc-data core](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b/data/core/leagues-of-votann) and enrichment, commit `6ea813f7706bc9a492026d8b4403af99a965162b`, CC BY 4.0. All unit/weapon/ability links, compositions, attachments, faction and detachment links are checked. There are no imported/pinned mechanics differences.
- [Official faction pack v1.2](https://assets.warhammer-community.com/eng_14-10_wh40k_faction_pack_leagues_of_votann-os3nsdjlao-buac8a7pzn.pdf), legal October 14, 2026. This explicit version/effective date takes precedence over search results for older documents.
- [Current faction reference](https://wahapedia.ru/wh40k11ed/factions/leagues-of-votann/) and all 22 ordinary datasheet pages, checked November 16, 2026. Main profiles match; Iron-master/Assistant/E-COG and Grimnyr/CORV profiles remain distinct. These pages supplement the official pack; they are not independent official certification.
- Source fingerprints and selected profile checks: `tests/fixtures/votann-audit-sources.json`. No scraped page text or PDF is bundled. Original rewritten summaries, activation contexts and review decisions: `scripts/votann-study-notes.json`.

## Results

**143 usable rule summaries; 12 explicit source-review entries; no empty display descriptions.** Unresolved rules are excluded from quiz answers/distractors; four Combat Patrol units carry source-review notes and are excluded from statistics questions.

- Recovered fourteen empty imported effects from checked references, including Adaptable Avarice, Dêlvewerke Navigator, Iron Ambassador, Metaphysical Brokerage, Nomad Strategist, Piledriver, Secure Positions, Signature Restoration, Tactical Alchemy, Unstoppable Force, Vengeance Flare, Wall of Steel and Writ of Acquisition, plus Augmented Assault.
- Restored the complete Prioritised Efficiency/YP sequence: either-player Command generation, round-two objective conditions, gain-before-state-selection, the 7YP threshold, separate Hostile/Fortify objective gates, and no immediate state switch merely from spending YP.
- Kept Mercenary Oathband’s 3YP manual toggle as an override, not a second automatic threshold rule. Restored Optimal Application’s eligible units, objective/provider gates and 2YP cap; tracked gained YP separately from banked YP for Metaphysical Brokerage.
- Separated optional YP upgrades from free base effects and preserved shared per-army limits. Corrected the pin/assail sequence, specific retaliation targets, bearer versus unit recipients, equipment/attachment conditions and repair limits.
- Preserved Hearthband versus Hearthguard Covenant distinctions: Brëkkeknots targets, High Kâhl eligibility/removal sequence, Ironskein bearers, and Materialisation Matrices’ narrower ingress permission, including enemy deployment-zone placement.
- Split opponent-Shooting/either-Fight timings. Void Hardened ends with the attacker’s sequence; Secure Positions is at the end of any own phase; Graviton Vault has separate shooting/fighting triggers. Current 8″ ranges and the Evaluator support FAQ remain explicit.
- Restored intermediate composition counts for ordinary Thunderkyn, Beserks, Hearthguard, Pioneers and both Steeljack datasheets, without changing points or the four Combat Patrol unit sizes.
- Removed Votann from the homepage faction WIP list; retained the development/accuracy/report notice. Specific unresolved entries remain flagged.

The official Hekaton transport capacity is 14 Votann INFANTRY with EXOARMOUR/EXOFRAME/IRONKIN STEELJACKS consuming two spaces and no ARTILLERY; Sagitaur capacity is six with the listed exclusions. These were checked as source context. The app has no general transport-capacity legality engine, so this audit does not claim automatic enforcement. Sagitaur’s displayed disembark summary states its capacity/exclusions. Support models’ zero-space transport rules and destruction dependencies remain source context, not newly implemented army-legality features.

## Remaining gaps

Twelve Bane-slayer’s Bulwark Combat Patrol rules remain unverified against a current variant-specific source: Breaching Fire; Brôkhyr Barrage; Claimed for the Kindred; Decisive Destruction; Fast-firing Targeters; Indomitable Exemplar; Opportune Advance; Panspectral Scanning; Point-blank Fusillade; Secure Resources; the unit Weavefield Crest; and Vynn’s personal Weavefield Crest. Similar names do not justify replacing their mechanics with ordinary matched-play rules.

Pan-spectral Lockons’ checked text has no separate expiry for the spotted designation; none is invented. Weapon links are checked against the pinned set, but weapon stats and points are not globally certified or rewritten.

## Reproduction and validation

```sh
node scripts/audit-votann.cjs tests/fixtures/votann-audit-before.json /tmp/votann-audit
node tests/votann-audit.test.cjs
npm run check
npm test
npm run build
npm run bundle
```

The generator makes no database connections and refuses stale revisions, user wording, profile edits, catalog additions/removals or source drift. Live application uses the existing expected-revision catalog RPC after checking the complete baseline inside the same transaction. Other factions are verified by an aggregate revision/content digest.

Validation: 651 full-suite tests, syntax/build/bundle checks, and desktop/mobile browser QA at 1440px/390px. Browser checks cover the actual Guide, all-detachments plus eleven detachment options, split timing editors, three Iron-master and two Grimnyr profile rows, homepage notice, errors and horizontal overflow. QA submits no reports and saves no live user lists.

## Live application

Applied November 16, 2026 through the existing catalog-import RPC in one transaction after comparing all 193 baseline rows. All **165 changed records** advanced from revision 1 to 2 and retain revision-1 history. Full read-back matched every expected field in all 193 Votann records. The **9,485 other catalog records** kept the same revision/content digest (`bb2c83b1401ace860ca2aa06c76e43b4`). No schema, authentication, user lists or unrelated faction data were changed.
