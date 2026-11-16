# GSC allied roster support — 2026-11-16

Core audit was published first in PR #39, release `225d84a9f10e1796ae12720ce7569f264e1a067b`. Its 60 catalog records passed complete read-back and its public desktop/mobile timeline checks passed.

GSC now uses runtime views of canonical Astra Militarum and Tyranid units and their actual datasheet abilities. There are no duplicate editable catalog records or database writes for allied support. Source edits propagate on catalog refresh; saved entries retain a source ID/faction. Correction reports point to the original unit/rule.

## Detachment allowances

- **Brood Brothers Auxilia:** 52 current uploaded Astra Militarum datasheets. Excludes AIRCRAFT, COMMISSAR, EPIC HERO, MILITARUM TEMPESTUS, OGRYN, RATLING/RATLINGS, TECH-PRIEST ENGINSEER and MINISTORUM PRIEST. Voice of Command and issuing-Orders references are suppressed. Kasrkin Warrior Elite stays available under the official FAQ, with its pre-existing source-review limitations preserved.
- **Final Day:** 14 uploaded TYRANIDS VANGUARD INVADER datasheets. Excludes AIRCRAFT, BROODLORD and GENESTEALERS. Native Synapse and Shadow in the Warp army rules are not granted; the SYNAPSE keyword remains for Psionic Parasitism. Datasheet abilities remain available.
- Both use 500/1000/1500-point allied allowances for Incursion/Strike Force/Onslaught. Combat Patrol-only and Legends entries are not projected. The current Valkyrie explicitly removes AIRCRAFT; the current Taurox Prime lacks MILITARUM TEMPESTUS. Older edition name-based exclusions are not substituted.

Search/add requires the matching detachment. Changing detachments retains the roster and flags invalid allies for correction. Allied points are entered per unit, including equipment/enhancements; missing, zero or invalid costs remain unverified. Excesses and allied Warlords are flagged. There is no automatic points or full army-legality certification.

Source attachment links remain within the eligible allied army; GSC Leaders do not gain permission to attach to Astra or Tyranids. Final Day's Synaptic Auger and Vanguard Tyrant obey their Tyranid/CHARACTER/non-EPIC-HERO and Winged Hive Tyrant restrictions. Other GSC or foreign enhancements are not granted to allied bearers.

The Guide includes eligible source abilities and explicit GSC allied stratagems. Actual keyword recipients are used for Darting Attacks, Psi Surge, Regimental Reinforcements and other allied targets. Cult Ambush and ordinary GSC-only benefits do not spread to allies. Existing Imperial Agents behavior is retained.

## Sources and checks

Official GSC faction pack v1.1, pp. 5–6, Brood Brothers updates and Kasrkin FAQ; current GSC detachment reference and three specifically checked Astra unit pages. URLs, review notes and hashes: `tests/fixtures/gsc-allies-sources.json`. Portable live-catalog snapshot: `tests/fixtures/gsc-allies-catalog.json`. Source-review flags and original imports remain intact.

Regression coverage includes search/exclusions, stale detachment selections, source propagation, army-rule suppression, attachments, enhancements, all battle-size caps, Guide targets, Deep Strike toggle and canonical report targets. Desktop/mobile browser checks exercise filtered search, entering allied points, equipping Vanguard Tyrant and the actual Guide's Paroxysm card without writing account or catalog data.
