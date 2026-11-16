# Adeptus Mechanicus readiness audit — 16 November 2026

Source-bound study audit of the preserved Admech catalog and pinned community
source, with selected explicit corrections checked against the official faction
pack v1.4 (14 October 2026). This does not certify every entry against the current
official Codex or validate army construction/points.

| Coverage | Count |
| --- | ---: |
| Rules and abilities | 167 |
| Datasheets / named profiles | 38 / 39 |
| Detachments | 11 |
| Usable study summaries | 124 |
| Named conflicts / incomplete procedures | 29 |
| Still missing effect mechanics | 14 |
| Rule edits / unit edits | 167 / 13 |

Every unit, rule and detachment in the pinned faction source is represented.
Native abilities, six attachment lists, detachment links and all datasheet weapon
references resolve. The consulted weapon table contains 123 records. Before this
pass all 167 stored descriptions were importer placeholders; the runtime had
generated 140 concise descriptions, 11 source issues and 16 empty effects.
The new review checks those generated descriptions as well as supplying saved
wording, core eligibility and explicit remaining problems.

## Corrections

- **Doctrina Imperatives** retains the battle-round selection, both full menus,
  ranged/melee distinction, BATTLELINE-or-6-inch conditions and round expiry.
  Ordinary and Purge Corps versions retain their separate 34-unit and four-unit
  scopes. This does not grant the army rule to allied units by keyword alone.
- **Haloscreed** now has the official 1/2/3-unit selection, embarked-unit
  permission, HALO OVERRIDE duration and four shared choices. **Neural Overload**
  preserves mortal wounds plus an additional ability for an existing HALO unit,
  versus one isolated ability without the keyword for a non-HALO unit.
  **Aggressive Impulse** targets a not-yet-moved Skorpius Dunerider and gives the
  actual post-Normal-move disembarking units their charge permission. Both of
  those Stratagems previously had empty effect records.
- **Cognitive Reinforcement** uses both Imperatives together and excludes
  Cybernetica Datasmith bearers. Its eligible-datasheet restrictions enforce that
  exception without changing other Enhancements. Transoracular Dyad Wafers
  retains its own Datasmith/Robot attachment and selection exclusion.
- **Cawl’s Canticles** gives nearby eligible units the Binharic Courage test
  bonus, rather than only Cawl’s unit. **Cyber-static Canticles** applies the
  Corpuscarii shooting benefit and Fulgurite post-fight healing to friendly
  recipients. **Scuttling Walker** gives permission during the move, rather than
  after it. **TL-4Ø9** includes the checked granted weapon profile. These eight
  rule corrections record the supporting official page and document fingerprint.
- **Attached providers:** Battle Protocols, Control Edict, Galvanic Field, Lord
  of the Machine Cult and Seekers of Divine Arcana require their attached
  provider. The Guide now accepts a named provider attached as native Support,
  alongside ordinary Leaders. Merely assigning a Support role to a model without
  that catalog ability does not qualify. Battle Protocols also requires Kastelan
  Robots and limits the bonuses to the Robot models, not the Datasmith.
- **Profiles:** Fusilave and Stratoraptor Movement and OC become `-`; Transvector
  Movement becomes 14 inches. The existing removal of Hover from the first two
  and Aircraft from the Transvector was already correct. Other profile values,
  Cawl’s already-correct Movement/Mobile entry and original source payloads stay
  unchanged. Missing/dash stats are excluded from numeric practice questions.
- **Squad selectors:** Corpuscarii, Fulgurites, both Pteraxii and both Sicarian
  units gain all 5–10 choices. Both Kataphron and both Serberys units gain all
  3–6 choices. These are composition-tier choices, not a points or legality
  certification. Named Combat Patrol units retain their fixed compositions.

## Retained source issues

The Benedictions import contains a half-range gate and round-start trigger that
differ from the pinned enrichment; both versions are fingerprinted, and the
stored variant remains intact and flagged. Data-psalm’s imported version label
also differs from the pin; its actual detachment links match and remain intact.

