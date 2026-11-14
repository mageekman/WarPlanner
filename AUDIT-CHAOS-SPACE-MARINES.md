# Chaos Space Marines rule audit

Reviewed all 281 native Chaos Space Marines rules in the live user-imported catalog. Supplements come from the [pinned 40kdc core index](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b/data/core/chaos-space-marines). The imported mechanics are retained exactly; they differ from that pin in a few effects, so the pinned enrichment is not substituted. This is a source audit, not official rules verification.

| Result | Entries |
| --- | ---: |
| Concise study summaries | 231 |
| Specific source issues | 28 |
| Missing effects | 22 |
| Foreign copies disabled | 94 |

The 94 misplaced entries are 90 Tyranids and four Blood Angels rules imported before folder filtering was fixed. They remain in catalog history and can still be inspected as disabled entries. Their correct-faction originals are unchanged.

All 281 native descriptions are rewritten. Targets retain the core index’s keyword filters, exclusions, selection counts, proximity and eligibility restrictions. Dark Pacts now appears when choosing shooters/fighters; other corrections include prebattle-only composition rules, shooting-only setup abilities and distinct end-of-Fight / end-of-turn reserve triggers. Warp Tracer has an early-shooting hint because removing cover can help later shooters. Stats, roster links, detachments, account lists and original uploads are preserved.

Examples: Dark Ritual retains its once-per-battle limit and CULT DEMAGOGUE condition; Warmaster keeps its three separate 6″ aura choices; Experimental Augmentations keeps all six results, the choose-one / roll-two alternative and Fabius Bile’s Warlord re-roll; Mark of Legend allows one re-roll, not one of each type. Variant records stay distinct.

`scripts/audit-csm.cjs` generates a single transaction through the existing admin-only import RPC. Full comparisons to the audit snapshot refuse edited records before generation; expected revisions reject concurrent edits at application time. The normal history trigger preserves every prior revision. Production study text is stored in Supabase, not in a browser-only translation overlay. Admin summary corrections and approved summary reports clear obsolete coverage markers.

Find unresolved records in Rules workshop → Chaos Space Marines → All rules & abilities → Filter rules → Summary coverage. They are excluded from practice answer pools; their exact imported mechanics stay under Conditions & sources.

## Specific source issues

