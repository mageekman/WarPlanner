# Necrons readiness audit — 14 November 2026

Audited all 230 native rules, 57 datasheets (58 profiles) and 13 detachments against
their preserved imported 40kdc mechanics and the pinned faction index at
`6ea813f7706bc9a492026d8b4403af99a965162b`. No datasheets are missing from that
source. This community-source audit does not certify the faction against the
current official Codex.

The live repair updated all 230 rules. Follow-up queries verified every original
source payload, unit scope, reference/review flag and guide hint was preserved,
all 71 non-rule records were unchanged, and no generic saved prompts remained.
All 381 tests, syntax/build/bundle checks and desktop/mobile browser checks passed.

| Result | Rules |
| --- | ---: |
| Usable source-based study summaries | 158 |
| Specific source conflicts or incomplete mechanics | 57 |
| Missing effect records | 15 |

All 230 generic saved descriptions are replaced with meaningful study text or a
specific explanation of a source gap. All 57 units, 58 stat profiles, faction and
13 detachments are preserved. Rule identities, original mechanics and provenance,
unit scopes, review/reference flags, existing guide hints and saved lists remain
unchanged. Three records differ mechanically from the pinned enrichment: Cold
Fervour, Plasmacyte (Amonhotekh’s Guard Skorpekh Destroyers) and Transdimensional
Deployment. Those imported versions are retained with explicit review notes.

## Guide behavior and important gaps

Normal Reanimation Protocols is placed at the end of your Command phase, with the
ordinary and Amonhotekh’s Guard versions kept separate. The imported records give
D3 recovery but do not encode the full wound-allocation, returning-model and
attached-unit procedure. That remains a material source gap. The Command Barge’s
Resurrection Orb is empty; the other Orb record has a D6 heal but incomplete timing
and reanimation resolution. These descriptions are not complete substitutes for
the official Reanimation rules.

Power Matrix retains phase-start objective-control snapshots, the every-model
wholly-within condition and the full-Hit-re-roll branch replacing re-rolls of 1.
Hyperphasing retains its battle-size caps, unengaged gate and opponent-turn-end
placement. Chronometron resolves after shooting with its no-charge restriction.
Core Stratagem records add CP costs, phase/turn gates, exclusions and target
eligibility, including both required Hyperphasic Recall targets and Warlord-only
uses of Reanimation Crypts and Your Time Is Nigh. Missing setup, casualty binding,
movement or expiry conditions stay explicit. All 72 unresolved records are
excluded from practice answers and distractors.

## Guarded repair

`scripts/audit-necrons.cjs` generates the repair without connecting to a database.
It rejects any added, removed or changed native record, refuses non-placeholder
wording, and validates source coverage, links and profiles before producing the
230-row expected-revision transaction. The existing administrator import RPC and
history trigger apply the changes atomically. Regenerate against a fresh snapshot
if anything changes; the original snapshot cannot be rerun after application.

Regression tests cover every source ID, preservation of non-rule data and source
payloads, Reanimation versions, Power Matrix snapshots, target/Warlord gates,
source conflicts, stale snapshots, practice exclusion, the real guide and the
detachment-filtered timeline.

## Source review list

Select Necrons in the Workshop and use **Summary coverage** to find **Needs
summary** and **Missing effect**. Each affected card names the source gap.