Acquisition at any Cost lacks the objective-designation procedure required by
dependent Explorator rules. Electro-shock assigns Advance/Charge penalties to
the shooter. Several move permissions expire before their later benefit can be
used. Programmed Withdrawal’s core target modes are alternatives, while its
effect applies to both slots without a mode gate; it must never become a combined
two-mode pickup. Detection-range effects, healing allocation, Combat Patrol
usage caps, test-result binding and the incomplete War-form Mantles procedure
retain named review explanations. Equipment-bound data-tethers/Omnispex and
ordinary versus named variants remain separate.

All 43 unresolved rules are excluded from practice answers and distractors.
Existing reference/review flags and unit scopes are preserved. Early shooting
hints identify Dunerider Fire Support, Electro-shock, Pinning Fire and Dread
Snipers while keeping their actual after-shooting resolution windows.

## Reproduction and verification

`scripts/audit-admech.cjs` never connects to a database. Against the retained
baseline it validates source IDs, profiles, links, exact original records and
fixed source hashes before producing 180 expected-revision payloads. Any saved
edit, revision change, missing entry or added native entry blocks the repair.
The existing administrator import RPC applies the batch atomically with history.
After application, regenerate against a newly reviewed snapshot; do not rerun
the old payload against the updated catalog.

All original imports, identifiers, enabled states, detachment/faction records and
unrelated rules remain unchanged. No account, saved list, schema or auth changes
are included. Regression tests cover all source coverage, stale snapshots,
official corrections, profile/size changes, native Support versus Leader gates,
enhancement exclusions, target alternatives, timings and practice exclusion.

The per-rule review list below describes the outstanding source work.

Validation: all 579 automated tests pass, along with syntax, build and bundle
checks. Desktop/mobile Chromium checks at 1440px and 390px cover Doctrina timing
rows, Haloscreed corrections, editable Archaeopter profiles and intermediate
squad counts, coverage classifications and the actual attached-Support Guide
card. No page errors or horizontal overflow were observed.

