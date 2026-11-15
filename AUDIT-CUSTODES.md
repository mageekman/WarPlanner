# Adeptus Custodes readiness audit — 15 November 2026

Audited all 158 native rule records, 39 datasheets and 16 detachments against the
preserved imported mechanics and the pinned 40kdc core faction index at
`6ea813f7706bc9a492026d8b4403af99a965162b`. This is a community-source audit;
it does not certify the entire faction against the current Codex.

| Result | Rules |
| --- | ---: |
| Source-based study summaries | 116 |
| Explicit source conflicts or incomplete mechanics | 41 |
| Missing effect (provisional stub) | 1 |

All 158 generic saved descriptions are replaced with meaningful study text or a
specific explanation of the source gap. Core Stratagem records supply CP costs,
phase/turn gates, keyword restrictions, target counts, event binding and compound
eligibility. Enhancement targets retain core bearer and datasheet restrictions.
Stable source links and explicit timing make the rules available in the real
unit guide as well as the Workshop timeline. Readiness consumption for Martial
Ka’tah, bearer versus unit effects, once-per-battle limits and conditional benefits
remain explicit. Unresolved records remain outside practice question pools.

The original mechanics and provenance, reference flags, IDs, units, detachments,
39 stat profiles and saved lists are preserved. Different Praesidium Shield and
On Gilded Wings effects remain separate; matching names are not sufficient to
merge rules. Shield of Honour differs mechanically from the pinned enrichment,
so the imported version is retained and explicitly flagged.

The generator `scripts/audit-custodes.cjs` never connects to a database. It rejects
any changed snapshot, missing or added Custodes row before producing a repair.
Its output uses the existing admin RPC, expected revisions and revision-history
trigger in one transaction. It must be regenerated against a fresh audit if an
entry changes. Re-running the original snapshot after application is rejected.

## Rules requiring source review

In Rules workshop, select Adeptus Custodes and use Summary coverage to find
Needs summary and Missing effect. The descriptions name the exact outstanding
condition rather than silently inventing missing mechanics. The faction is not
fully verified while these entries remain unresolved.