| Rule | Detachment / unit | Issue |
| --- | --- | --- |
| Agent of Discord (Aura) | Cypher | An enemy Stratagem targeting a unit within 12″ triggers this once-per-turn effect, but the CP increase is assigned to Cypher’s own unit. Check which player pays the extra CP. |
| Akshur's Binding Runes | Warpstrike Champions | The source permits Deep Strike in the next Movement phase, including battle round 1, but does not identify the reserve state or event that starts that countdown. Check its arrival conditions. |
| Bestial Raiders | Fellgor Beastmen | The source combines setup at the start of the battle with a separate arrival one round later. Check when a unit starting in Strategic Reserves may arrive and which normal limits it ignores. |
| Chaos Icon | Dark Commune, Possessed, Chosen, Chaos Bikers, Legionaries | The source re-rolls a failed Battle-shock test when making a Dark Pact, but Dark Pacts instructs a Leadership test. Check which test Chaos Icon re-rolls. |
| Choice Samples | Masters of the Maelstrom | The source returns one model while the unit is below Starting Strength, but gives no activation timing or usage limit. Check when the return happens before using it repeatedly. |
| Chosen for Glory | Chaos Cult | The source grants Hit re-rolls and adds Wound re-rolls if a Leadership test did not fail, but does not identify or instruct that test. Check the required test and its timing. |
| Crazed Focus | Chaos Cult | The source improves AP by 1 and adds 1 Strength if a Leadership test did not fail, but does not identify or instruct that test. Check the required test and its timing. |
| Daemonic Destruction | Heretic Astartes Daemon Prince with Wings | After a charge, the source uses this model’s remaining wounds as a roll-variable name rather than a defined number of dice. Check the dice count and how the six-mortal-wound cap applies. |
| Dark Destiny | Abaddon the Despoiler | The source grants 1CP but gives no trigger, frequency or condition. Check when and how often that CP is gained. |
| Detonator | Deceptors | An enemy non-TITANIC model with Deadly Demise being destroyed triggers this effect, but the automatic successful Deadly Demise roll is assigned to this unit. Check which model’s explosion roll it changes. |
| Eager for Vengeance | Veterans of the Long War | The source allows shooting and charging after Falling Back, but its extra Hit and Charge bonuses check a Focus of Hatred designation without identifying the attack or charge target. Check when those bonuses apply. |
| Eye of Oblivion | Devotees of Destruction | The source adds 6″ detection range to an enemy selected within 24″ when this unit shoots, but does not define detection range or its effect on attacks. Check that mechanic. |
| Festering Miasma | Pactbound Zealots | The source grants Stealth, but its NURGLE ranged-targeting branch only permits attacks within 18″ without explicitly forbidding attacks from farther away. Check the intended targeting restriction. |
| Focus of Hatred | Veterans of the Long War | The source selects a Focus of Hatred in your Command phase, but its Hit re-roll condition does not identify the selected enemy as the defender. Check which attacks receive the re-rolls. |
| Greyveil Hex | Nightmare Hunt | The source grants Stealth, but its objective-dependent 18″ ranged-targeting branch only permits nearby attacks without explicitly forbidding farther ones. Check the intended restriction. |
| Herald of the Apocalypse (Aura) | Haarken Worldclaimer | The source calls for Battle-shock tests for enemies within 6″, but provides no test timing and does not identify whose Starting Strength condition is checked. Check both before applying it. |
| Infernal Sacrifice | Chaos Cult | The source deals D3 mortal wounds to this unit and grants +1 melee Attack, with +1 melee Strength if a Leadership test did not fail. It does not identify or instruct that test; check the required test and its timing. |
| Iron Fortitude | Fellhammer Siege-host | When an attack with Strength above the target’s Toughness selects a friendly non-DAMNED HERETIC ASTARTES unit, the source subtracts 1 from this unit’s Wound roll instead of the attacker’s. Check the intended beneficiary. |
| Masters of Misdirection | Deceptors | The source grants Infiltrators to LEGIONARIES and CULTIST MOB units, but its separate non-EPIC HERO Leader branch does not say which Bodyguard unit that model must lead. Check the Leader restriction. |
| Raking Pass | Murdertalon Raiders | The source permits charging when a unit is selected to Fall Back, but the permission expires in the Movement phase. Check whether it should last through the Charge phase. |
| Ruination's Bounty | Devotees of Destruction | After HAVOCS or OBLITERATORS are selected to shoot, an unspecified ability use grants both Lethal Hits and Sustained Hits 1. Check which ability must be used; do not assume every ability activates it. |
| Sacrificial Dagger | Aranis Zarkan | This variant grants Psychic Hit and Wound bonuses after suffering 1 mortal wound, but gives them a permanent duration despite a once-per-phase activation. Check when the bonuses expire and whether they can stack. |
| Scuttling Walker | Defiler | The source grants terrain/model movement permissions and automatic Desperate Escape success only after the move ends. Check when those permissions actually apply during movement. |
| Specimens For The Spider | Creations of Bile | The source grants melee Wound re-rolls against CHARACTER units, but its enemy-Warlord destruction branch tests an undefined recipient after selecting only one enemy. Check whether one or all nearby enemies take Battle-shock tests. |
| Unholy Bloodshed | Zarkan's Daemonkin Possessed | This variant grants Devastating Wounds once per battle on a Dark Pact, but marks the benefit permanent. Check whether it should expire at the end of the phase. |
| Unstoppable Rampage | Soulforged Warpack | The source grants movement through terrain only after a Normal, Advance or Charge move ends. Check when the permission applies during the move. |
| Warmaster’s Gift | Veterans of the Long War | The source gives the bearer critical Wounds on 5+ when a Focus of Hatred designation matches, but does not identify the defender as the designated unit. Check which attacks qualify. |
| Warp-sighted Butcher | Master of Executions | The source grants melee Hit re-rolls while leading against a target below Starting Strength, but checks whether the leading model itself is below Half-strength for the Wound re-rolls. Check the intended second condition. |

## Missing effect records

- Black Crusade — Veterans of the Long War
- Brutal Attrition — Fellhammer Siege-host
- Cultist’s Brand — Chaos Cult
- Dread Reputation — Huron’s Marauders
- Eater of Dread — Dread Talons
- Eye of Tzeentch — Pactbound Zealots
- Falsehood — Deceptors
- Fratricidal Trophies — Renegade Warband
- From All Sides — Deceptors
- Glut of Souls — Soulforged Warpack
- Hardened Killers — Huron’s Marauders
- Mortal Thralls — Chaos Cult
- Orbs of Unlife — Pactbound Zealots
- Point-blank Destruction — Fellhammer Siege-host
- Raid Leader — Huron’s Marauders
- Selfless Demise — Chaos Cult
- Siegecraft — Fellhammer Siege-host
- Soul Link — Deceptors
- Talisman of Burning Blood — Pactbound Zealots
- Tempting Addendum — Soulforged Warpack
- Warped Foresight — Chaos Cult
- Weaponised Hatred — Renegade Warband