| Rule | Status | Source issue |
| --- | --- | --- |
| Acquisition at any Cost | Needs source review | Explorator Maniple offers Wound re-rolls of 1 when the attacker or its target is within control range of the Acquisition objective, until your next Command phase. Source gaps: no objective-designation or selection procedure is supplied, activation timing is absent, and the source is provisional. Confirm how and when the Acquisition objective is chosen before applying dependent rules. |
| ATTACHED UNIT | Needs source review | Servitor Battleclade uses a Kataphron Breachers attachment proxy. Source review: this does not authorize every CHARACTER with Leader to attach; confirm the eligible Kataphron Breachers Leaders, formation window and attachment exceptions. The existing checked attachment links are retained. |
| Auto-divinatory Targeting | Missing effect | Missing source mechanics: Auto-divinatory Targeting contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Baleful Halo | Missing effect | Missing source mechanics: Baleful Halo contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Belicosa-class Capacitor Vanes | Needs source review | This unit’s ranged weapons gain 6″ Range and 1 Strength. ADEPTUS MECHANICUS bearer only. Source marked pre-launch provisional; verify this version before use. |
| Benedictions of the Omnissiah | Needs source review | At the start of battle round 1, choose one benefit for the battle: • Panegyric Procession: friendly CULT MECHANICUS models improve ranged AP by 1 against targets within half weapon range. • Citation in Savagery: when a friendly CULT MECHANICUS unit is selected to fight after charging that turn, its melee weapons gain 1 Attack and 1 Strength for that phase. Source snapshot conflict: the stored variant encodes the half-range gate and round-start trigger differently from the pinned enrichment. Both source hashes are retained; verify the current Benediction selection and recipient procedure before applying this variant. |
| Cached Acquisition | Needs source review | When the selected unit is destroyed, Cached Acquisition can still target it and make an objective sticky. Source gap: the effect targets this-unit instead of binding an objective; confirm the controlled-objective selection, expiry and control-transfer procedure. The destroyed-unit and objective-range gates in the core target record still apply. |
| Cantic Thrallnet | Needs source review | At the start of a battle round, you may choose one friendly SKITARII unit within 12″ of this bearer. Select either Conqueror or Protector Imperative for that unit, exclusively, until the next battle round. MARSHAL bearer only. Source conflict: exclusive activation encodes choosing one Imperative, without specifying whether this replaces or adds to the army’s active Imperative; confirm the intended combination. |
| Chant of Electrotraction | Needs source review | Imported source needs checking. The imported source grants a charge after Advancing, but activates in the Movement phase and expires that phase. Check how long it lasts before using it in the Charge phase. |
| Data-blessed Autosermon | Missing effect | Missing source mechanics: Data-blessed Autosermon contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Defend the Divine Work | Needs source review | At phase start, Manipulus Skand’s unit may receive a 4+ invulnerable save for that phase. Source gap: this Combat Patrol record has no usage limit, unlike the ordinary Manipulus’s once-per-battle ability. Confirm its own limit; do not silently copy the ordinary version or assume unlimited use. |
| Electro-shock | Needs source review | After this Corpuscarii unit shoots in your Shooting phase, select a non-MONSTER, non-VEHICLE enemy hit by those attacks. The source intends -2″ Move and -2 Advance/Charge until the end of your opponent’s next turn, but assigns the Advance and Charge penalties to this-unit, the shooter. Confirm the penalty recipient before applying it. |
| Emotionless Clarity | Missing effect | Missing source mechanics: Emotionless Clarity contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Expedited Purge Protocol | Needs source review | Expedited Purge Protocol grants a charge after Advancing, but the stored duration expires in Movement, before the Charge phase. Confirm the permission’s duration and the selected unit’s eligibility before charging. |
| Extinction Order | Missing effect | Missing source mechanics: Extinction Order contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Guided Retreat | Needs source review | Imported source needs checking. The imported source grants shooting and charging after Falling Back, but expires in the phase when the Fall Back is selected. Check its duration and the meaning of its hazard re-roll before using it. |
| Incantation of the Iron Soul | Needs source review | When damage is allocated to a friendly CULT MECHANICUS model, CULT MECHANICUS models in this unit gain Feel No Pain 4+ against mortal wounds for this phase. Source review: the damage-allocation event does not bind the triggering CULT MECHANICUS model to the selected unit; confirm the recipient and activation before resolving the save. |
| Incense Exhausts | Missing effect | Missing source mechanics: Incense Exhausts contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Infoslave Skull | Missing effect | Missing source mechanics: Infoslave Skull contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Litany of the Electromancer | Missing effect | Missing source mechanics: Litany of the Electromancer contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Mantle of the Gnosticarch | Missing effect | Missing source mechanics: Mantle of the Gnosticarch contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Martial Signatum Amplificator | Needs source review | This unit gains the SKITARII keyword. TECH-PRIEST bearer only. Source marked pre-launch provisional; verify this version before use. |
| Mechanical Guidance (Once per turn, per unit) | Missing effect | Missing source mechanics: Mechanical Guidance (Once per turn, per unit) contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Miniaturised Autosimulacra | Needs source review | Once per battle for the upgrade unit, at phase start choose one friendly PURGE CORPS DELTIC-9 unit to regain D3+2 wounds. Source gap: the selector chooses a unit rather than a particular wounded model and supplies no range or model-allocation procedure; confirm the recipient and healing restriction. |
| Momentum Feedback | Needs source review | After an enemy shoots at the selected ELECTRO-PRIESTS unit in your opponent’s Shooting phase, it makes a D6″ Surge move. Source gap: the full Surge movement and legal end-position procedure are absent; confirm those restrictions before moving. |
| Necromechanic | Missing effect | Missing source mechanics: Necromechanic contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Noospheric Recon | Needs source review | Cohort Acquisitus gives Serberys Raiders and Sicarian Infiltrators RECON AUGURY and describes selecting a visible enemy within 12″ in your Shooting phase to increase its detection range by 3″. Source gaps: detection range and its measurement, activation frequency and expiry are not fully defined; confirm those procedures. |
| Omnicogitator | Needs source review | Select either Conqueror or Protector Imperative for this unit, exclusively. SKITARII MARSHAL bearer only. Source review: the exclusive one-option activation does not establish whether both Imperatives should apply; check this Enhancement’s own wording rather than substituting a similarly named ability. |
| Omnispex | Needs source review | This unit’s ranged weapons gain Ignores Cover. Source marked pre-launch provisional; verify this version before use. |
| Omnissiah’s Blessing | Needs source review | Omnissiah’s Blessing selects one friendly ADEPTUS MECHANICUS model within 3″, heals D3 wounds and grants Feel No Pain 5+ if it is a VEHICLE, until your next Command phase. Source gap: no activation event is supplied. A once-per-phase recipient selector does not make this permission repeatable in every phase; confirm the actual healing window. |
| Overloaded Safeguards | Needs source review | When the selected TECH-PRIEST unit Falls Back in your Movement phase, Overloaded Safeguards permits shooting and charging despite that move. The encoded duration ends in Movement, before either later phase. Confirm the lasting permission before using it. |
| Priority Reclamation | Missing effect | Missing source mechanics: Priority Reclamation contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Programmed Withdrawal | Needs source review | At the end of your opponent’s Fight phase, select up to two SICARIAN units OR one SKITARII INFANTRY/MOUNTED unit, with every selected unit outside 3″ of enemy units, to enter Strategic Reserves. Source conflict: the core target modes are alternatives, but the imported effect applies to both target slots without a mode gate. Confirm the selected branch; never combine both modes. |
| Rad-Bombardment | Needs source review | Battle round 1, at the start of the round: for each enemy unit in the enemy deployment zone, your opponent chooses either to risk D3 mortal wounds on a D6 roll of 3+, or to become Battle-shocked and risk D3 mortal wounds on a 5+.  Battle rounds 2–5, at the start of your Command phase: roll a D6 for each enemy unit in the enemy deployment zone. On a 3+, it suffers 1 mortal wound and must take a Battle-shock test. Source review: the approximation note contradicts the fuller encoded branches and there is no explicit Battle-shock expiry in this record. Check the full Bombardment/Fallout resolution; keep their timing and thresholds distinct. |
| Radial Suffusion | Missing effect | Missing source mechanics: Radial Suffusion contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Reactive Safeguard | Missing effect | Missing source mechanics: Reactive Safeguard contains only a no-effect marker. Supply checked effects, timing, eligibility and usage limits before use; core CP/phase metadata alone does not establish its effect. |
| Repolarised Augurs | Needs source review | At the start of your opponent’s Movement phase, Repolarised Augurs subtracts 3″ from the selected unit’s detection range for the turn. Source gap: detection range is undefined in the supplied mechanics; confirm the measurement and stacking procedure. |
| Shroud Protocols | Needs source review | When the selected SKITARII INFANTRY unit is targeted in your opponent’s Shooting phase, the source permits ranged targeting within 18″, but does not prohibit targeting from farther away. Confirm the intended outside-18″ restriction before treating this as protection. |
| Tribute of Emphatic Veneration | Needs source review | At your Movement-phase start, Tribute of Emphatic Veneration targets one friendly CULT MECHANICUS unit and a distinct enemy within 18″; the enemy takes Battle-shock and suffers -1 Hit on failure until your next Command phase. Source gap: the failure condition is not explicitly tied to the second target’s test; confirm test-result binding before applying the penalty. |
| Unshackled Wrath | Needs source review | During your turn, choose one benefit for this unit’s ranged weapons for this phase: Sustained Hits 1; Lethal Hits; or both together with Hazardous. SKITARII only. Source marked pre-launch provisional; verify this version before use. |
| Verse of Vengeance | Needs source review | When an enemy selects this unit as an attack target, apply this for the phase: each destroyed CULT MECHANICUS model in this unit that has not been selected to fight this phase rolls a D6. On a 4+, it fights after the attacking unit finishes, then is removed. Source review: the not-yet-selected-to-fight predicate has no subject, so its binding to the destroyed model/unit is unclear; confirm eligibility before resolving fight-on-death. |
| Voltagheist Reliquary | Needs source review | Voltagheist Reliquary suppresses an undefined overwatch-against-bearer rule in the import. The current supplement instead prohibits enemy snap-shooting attacks from targeting this unit. Confirm the complete snap-shooting restriction; do not assume it only affects the Fire Overwatch Stratagem. |
| War-form Mantles | Needs source review | Lords of the Forge grants friendly TECH-PRIEST models a 4+ invulnerable save and Feel No Pain 5+. Source gap: the import omits the Baffling Data Screed shooting ability supplied by the official supplement, and encodes unfiltered friendly recipients. Check the full TECH-PRIEST model scope, optional test/target branches and usage restriction before treating this as the complete detachment rule. |
