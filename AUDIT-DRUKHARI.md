# Drukhari readiness audit — 14 November 2026

Follow-up: [Army-defining rule corrections](ARMY-FOUNDATIONS.md) supersede this
audit’s original warnings for Power From Pain.
The counts below describe the original audit snapshot.

Audited 164 native rules and 10 detachments against their preserved imported
40kdc mechanics and the pinned core index at
`6ea813f7706bc9a492026d8b4403af99a965162b`. This community-source audit does not
certify the faction against the current official Codex.

The live transaction applied all 168 records. Follow-up reads verified 164
unchanged imported sources and review/guide flags, 162 unchanged unit scopes and
the two explicit army-scope repairs, all 34 original non-rule records unchanged,
and all four inserted datasheets matching the generated payloads. No generic
saved prompts remain. All 371 tests and desktop/mobile browser checks passed.

| Result | Rules |
| --- | ---: |
| Usable source-based study summaries | 102 |
| Specific source conflicts or incomplete mechanics | 43 |
| Missing effect records | 19 |

All 164 generic saved prompts are replaced by study wording or a specific source
issue. Power From Pain is an empty source record: the starting pool, general token
generation and full Empower procedure remain unresolved. Token-spending abilities
retain their individual costs and benefits without supplying a fabricated army
rule. Combat Drugs, Experimental Enhancements (Coven of Agonies) and Soul Trap
differ from the pinned enrichment and retain the original imported mechanics with
explicit review notes. Ordinary and Coven variants keep their distinct scope and
fight-on-death resolution. All 62 unresolved records stay out of practice answers
and distractors.

## Restored datasheets and scope

The catalog was missing four units present in the pinned core source:

- Coven of Agonies Cronos
- Coven of Agonies Talos
- Coven of Agonies Wracks
- Xatrophos Nuul

Their profiles and ability links restore coverage to all 27 source units and
28 profiles. The 23 existing unit records, faction and 10 detachment records
remain unchanged. All original rule mechanics, identities, reference/review flags,
existing guide hints and saved lists are preserved.

The core faction index identifies Corsairs and Travelling Players and Power From
Pain as army rules. Their derived unit-only scopes are cleared, with the previous
unit lists recorded in summaryAudit; imported source payloads stay unchanged.
Corsairs also records the core ally-character limits. Core Stratagem metadata adds
CP costs, phase/turn gates, exclusions and target choices: Dark Harvest allows up
to two Wracks OR one Drukhari unit; Raid and Fade allows up to two Kabalite Warriors
OR one eligible Drukhari unit, retaining engagement, Aircraft and Scourges limits.
These modes do not permit both groups at once.

## Applying and maintaining the repair

`scripts/audit-drukhari.cjs` generates the repair without connecting to a database.
It rejects added, removed or changed native records, refuses non-placeholder
wording, imports only the four missing units and validates all links and profiles.
The generated transaction uses the existing administrator RPC with expected
revisions and history for 164 updates and four inserts. Regenerate the audit
against a fresh snapshot if anything changes; do not rerun it after application.

The regression tests cover source coverage, saved-data preservation, added unit
links, explicit scope corrections, token costs, target modes, source conflicts,
stale snapshots, practice exclusion, the actual guide and detachment filtering.

## Source review list

Select Drukhari in the Workshop and use **Summary coverage** to find **Needs
summary** and **Missing effect**. Each affected card names its remaining source
issue. Power From Pain remains a material gap in faction readiness.