| Rule | Scope | Source issue |
| --- | --- | --- |
| Aggression Protocols | Amonhotekh’s Guard | When an eligible AMONHOTEKH’S GUARD unit other than a MONSTER or VEHICLE is selected to Fall Back, it gains shooting and charging permission despite Falling Back. The source expires both permissions that Movement phase; confirm how long they should last. |
| Animus Curse | Cryptek Conclave | After an enemy finishes attacking, this Cryptek can be targeted despite being destroyed, and friendly NECRONS models re-roll Hits against that enemy for the battle. The core casualty gate refers to a model belonging to this model rather than clearly the Cryptek itself; confirm the destruction binding. |
| Atomic Disintegrators | Cryptek Conclave | Atomic Disintegrators has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Autodivinator | Canoptek Court | Autodivinator has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Blood-fuelled Cruelty | Annihilation Legion | Blood-fuelled Cruelty has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Bound Creation | Cryptothralls | CRYPTEK models in this Cryptothralls unit have Feel No Pain 4+. The source’s separate CRYPTEK condition has no explicit subject; confirm the attached-unit eligibility rather than granting it to every model. |
| Canoptek Swarm | Canoptek Spyders | In the Command phase, return one destroyed model to a friendly CANOPTEK SCARAB SWARM unit within 6″. The source omits the range’s origin and tests the Scarab keyword on an unspecified subject; confirm which Spyder and target satisfy the rule. |
| Cold Fervour | Cursed Legion | Friendly DESTROYER CULT weapons gain +2 Strength. The first time each turn a DESTROYER CULT unit destroys an enemy or reduces it below Half-strength, other friendly NECRONS weapons, excluding DESTROYER CULT, MONSTER and TITANIC, gain +2 Strength for the turn. The preserved effect and usage differ from the pinned source; confirm the reward’s trigger and frequency. |
| Cosmic Distortion | Pantheon of Woe | The notes describe NECRONS MONSTER Distortion Fields marking enemies within 6″ as unravelling, improving AP of attacks against them by 1, with an optional 3-mortal-wound extension to 9″ and C’tan-specific bindings. The effect instead improves enemy AP and omits those marking, extension and binding mechanics; confirm the full detachment rule. |
| Cosmic Precision | Hypercrypt Legion | Cosmic Precision has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Countertemporal Shift | Canoptek Court | This targeted unit is intended to be selectable by ranged attacks only from within 18″ for the phase. The effect encodes permission within 18″ rather than a complete prohibition beyond it; confirm the targeting restriction. |
| Cryptek Retinue | Cryptothralls | Cryptothralls may be attached under this CRYPTEK-led attachment rule. The source contains only an attachment reference; confirm the legal combined-unit procedure and any limits. |
| Curse of the Cryptek | Canoptek Court | After an enemy finishes attacking, this destroyed Cryptek can be selected. Friendly CANOPTEK attackers add 1 to Hit and Wound rolls against that enemy for the battle. The core casualty gate refers to a model belonging to this model rather than clearly the Cryptek itself; confirm which death unlocks the mark. |
| DAMAGED: 1-6 WOUNDS REMAINING | The Silent King | While the Silent King model has at most 6 wounds remaining, halve its Attacks and subtract 1 from this unit’s Hit rolls. The effect does not specify weapon profiles or rounding for halved Attacks; confirm those details. |
| Demanding Leader | Starshatter Arsenal | In your Command phase, select one friendly non-TITANIC NECRONS MOUNTED or VEHICLE unit within 6″. It is intended to shoot after Falling Back until your next Command phase, but the effect grants the permission to this unit rather than the selected unit; confirm the recipient. |
| Deployment | Convergence of Dominion | When set up, this Convergence of Dominion is represented as ten connected sections. The source does not encode the full setup distances and terrain/section placement rules; verify those restrictions. |
| Dimensional Corridor | Hypercrypt Legion | Dimensional Corridor has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Dimensional Tunnel | Starshatter Arsenal | For the phase, the selected unit can pass through models and terrain and ignore vertical distances. The effect does not specify eligible move types or ending-position restrictions; confirm those limits before moving. |
| Disharmonisation Cascade | Pantheon of Woe | Disharmonisation Cascade has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Driven by Hatred | Lokhust Lord | The Lokhust Lord re-rolls Hit and Wound rolls against targets below Half-strength. The source labels this partial; confirm any missing attack-type or usage conditions. |
| Eternity Gate | Monolith | The Monolith’s imported Eternity Gate record grants Deep Strike when arriving from Strategic Reserves and forbids a selected unit from charging. It never selects that unit or encodes the teleport/setup procedure; confirm the complete Gate rule before using it. |
| Gravitic Pulse | Obelisk | At the start of your opponent’s Movement phase, select one visible enemy within 18″ of this Obelisk. Halve its Move, Advance and Charge rolls for the turn. If it has FLY, after each move until the next Movement phase roll a D6: on 4+, it suffers D3 mortal wounds. Confirm the rounding and mixed expiry windows omitted from the source. |
| Honourable Combatant | Obeisance Phalanx | Honourable Combatant has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Hyperphasic Recall | Hypercrypt Legion | After an enemy destroys a model in the first selected NECRONS INFANTRY unit, relocate that unit wholly within 6″ of a separate friendly Monolith, unengaged. The source lacks explicit enemy-spacing and full setup restrictions; confirm those before repositioning. |
| Hyperspatial Transfer Node | Hypercrypt Legion | This unit is intended to use a fixed 6″ Advance, but the source applies it after the Advance ends. Confirm that the replacement applies before measuring the move. |
| Insanity’s Ire | Annihilation Legion | After an enemy shoots at this unit, it may make a D6″ Surge move. The effect does not encode a casualty or engagement requirement; check the complete Surge eligibility conditions. |
| Invasion Beams | Night Scythe | At Fight-phase end, if this Night Scythe is empty, one friendly unengaged NECRONS INFANTRY unit within 6″ can embark in it. The source does not specify whether every model must be within range or grant a disembarked-this-turn exception; confirm the embark procedure and capacity. |
| Iron Will | Overlord Amonhotekh | Iron Will includes a 2+ fight-on-death effect but also destroys this model if it has not fought, without a destruction trigger. Confirm when the ability activates and whether that self-destruction step belongs in the rule. |
| Mass Transmogrification | Pantheon of Woe | Mass Transmogrification has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Metalodermal Tesla Weave | Canoptek Court | Once per phase per model, when an enemy selects charge targets, roll a D6: 1 does nothing, 2–5 causes D3 mortal wounds to the enemy, and 6 causes 3. The effect does not require that enemy to charge the bearer’s unit; confirm the triggering target. |
| Molecular Erosion | Pantheon of Woe | Once per battle round per army, select one visible unravelling enemy. It takes a Battle-shock test at -1 and suffers D3+1 mortal wounds if failed. The source supplies no activation event for this selection; confirm when to use it. |
| Molecular Targeting | Cryptek Conclave | For the phase, this eligible unit ignores modifiers to Weapon Skill, Ballistic Skill and Hit rolls. The effect also ignores Wound modifiers if an unspecified subject has CRYPTEK; confirm whether that benefit applies per CRYPTEK model or to the whole unit. |
| Mortis Protocols | Cursed Legion | Mortis Protocols has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Multi-threat Eliminator | Hexmark Destroyer | Once per turn, this Hexmark can make a reactive shot at a triggering enemy while a nearby event object is within 3″. The source omits the triggering attack/casualty event and does not identify that nearby object; confirm the full trigger and eligible target. |
| Murderous Reanimation | Annihilation Legion | Murderous Reanimation has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Omnilocked Strafing | Skyshroud Spearhead | When a friendly NECRONS MOUNTED unit is selected to Fall Back, it gains shooting permission for the phase. The effect does not explicitly waive Fall Back and expires before the Shooting phase; confirm the permission and duration. |
| Particle Pulse | The Phaeron’s Armoury | At the start of your Shooting phase, select one enemy visible to the bearer and within 12″ of its unit. Increase its detection range by 3″ for the phase. The source does not define detection range; confirm that mechanic before applying it. |
| Phase Melding | Pantheon of Woe | Phase Melding has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Plasmacyte | Amonhotekh's Guard Skorpekh Destroyers | When this Amonhotekh’s Guard Skorpekh unit is selected to fight, its weapons gain Devastating Wounds for the phase. Unlike the ordinary Plasmacyte record, it has no use cap and its scope differs from the pinned source; confirm the allowed uses. |
| Plasmacyte | Skorpekh Destroyers, Ophydian Destroyers | Once per battle, this unit’s weapons gain Devastating Wounds for a phase. The imported record lacks an activation event and a per-equipped-Plasmacyte use count; confirm the selection window and number of uses. |
| Potentiality Syphon | Cryptek Conclave | This eligible unit activates Reanimation Protocols. The effect also heals this unit by 1 if an unspecified subject has CRYPTEK; confirm which models receive the extra wound and when the ability is activated. |
| Powers of the C’tan | Tesseract Vault | When this Tesseract Vault is selected to shoot, choose up to two powers: antimatter meteor, cosmic fire, seismic assault or time’s arrow. This effect grants weapon references but contains no power profiles; check those weapon entries, and use only one selection while the Vault’s Damaged condition applies. |
| Prelocational Optimiser | The Phaeron’s Armoury | If the bearer’s unit was set up this turn using a friendly Monolith’s Eternity Gate, choose Lethal Hits or Sustained Hits 1 for its ranged weapons when selected to shoot. The source gives a permanent scope despite a turn-based setup condition; confirm when the chosen benefit expires. |
| Protocol of the Eternal Revenant | Awakened Dynasty | Protocol of the Eternal Revenant has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Protocol of the Undying Legions | Awakened Dynasty | After an enemy finishes attacking this eligible unit, activate Reanimation Protocols and reanimate D3 wounds, or D3+1 while led by a NECRONS CHARACTER. The source also has a separate heal after activating Reanimation, which could double-count recovery; confirm whether these replace or add to the normal roll. |
| Protocol of the Vengeful Stars | Awakened Dynasty | After a destruction event, this eligible unit may shoot at the enemy that finishes attacking, if eligible. The source does not identify which unit or model must be destroyed or bind that casualty to the attacker; confirm the reactive-shot trigger. |
| Quantum Abacus | Cryptek Conclave | When a friendly Stratagem targets this bearer’s unit, roll a D6 and add 1 if the unit is within objective control range. On 4+, gain 1CP. The source supplies no additional usage cap; apply current CP-gain limits and confirm any rule-specific cap. |
| Quantum Invader | Night Scythe | This Night Scythe may arrive from Strategic Reserves in the next Movement phase, including battle round 1. The source does not define what event starts that countdown or additional arrival conditions; confirm the complete rule. |
| Reactive Reposition | Starshatter Arsenal | After an enemy shoots, this eligible unit makes a D6″ Normal move. The effect does not encode a wound-loss or engagement gate; confirm the target and reactive-move eligibility. |
| Reactive Subroutines | Canoptek Court | After an enemy ends a Normal, Advance or Fall Back move, this eligible unit makes a 6″ Normal move. Apply the core target’s range gate and check any engagement restriction absent from the effect. |
| Reanimation Crypts | Hypercrypt Legion | The Warlord uses this Stratagem to activate Reanimation Protocols for friendly NECRONS units in Strategic Reserves. The effect gives no specific activation step or frequency inside the Command phase; confirm that procedure. |
| Reanimation Protocols | Amonhotekh’s Guard | At the end of your Command phase, friendly on-battlefield units with the Amonhotekh’s Guard version of Reanimation Protocols recover D3 wounds. The effect also recursively activates itself and omits healing/returning-model sequencing; confirm the complete recovery procedure. |
| Reanimation Protocols | Ghost Ark, Seraptek Heavy Construct, Triarch Praetorians, Necron Warriors, Canoptek Macrocytes, Technomancer, Night Scythe, Overlord, Royal Warden, Canoptek Doomstalker, Immortals, Cryptothralls, Orikan the Diviner, Tesseract Vault, Tomb Blades, Psychomancer, Lokhust Heavy Destroyers, Skorpekh Destroyers, Convergence of Dominion, Skorpekh Lord, Deathmarks, Triarch Stalker, Imotekh the Stormlord, Obelisk, Canoptek Reanimator, Catacomb Command Barge, Lokhust Destroyers, Lychguard, Monolith, Overlord with Translocation Shroud, Canoptek Scarab Swarms, Canoptek Wraiths, Trazyn the Infinite, Lokhust Lord, C’tan Shard of the Nightbringer, Flayed Ones, Annihilation Barge, Illuminor Szeras, Nekrosor Ammentar, Canoptek Tomb Crawlers, Ophydian Destroyers, Plasmancer, Doomsday Ark, Hexmark Destroyer, C’tan Shard of the Void Dragon, C’tan Shard of the Deceiver, Doom Scythe, Geomancer, The Silent King, Chronomancer, Transcendent C’tan, Canoptek Spyders | At the end of your Command phase, friendly on-battlefield units with Reanimation Protocols activate it and recover D3 wounds. The source does not encode how wounds are allocated, when destroyed models return or how attached units are handled; confirm that procedure before resolving Reanimation. |
| Reletavistic Tether | Pantheon of Woe | Reletavistic Tether has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Repair Barge | Ghost Ark | Once per turn, select one friendly Necron Warriors unit within 3″ of this Ghost Ark to activate Reanimation Protocols. The source’s damage condition refers to this unit rather than clearly to those Warriors and gives no triggering event; confirm which unit must take damage and when the repair is used. |
| Resurrection Orb | Catacomb Command Barge | Resurrection Orb has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| Resurrection Orb | Overlord, Overlord with Translocation Shroud, Lokhust Lord | While the bearer leads a unit, its Resurrection Orb can recover D6 wounds for that unit once. The source gives no activation event or full reanimation/returning-model procedure; confirm the timing and resolution instead of treating the heal as an unrestricted action. |
| Singularity Matrix | Pantheon of Woe | Once per turn per model, when an enemy Stratagem selects a target within 12″ of the bearer, increase its cost by 1CP. The source assigns the modifier to this unit rather than clearly to the triggering enemy use; confirm which player pays it. |
| Soulless Reaper | Annihilation Legion | When an engaged enemy unit is selected to Fall Back, roll D6: on 3+, it cannot Fall Back or otherwise move. The source gives no expiry for that movement prohibition; confirm its duration and any exception. |
| Suboptimal Facade | Canoptek Court | When an enemy selects charge targets, this eligible unit activates Reanimation Protocols. The source does not bind the charge to the bearer’s unit; confirm the triggering target and activation restrictions. |
| Subsurface Quantumweave | The Phaeron’s Armoury | For the triggering attack sequence against an eligible NECRONS TITANIC FLY unit, the effect worsens incoming AP by 1. The notes instead describe setting AP to 1; confirm whether the rule sets or modifies AP and which attacks it affects. |
| Surrogate Hosts | Trazyn the Infinite | At the start of a Command phase, if Trazyn is on the battlefield, he may replace one friendly NECRONS INFANTRY CHARACTER other than a SKORPEKH LORD or EPIC HERO: destroy the selected model without death triggers, then reposition Trazyn. The source says closest-to-original rather than the replacement model’s position and gives no spacing or attachment procedure; confirm the setup details. |
| Swift As Death | Skyshroud Spearhead | After an enemy ends a move within 8″ of a friendly unengaged NECRONS MOUNTED unit, this eligible unit may make a D3+3″ Normal move. The effect does not explicitly bind this unit to that nearby unit; confirm the selected friendly recipient. |
| Synergistic Empowerment | Cryptek Conclave | At the start of your Shooting phase, select one friendly non-MONSTER/non-VEHICLE NECRONS model to gain CRYPTEK for the phase. The eligibility measures 12″ from a CRYPTEK model in the selected unit, rather than clearly from the bearer; confirm who provides the range and whether a whole unit or one model qualifies. |
| Territorial Imperatives | Amonhotekh’s Guard | Territorial Imperatives has no effect mechanics in the imported source. Confirm its complete rule before applying benefits, costs, targets or timing. |
| The Stars Are Right | Orikan the Diviner | In the Fight phase, Orikan triples his Attacks and Strength for the phase. The source gives no usage cap or activation event and does not identify weapon profiles; confirm the complete transformation rule before applying the multiplier. |
| Their Number is Legion | Amonhotekh's Guard Necron Warriors | When this Amonhotekh’s Guard Warriors unit activates Reanimation Protocols, it may re-roll the recovery dice. The trigger refers to the ordinary Reanimation ability ID rather than its separate Guard version; confirm which activations qualify. |
| Transdimensional Deployment | Skyshroud Spearhead | Friendly Tomb Blades gain Deep Strike and add 1 to ranged Hit rolls when selected to shoot on a turn in which they made an ingress move. The imported effect differs from the pinned source; confirm the arrival condition and beneficiary before applying it. |
| Transdimensional Displacement | Transcendent C’tan | In your Movement phase, this Transcendent C’tan can make an unlimited-distance Advance through models, ending more than 8″ from enemies. The source does not define terrain passage, other placement restrictions or the full teleport/movement procedure; confirm those conditions. |
| Translocation Shroud | Overlord with Translocation Shroud | Add 6″ to this unit’s Move for the phase. The record supplies no activation event, movement mode or remaining Translocation Shroud rules; confirm the full ability rather than assuming this is a complete teleport or Advance replacement. |
| Triarchal Menhirs | The Silent King | When a model in the Silent King’s unit is destroyed, the effect destroys all TRIARCHAL MENHIR models in that unit. It does not restrict the trigger to the Silent King’s destruction, so a Menhir casualty would also remove the rest; confirm the intended casualty trigger. |
| Your Time Is Nigh | Obeisance Phalanx | After a model in the selected Warlord’s unit is destroyed, enemy Battle-shock and Leadership tests suffer -1 for the battle. The effect does not restrict the trigger to the Warlord’s destruction or define the affected enemy scope; confirm both before applying the penalty. |