| Rule | Scope | Remaining source gap |
| --- | --- | --- |
| Advanced Firepower | Caladius Annihilator Grav‑Tank | Ranged attacks against enemy MONSTER or VEHICLE units allow one Hit, one Wound and one Damage re-roll. The source does not state the reset window for these three re-rolls; check their per-selection limit. |
| Anathema Blademastery | Null Maiden Vigil | When a friendly Vigilator Squad is selected to fight, choose Sustained Hits 1 or Lethal Hits for the phase. The structured record omits the Battle-shocked-target Wound re-rolls mentioned in its notes and does not identify a melee-only weapon restriction; check the complete rule. |
| Anti-gravitic Mobility (Upgrade) | Grav‑Assault Force | This upgraded unit can shoot after Falling Back. The source does not specify how long this permission lasts after the Fall Back move; check the expiry window. |
| Arae-Shrike | Honoured Companions | Enemy ingress setup is prohibited within 12″ of this bearer’s unit. The source represents the trigger as selection for an ingress move; check the precise arrival and setup wording. |
| Archeotech Teleport‑shunter (Once per battle, per unit) | Shield-Captain in Allarus Terminator Armour | Once per battle per unit, in your Movement phase, this unit can enter Strategic Reserves and then make an ingress move if it is unengaged and has not been selected to move this phase. Check the unencoded arrival distances and setup restrictions before using the shunter. |
| Assault Dropship | Orion Assault Dropship | Friendly ADEPTUS CUSTODES passengers selected for a Tactical disembark in your Movement phase gain permission to charge despite Advancing. The source expires that permission in the Movement phase, before charges are declared; check its intended duration. |
| At Spear’s Length | Solar Watch | When a friendly ADEPTUS CUSTODES unit is selected to Fall Back, it gains permission to shoot afterwards. The source gives a phase duration that expires before your Shooting phase; check the intended duration. |
| Auriferous Orb | Emissaries Imperatus | The bearer gains the Auriferous Orb weapon. The imported ability only identifies that weapon; its profile and attack rules are not included in this effect record. |
| Avenge the Fallen | Honoured Companions | When a friendly TRUSTED SENTINEL unit below Starting Strength is selected to fight, the encoded effect adds 2 melee Attacks to its non-CHARACTER models for the phase. The notes instead describe a below-Half-strength escalation and an ANATHEMA PSYKANA exclusion; check the thresholds and eligible models. |
| Castellan's Mark | Guardians of the Throne | After deployment, redeploy selected friendly ADEPTUS CUSTODES units, with the option to put them into Strategic Reserves ignoring reserve limits. The encoded rule allows up to three units, while its notes say two and exclude ANATHEMA PSYKANA; confirm the selection count and exclusions. |
| Coronal Plate | Aquilan Talon | The bearer gains Lone Operative with an encoded value of 15. Check whether that value replaces the normal targeting distance and how it applies while the bearer leads a unit. |
| Eagle’s Eye | Guardians of the Throne | Add 1 to the bearer’s Wounds. Once per battle per army, it can gain a 3+ invulnerable save when damage is allocated to it. The source gives no duration for that save and triggers after a save would normally be rolled; confirm the activation and expiry. |
| Emperor’s Light | Guardians of the Throne | The bearer gains the Emperor’s Light weapon. Its weapon profile is not included in this imported ability effect; check the weapon entry before attacking. |
| Fearless and Unrelenting | Tristraen’s Gilded Blades | Fearless and Unrelenting is a provisional stub with no effect mechanics. Its detachment name alone does not supply a playable rule. |
| Gilded Spear | Tristraen’s Gilded Blades | This TRISTRAEN’S GILDED BLADES unit makes a D3+3″ Consolidation move. The source is provisional and lacks an activation event; check when the Stratagem is used. |
| Honoured Interred | Might of the Moritoi | This unit grants friendly ADEPTUS CUSTODES units within 6″ re-rolls of Hit rolls of 1. The Stratagem source supplies neither an activation trigger nor an expiry for this aura; check when it is used and how long it lasts. |
| Huntress' Eye | Null Maiden Vigil | The bearer can select one visible enemy unit within 12″ of its unit to take a Battle-shock test at -1. The encoded condition says your Movement phase, while the notes say your Command phase and omit the modifier; confirm timing and test penalty. |
| Indomitable Guardians | Shadowkeepers | After an enemy unit finishes fighting in your opponent’s Fight phase, select one friendly ADEPTUS CUSTODES unit within objective control range that is eligible to fight. It gains Fights First and permission to fight next for the phase. Check how that next-fight permission interacts with current sequencing rules. |
| Inspirational Exemplar | Auric Champions | At the start of a phase, the bearer can remove Battle-shocked from a friendly ADEPTUS CUSTODES unit. The encoded rule says within 9″ and once per battle round, while its notes say 12″, once per battle and add Leadership 5+ to the bearer. Confirm range, usage and the missing Leadership effect. |
| Leonine Ferocity | Lions of the Emperor | Once per phase per army, this unit can use Rapid Ingress even if it was already used that phase, with a 1CP discount. Its additional use does not consume the shared use. The effect lacks a specific activation event; check its eligible target and reserve conditions. |
| Lightning Descent | Lions of the Emperor | This unit can make an ingress move in your Movement phase of battle round 1. The source does not encode its reserve-state requirement or arrival distances; check the complete arrival rule. |
| Magna Imperator | Emperor’s Chosen | When a friendly ADEPTUS CUSTODES unit is selected to attack, it can re-roll one Hit and one Wound roll. While Rendax is active, select one engaged enemy MONSTER or VEHICLE and roll a D6: 1–2 causes 1 mortal wound, 3–5 causes D3, and 6 causes 3. The source omits an activation event for the mortal-wound branch; check its frequency. |
| Manoeuvre and Fire | Aquilan Shield | When a friendly ADEPTUS CUSTODES unit is selected to Fall Back in your Movement phase, it gains permission to shoot and charge afterwards. The source expires both permissions that same phase; check their intended turn-long duration. |
| Martial Mastery | Guardians of the Throne | When an eligible ADEPTUS CUSTODES unit is selected to fight, the structured record offers melee Sustained Hits 1 or Lethal Hits for the phase. Its notes require the Martial Ka’tah ability and mention an unencoded 5+ Critical Hit option. Confirm the actual choices and eligibility before applying Martial Mastery. |
| Master of Ka’tahs (Once per battle round, per unit) | Shield-Captain on Dawneagle Jetbike, Shield-Captain in Allarus Terminator Armour, Shield-Captain | Once per battle round per unit, if this unit is not readied, it can become readied again for Martial Ka’tah. The source does not specify a narrower activation event; check when the extra readiness may be used. |
| Moritoi Ancients | Might of the Moritoi | ADEPTUS CUSTODES DREADNOUGHT units gain +2 Objective Control while not below Starting Strength, re-roll Hit rolls of 1 while below Starting Strength, and also re-roll Wound rolls of 1 while below Half-strength. This source explicitly carries provisional wording derived from the prior edition; confirm the current thresholds. |
| No Escape | Shadowkeepers | After an enemy Falls Back, the source gives this unit permission to charge, but its separate target condition refers to this unit having Fallen Back rather than the triggering enemy. Check which enemy must be targeted and when the reactive charge occurs. |
| Preternatural Rapidity | Dread Host | After a friendly ADEPTUS CUSTODES unit Advances, it gains permission to charge. The source expires the permission that phase, before your Charge phase; confirm the intended duration. |
| Psy-Chaff Volley | Null Maiden Vigil | After a friendly Prosecutor Squad shoots, select one enemy unit hit by those attacks as prosecuted for the turn. Friendly ANATHEMA PSYKANA models improve AP against it by 1; if that target is PSYKER or Battle-shocked, its models also suffer -1 to Hit. The structured effect incorrectly grants the AP benefit to all friendly units and omits the target’s Hit penalty; verify against the source notes. |
| Purity of Execution | Prosecutor Squad | In your Shooting phase, select one enemy visible to the bearer and within 18″ of its unit and increase its detection range by 3″ for the phase. The partial source does not define detection range or what this changes; check that mechanic before applying it. |
| Radiant Mantle | Emperor’s Chosen | Subtract 1 from Hit rolls against the bearer only while the attacking model is within 12″ of the bearer’s unit. The range limit appears in the notes but is missing from the structured effect; confirm the bearer-versus-unit protection scope. |
| Rapid Reactions | Aquilan Shield | After an enemy ends a Fall Back move in your opponent’s Movement phase, select one friendly ADEPTUS CUSTODES INFANTRY unit that was engaged with it at the start of the phase. The source permits that unit to shoot normally at the enemy that Fell Back. Check the out-of-phase shooting and target-eligibility procedure. |
| Relentless Destroyers | Aquilan Talon | When a friendly ADEPTUS CUSTODES AQUILAN TALON unit is selected to Fall Back, it gains permission to shoot. The source gives a phase duration that expires before your Shooting phase; confirm how long that permission lasts. |
| Selfless Service | Emissaries Imperatus | At the end of your opponent’s Charge phase, select one unengaged friendly ADEPTUS CUSTODES unit within 6″ of an enemy; it must be non-VEHICLE, CHARACTER or WALKER. It can declare a charge against an enemy within 6″. The encoded effect caps the Charge roll at 6; confirm the intended roll and reactive-charge procedure. |
| Shield of Honour | Guardians of the Throne | At the start of the Fight phase, this unit gains protection for the phase: an engaged enemy model suffers -1 to Hit and Wound unless it directs all its attacks into this unit. The pinned enrichment has a different Shield of Honour effect; the preserved imported version needs confirmation before use. |
| Superhuman Focus | Emperor’s Chosen | Once per battle round per unit, at the end of a phase, this unit becomes readied. The source does not identify which phase or clarify how this interacts with spending Martial Ka’tah readiness; check the complete Stratagem before use. |
| Superhuman Focus | Guardians of the Throne | Once per battle round per unit, at the end of a phase, this unit becomes readied. The source does not identify which phase or clarify how this interacts with spending Martial Ka’tah readiness; check the complete Stratagem before use. |
| Superior Creation | Auric Champions | Once per battle per army, at the end of the phase in which the bearer was destroyed, roll a D6: on 2+, return it as close as possible to where it died and outside enemy Engagement Range. The encoded effect returns it with 3 wounds; its notes say full wounds. Confirm which wound total applies. |
| Swift as the Eagle | Guardians of the Throne | This source conflicts with itself: the effect allows a D3+3″ reactive Normal move after an enemy move ends within 8″ of an unengaged TRUSTED SENTINEL, but its notes describe a non-VEHICLE unit moving D6″ after being shot in your opponent’s Shooting phase. Confirm trigger, target and distance. |
| Swift as the Eagle | Honoured Companions | After an enemy ends a move within 8″ of a friendly unengaged TRUSTED SENTINEL unit, this unit can make a D3+3″ Normal move. The effect does not explicitly bind this unit to that nearby TRUSTED SENTINEL; confirm the selected friendly target. |
| Vigil Unending | Lions of the Emperor | The encoded Vigil Unending protects a friendly ADEPTUS CUSTODES TERMINATOR unit with -1 incoming Damage for an attack sequence in your opponent’s Shooting phase or either Fight phase. Its notes instead describe a destroyed CHARACTER fighting before removal. Confirm which rule belongs to this Stratagem before applying either effect. |
| Wardens of the Dark Cells | Shadowkeepers | Melee attacks against friendly ADEPTUS CUSTODES units within objective control range, excluding MONSTER and VEHICLE units, suffer -1 to Wound if Strength exceeds the target’s Toughness. While Kaptaris is active, the source also permits one engaged enemy per phase to take a Battle-shock test at -1, but does not state an activation event for that branch; check when it occurs. |