| Rule | Scope | Source issue |
| --- | --- | --- |
| A Challenge Met | Spectacle of Spite | A Challenge Met has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Agonising Onslaught | Coven of Agonies | When a friendly COVEN OF AGONIES unit is selected to attack, it re-rolls Hit rolls of 1 for the phase. The source then requires spending 1 Pain token and grants full Hit re-rolls, without encoding an optional enhanced branch; confirm whether the token spend is optional before using the base benefit. |
| Alliance of Agony | Realspace Raiders | At battle start, Alliance of Agony grants 2 Pain tokens for each qualifying Archon/Kabalite Warriors, Succubus/Wyches and Haemonculus/Wracks pairing. The source tests both keywords on an unspecified subject instead of checking the two separate army units; confirm the roster requirements before awarding tokens. |
| Archon of the Poisoned Tongue | Lady Malys | When this unit is selected to attack in your Shooting phase or either Fight phase, Lady Malys may spend 1 Pain token to Empower it and choose Sustained Hits 1 or Lethal Hits for the phase. The source labels this partial; confirm any omitted weapon or attached-unit restrictions. |
| Archon’s Will | Hand of the Archon | At the start of battle round 1, select an objective for Archon’s Will. This unit gains a 5+ invulnerable save and Objective Control 3 while within objective control range and not Battle-shocked. The effect checks any objective rather than the selected one; confirm whether the benefits require that chosen marker. |
| Assassins’ Poisons | Hand of the Archon | In the Fight phase, this unit’s weapons gain Lethal Hits and Precision. The source labels this partial; confirm whether all models and weapon profiles receive both benefits. |
| Bloody Spectacle | Succubus | The Succubus re-rolls melee Hit and Wound rolls against CHARACTER targets. The source also grants 1CP when this unit destroys a CHARACTER model, but labels the record partial and does not state an additional usage cap; check the CP clause and current CP-gain limits. |
| Combat Drugs | Spectacle of Spite | At the start of your Command phase, Combat Drugs offers one chosen drug, or two random drugs from 2D6, until your next Command phase. Adrenalight adds 1 melee Attack; Hypex adds 2″ Move; Serpentin improves melee Weapon Skill by 1; Painbringer adds 1 Toughness; Grave Lotus adds 1 melee Strength; Splintermind improves Leadership and ranged Ballistic Skill by 1. Benefits apply to friendly WYCH CULT models. The notes forbid deliberately choosing the same drug twice per battle; the pinned source’s effect and trigger differ. Confirm the choice, random-result and reuse procedure before use. |
| Conductor of Torment | Reaper’s Wager | Conductor of Torment has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Crucible of Malediction | Realspace Raiders | Crucible of Malediction has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Dark Vitality | Realspace Raiders | Dark Vitality has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Deadly Deceivers | Kabalite Cartel | In your opponent’s Shooting phase, the eligible BLADES FOR HIRE or KABAL unit is intended to be targetable by ranged attacks only from within 18″. The effect encodes permission inside 18″ without explicitly prohibiting attacks from farther away; confirm that targeting restriction. |
| Double-cross | Kabalite Cartel | Double-cross has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Eager for the Kill | Realspace Raiders | Eager for the Kill has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Empowered Engines | Coven of Agonies Cronos | When this Coven of Agonies Cronos is selected for a Normal, Advance or Fall Back move, it may spend 1 Pain token to Empower itself and add 2″ to its Move. The source gives the bonus a permanent scope rather than a specific move or phase duration; confirm when it expires and whether it can stack. |
| Enemies Without Number | Kabalite Cartel | Enemies Without Number has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Enfolding Nightmare | Covenite Coterie | After an enemy finishes shooting at this eligible HAEMONCULUS COVENS unit in your opponent’s Shooting phase, it makes a D6″ Surge move. The effect does not supply wound-loss or engagement gates; check the complete Surge conditions before use. |
| Experimental Enhancements (Pain) | Coven of Agonies Wracks | When Coven of Agonies Wracks are selected to fight, spend 1 Pain token to Empower them and set non-CHARACTER models’ melee Attacks to 3 or 4. The 4-Attack branch grants melee Hazardous to the whole unit rather than only those models, and differs from the pinned source; confirm the weapon/model scope. |
| Eye of Spite | Realspace Raiders | Eye of Spite has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Hardened Physiology | Coven of Agonies | When this COVEN OF AGONIES WRACKS unit is targeted, the intended defensive benefit is -1 to incoming Wound rolls for the phase. The source instead applies -1 to this unit’s own Wound rolls; confirm the recipient before applying it. |
| Incubi Shrine Token | Incubi | Once per battle, the Incubi Shrine token can change one Hit or Wound roll to an unmodified 6. The imported effect does not specify a before/after-roll choice window; confirm that procedure and the equipped token before use. |
| Instinctive Spite | Realspace Raiders | Instinctive Spite has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Leechbite Plate | Kabalite Cartel | Leechbite Plate has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Lithe Agility | Succubus | When the Succubus’s unit Advances or makes a Charge roll, spend 1 Pain token to Empower it and re-roll the relevant roll. The source requires the Movement and Charge phases simultaneously, making the condition impossible; confirm that those phases are alternatives. |
| Master Regenesist | Covenite Coterie | Master Regenesist has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Master Repugnomancer (Aura) | Covenite Coterie | Increase the bearer’s Fear Incarnate range by 3″. When a friendly DRUKHARI unit within 9″ fails Battle-shock or is destroyed, roll a D6: on 4+, gain 1 Pain token. The source uses friendly casualties/tests; confirm that side rather than substituting enemy events from another token rule. |
| Matchless Swiftness | Reavers | When Reavers are selected to Advance, spend 1 Pain token to Empower them and use an 8″ Advance. The fixed-Advance modifier is triggered only after the move ends; confirm that it should apply before measuring the move. |
| Mind like a Steel Trap (Aura) | Lady Malys | Once per turn per model, when an enemy Stratagem selects a target within 12″ of Lady Malys, increase that use’s CP cost by 1. The source assigns the modifier to this unit instead of clearly to the enemy use; confirm which player pays the increase. |
| Murderous Agenda | Kabalite Cartel | At the start of battle round 1, Murderous Agenda should choose a Contract. The encoded Trophy Hunters branch marks an enemy for Precision, while its notes require an enemy CHARACTER and KABAL/BLADES FOR HIRE attackers, and award 3 Pain tokens when the Contract unit is destroyed. The notes also describe Sow Fear and Terror (Sustained Hits 1 against INFANTRY/MOUNTED) and Show of Strength (Lethal Hits against MONSTER/VEHICLE), neither encoded. Confirm the Contract choice and all omitted gates before use. |
| Nowhere to Run | Razorwing Jetfighter | When this Razorwing is selected to shoot, spend 1 Pain token to Empower it. After shooting, select one enemy it hit that is neither MONSTER nor VEHICLE; subtract 2″ from that target’s Move until the start of your next turn. The source applies the -2 Charge modifier to the Razorwing rather than the selected enemy; confirm the recipient. |
| Onslaught | Drazhar | While Drazhar leads a unit, add 3″ to that unit’s Pile-in and Consolidation distances. The encoded trigger applies the bonus only after the move ends; confirm it applies before measuring the move, retaining all remaining movement restrictions. |
| Pain Adept | Xatrophos Nuul | In your Command phase, if Xatrophos Nuul is on the battlefield, roll a D6: on 4+, gain 1 Pain token. This record lacks the ordinary Haemonculus version’s explicit once-per-phase army cap; confirm its usage limit rather than assuming unlimited attempts. |
| Pain Engine (Aura) | Cronos | When a friendly unit within 9″ spends a Pain token to Empower, roll a D6: on 5+, regain 1 Pain token. Add 1 if no model in this Cronos unit has a spirit vortex. The encoded test instead gives that bonus if at least one model lacks the weapon; confirm how a mixed unit is handled. Spending tokens for other reasons does not trigger this refund. |
| Pain Engine (Aura) | Coven of Agonies Cronos | The Coven of Agonies Cronos Pain Engine is empty in this source. Do not substitute the ordinary Cronos refund rule merely because it has the same name. |
| Pain Parasite | Cronos | The partial Pain Parasite source grants both shooting and fighting on death while below Starting Strength in the Fight phase, without a destruction trigger, resolution sequence or use limit. Check the actual trigger and which action is allowed before applying it. |
| Pharmacophex | Spectacle of Spite | Pharmacophex has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Poisoner’s Art | Covenite Coterie | After this HAEMONCULUS COVENS unit fights, select one non-VEHICLE enemy it hit and mark it poisoned for the battle. At the start of each Command phase, roll for every poisoned enemy still on the battlefield: on 4+, it suffers D3 mortal wounds. The recurring branch has a HAEMONCULUS COVENS condition on an unspecified subject; confirm which model or unit must still qualify. |
| Postmortality | Covenite Coterie | Postmortality has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Pounce on the Prey | Skysplinter Assault | Pounce on the Prey has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Power From Pain | Army rule | Power From Pain is empty in the imported army-rule source. Starting Pain-token pools, general token generation and the full Empower procedure are not defined here. Confirm the current army rule before using the token-spending reminders; those reminders do not supply the missing army rule. |
| Preternatural Agility | Spectacle of Spite | This WYCH CULT unit ignores Move, Advance and Charge modifiers, and can pass through models while making the listed moves without ending Normal or Advance moves in enemy Engagement Range. The source triggers these benefits after moves end, gives different phase/turn durations and permits moving while engaged without a clear move type; confirm timing and permitted moves. |
| Sadistic Fulcrum | Skysplinter Assault | After spending a Pain token, select one friendly DRUKHARI TRANSPORT within 6″ of the bearer’s unit to re-roll Hit rolls for the phase. The source does not bind the spend to Empowering the bearer’s unit and places a Shooting-phase test only on a separate Empower designation; confirm which spend and phase activate the transport benefit. |
| Sadistic Raiders | Kabalite Warriors | When Kabalite Warriors are selected to shoot in your Shooting phase or to fight, spend 1 Pain token to Empower them. Re-roll Wound rolls of 1, or all Wound rolls against a target in objective control range. The full-re-roll branch does not explicitly test Empowered status, although it follows the token spend; confirm that the cost gates both branches. |
| Scintillating Tempo | Reaper’s Wager | When the eligible friendly unit is selected to move, arrives, or selects charge targets in your turn, it cannot be targeted by Fire Overwatch for the rest of the turn. The movement trigger explicitly lists DRUKHARI or HARLEQUINS, while the arrival and charge branches do not repeat those keywords; confirm their target eligibility. |
| Sculpting the Stage | Exhibition of Slaughter | When a friendly WYCH CULT unit is selected to Advance or Fall Back, it gains permission to start an action for the phase. The effect neither explicitly waives those movement restrictions nor lasts into later action steps; confirm the intended permission and expiry. |
| Shadowfield | Archon | The Archon has a 4+ invulnerable save from Shadowfield, lost when a save fails according to the source notes. The effect only gives a one-use scope and does not encode the breaking procedure; confirm whether the failure must be a Shadowfield save and when the protection ends. |
| Silent Executioner | Drazhar | Drazhar re-rolls Hit rolls against targets below Starting Strength and also re-rolls Wound rolls against targets below Half-strength. The source labels Silent Executioner partial; confirm any omitted attack-type or usage restrictions. |
| Skyborne Annihilation | Skysplinter Assault | Before an eligible friendly DRUKHARI unit that disembarked this turn shoots, its ranged weapons gain a Sustained Hits benefit. The effect requires HAND OF THE ARCHON or KABALITE WARRIORS and offers Sustained Hits 1 or 2 as a free choice, rather than encoding a base benefit and an escalation condition. Confirm which unit receives which value. |
| Soul Trap | Archon | Soul Trap gives the Archon +1 melee Attack and Strength, then a further +1 to both after the first time it destroys an enemy model in melee this battle. The preserved import differs from the pinned source; confirm the initial bonus and first-kill reward rather than silently replacing them. |
| Spiteful Raider | Skysplinter Assault | The bearer’s unit gains 1 Pain token for a Fight-phase event within objective control range. The source triggers both on selecting this unit to fight and on destroying an enemy, without clearly binding the objective condition to the victim; confirm the actual token-generating event. |
| Splinter Racks | Raider | When this Raider is selected to shoot, spend 1 Pain token to Empower it. While it has passengers, it re-rolls ranged Hit rolls for Anti-keyword weapons for the phase. The effect targets the Raider rather than the embarked models and omits the Anti target type; confirm which Firing Deck or passenger attacks receive the benefit. |
| Swooping Descent | Scourges with Shardcarbines | In your Movement phase, spend 1 Pain token to Empower these Scourges. When using Deep Strike, they may set up more than 6″ from enemies; if set up within 8″ of an enemy, they cannot charge that turn. The source lacks a specific token-spend trigger and attaches the no-charge permission to an event subject; confirm the setup sequence and recipient. |
| Symphony of Suffering | Covenite Coterie | After a friendly DRUKHARI unit destroys an enemy, each enemy within 9″ of and visible to the friendly unit takes a Battle-shock test. The source gives a -1 modifier if an unspecified subject has HAEMONCULUS COVENS; confirm whether that condition refers to the destroying unit. |
| Tailored Toxins | Kabalite Cartel | Before an eligible friendly BLADES FOR HIRE or KABAL unit shoots or fights, its attacks against the Contract unit are intended to score Critical Hits on 5+ for the phase. The source instead tests whether this unit is itself designated the Contract unit; confirm the target binding. |
| Taken Alive | Kabalite Cartel | Taken Alive has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Towering Arrogance | Kabalite Agonysts | While this ARCHON bearer leads a unit, improve its models’ Leadership and Objective Control by 1. The effect adds 1 to Leadership, which worsens it, and omits the leading condition; confirm the notes’ improvement and attachment gate. |
| Urgent Metamorphosis | Tools of Torment | When a friendly HAEMONCULUS COVENS unit is selected to Fall Back, it gains permission to declare a charge for the phase. The effect does not explicitly waive the Fall Back restriction and expires before the Charge phase; confirm the permission and duration. |
| Vanguard of the Dark City | Raider | At the start of your Command phase, this Raider chooses one option for the battle round: Masters of the Shadowed Sky makes an objective sticky while carrying Kabalite Warriors; Speed of the Kill lets embarked Wyches disembark wholly within 6″; Visions of Butchery adds bladevane and chainsnare Attacks based on models in or embarked in the bearer; Aethersails lets the Raider re-roll Advance and Charge rolls while carrying DRUKHARI. The source does not define which model count is used for the scaling or the full disembark procedure; check those branches before use. |
| Vicious Blades | Skysplinter Assault | Vicious Blades has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
| Vile Weaponry | Xatrophos Nuul | When Xatrophos Nuul is selected to fight, spend 1 Pain token to Empower his unit and set his Damage to 3 for the phase. The effect does not identify the affected weapon profile; confirm the scope rather than granting Damage 3 to every weapon. |
| Void Mine | Voidraven Bomber | At the end of your opponent’s Fight phase, select one visible enemy model within 24″ that lacks Lone Operative. Roll a D6 for the mine’s radius; for each enemy unit within that many inches of the selected model, roll a D6: on 4+, it suffers D6 mortal wounds. The source has no usage cap and represents the selected model as a unit reference for the radius; confirm frequency and measurement origin. |
| Wraithlike Retreat | Skysplinter Assault | Wraithlike Retreat has no effect mechanics in the imported source. Confirm its complete rule before applying any benefit, cost, target selection or timing. |
