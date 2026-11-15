# Thousand Sons readiness audit — 15 November 2026

Audited 158 native rules, 38 datasheets and 10 detachments against their preserved
imported 40kdc mechanics and the pinned faction index at
`6ea813f7706bc9a492026d8b4403af99a965162b`. This community-source audit does not
certify the faction against the current official Codex.

The live repair updated 156 records. Follow-up queries verified all 156 original
sources, scope flags and guide hints were preserved, all generic prompts were
removed, and all 51 excluded records (49 non-rules plus two edited rules) remained
identical to the audit snapshot. The regression suite has 358 passing tests;
desktop/mobile browser checks cover Ritual text and placement, alternative target
modes, field highlights, review coverage and the saved Psychic Dominion summary.

| Result | Rules |
| --- | ---: |
| New usable source-based summaries | 107 |
| Previously edited summaries preserved unchanged | 2 |
| Specific source conflicts or incomplete mechanics | 47 |
| Missing effect records | 2 |

The repair replaces all 156 generic saved prompts and preserves the previously
edited Psychic Dominion and Regenerating Monstrosities records in full. It also
preserves all three edited units (Kaa’skrek, Prism of Zadophon Rubric Marines and
Zadophon the Soul Eater), all 44 profiles across 38 datasheets, and all 10
detachments. IDs, imported source payloads, review/reference flags, existing guide
hints and saved army lists are unchanged.

Cabal of Sorcerers now lists all four Rituals, their warp charges, enhanced test
thresholds, range/visibility gates, Lone Operative condition, usage limits and
Temporal Surge’s no-charge condition. Channelling’s incomplete extra-die and
perils procedure remains explicit. Ritual reminders are placed at Shooting start,
not in the unit’s weapon-attack sequence. Flow of Magic retains its phase-start
snapshot, territory extensions and replacing benefit. Stratagem core records add
CP costs, phase/turn gates and targets, including multiple targets and alternative
Glimmershift Portal modes. Enhancement bearer and datasheet restrictions stay
explicit. Unresolved records remain outside practice answer and distractor pools.

The original Devastating Sorcery, Split and Warpfire Infusion mechanics differ
from the pinned enrichment; they are retained with named review notes. The edited
Regenerating Monstrosities source also differs and is preserved intact. Same-name
Prism and ordinary variants remain separate where their scope or effects differ.

`scripts/audit-thousand-sons.cjs` generates a repair without connecting to a
database. It validates native/core coverage, links and profiles, rejects changed
snapshots and non-placeholder wording, and skips the two preserved edits. Its
156-row repair uses the existing admin RPC with expected revisions and history
in one transaction. Regenerate the audit after any saved change; do not rerun the
original snapshot against the updated catalog.

## Source review list

Select Thousand Sons in the Workshop and use **Summary coverage** to find
**Needs summary** and **Missing effect**. Each description names the remaining
source issue; these entries are not fully verified.

| Rule | Scope | Source issue |
| --- | --- | --- |
| Aetherstride (Psychic) | Daemon Prince of Tzeentch with Wings | When this model arrives using Deep Strike in your Movement phase, it can use Aetherstride to set up its unit more than 6″ from enemy units, grant the bearer’s Dark Blessing Sustained Hits D3 and prevent charges for the turn. The source is provisional and includes a self-activation step without defining further limits; check the arrival option and spacing. |
| All is Dust | Rubricae Phalanx | All Is Dust is intended to improve RUBRICAE armour saves against attacks whose unmodified Damage is 1. The encoded effect instead adds 1 to generic saving throws, without that Damage gate and without excluding invulnerable saves; check the full restriction before applying it. |
| All-Seeing Mutant Hordes | Servants of Change | Tzaangors gain BATTLELINE. In your Shooting phase, attacks by MUTANT models increase enemy detection range by 6″, but the source does not define detection range or identify the affected enemy selection. Check that part of All-Seeing. |
| Blessed Transmutations | Warpmeld Pact | In your Command phase, select a friendly THOUSAND SONS PSYKER model and a separate Tzaangors unit within 12″; return up to D3+1 destroyed non-CHARACTER models to the Tzaangors. The notes require the Tzaangors to be below Starting Strength, but the core record puts that condition on the Psyker target instead. Confirm which target must satisfy it. |
| Bringers of Change | Rubric Marines | In the Shooting phase, this unit re-rolls Wound rolls of 1. This imported Rubric Marines version does not encode the objective-based full re-rolls found in the Prism variant; confirm whether that omission is intentional. |
| Cabal of Sorcerers | Tzaangor Shaman, Sorcerer, Ahriman, Rubric Marines, Infernal Master, Scarab Occult Terminators, Magnus the Red, Daemon Prince of Tzeentch with Wings, Exalted Sorcerer on Disc of Tzeentch, Exalted Sorcerer, Sorcerer in Terminator Armour, Daemon Prince of Tzeentch | At the start of your Shooting phase, eligible Cabal models may attempt a Ritual using a 2D6 Psychic test, with an optional extra D6 for Channelling. The source gives each model one use per turn and each Ritual one use per army per turn; doubles cause D3 mortal wounds to the caster’s unit. Destiny’s Ruin (warp charge 5) marks a visible enemy within 24″: friendly THOUSAND SONS and SCINTILLATING LEGIONS models re-roll Hit rolls of 1 against it for the phase, or all Hit rolls on a test of 10+. Temporal Surge (6) moves one visible, unengaged friendly unit of either faction within 24″ up to D6″, or 6″ on 10+, and forbids charging that turn. Doombolt (7) causes D3 mortal wounds to a visible enemy within 24″, or D3+3 on 11+; an unattached Lone Operative target must be within 12″. Twist of Fate (9) marks a visible enemy within 24″ and improves friendly models’ AP against it by 1 for the phase, or 2 on 12+. The source does not fully define the extra Channelling die and doubles/triples procedure; check that test procedure before resolving a Ritual. |
| Cabal of Sorcerers | Prism of Zadophon | This Prism of Zadophon version of Cabal permits a Ritual at the start of your Shooting phase: take a 2D6 Psychic test with optional extra Channelling D6; doubles cause D3 mortal wounds to the caster’s unit. Each model has one use per turn and each Ritual one army use per turn. Destiny’s Ruin (warp charge 5) marks a visible enemy within 24″ for friendly THOUSAND SONS/SCINTILLATING LEGIONS Hit re-rolls of 1, or full Hit re-rolls on 10+, for the phase. Temporal Surge (6) gives one visible unengaged friendly unit of either faction within 24″ a D6″ Normal move, or 6″ on 10+, with no charge that turn. Doombolt (7) deals D3 mortal wounds to a visible enemy within 24″, or D3+3 on 11+; an unattached Lone Operative must be within 12″. Twist of Fate (9) improves friendly models’ AP against a visible enemy within 24″ by 1 for the phase, or 2 on 12+. Check the incompletely specified extra-die and doubles/triples procedure before resolving Channelling. |
| Chronosorcerous Bleed | Changehost of Deceit | At the start of your opponent’s Charge phase, an unengaged eligible THOUSAND SONS PSYKER or SCINTILLATING LEGIONS unit selects one visible enemy within 12″. The notes intend -1 to that enemy’s Charge rolls, but the nested effect applies the modifier to this unit instead; confirm the recipient before use. |
| Committed to the Ritual | Prism of Zadophon | Committed to the Ritual has no effect mechanics in the imported source. Its name does not supply a playable detachment rule. |
| Curse of Life | Ritual of Regeneration | The bearer regains 3 lost wounds. The source gives no activation event or frequency for this heal; confirm when Curse of Life is used. |
| Deranged Ferocity | Warpmeld Pact | For the Fight phase, this unit can Pile in and consolidate up to 6″. Its models can fight from within 3″ of an enemy model and target an enemy unit within 3″ of them that is in Engagement Range of their unit. The source omits a specific activation event and friendly target gate; check when and on whom to use this Stratagem. |
| Devastating Sorcery | Grand Coven | For the phase, the eligible unit’s Psychic weapons gain +9″ Range and its Psychic attacks re-roll Hit and Wound rolls. The preserved import grants +9″, while the pinned enrichment differs; confirm the Range bonus rather than silently replacing the imported effect. |
| Duplicitous Malediction | Changehost of Deceit | After deployment, redeploy up to three friendly THOUSAND SONS units, optionally placing them into Strategic Reserves ignoring reserve limits. The source encodes battlefield setup and reserve setup as consecutive mandatory steps rather than alternatives; confirm the intended choice. |
| Embroiling Energies | Prism of Zadophon | For the phase, this unit’s malefic curse gains Close Quarters and +1 to Hit. The source notes restrict the benefit to that weapon, while the structured effect grants it to every ranged weapon; confirm the weapon scope before use. |
| Ensorcelled Annihilation | Chaos Predator Annihilator | In the Shooting phase, this unit re-rolls failed Hit and Damage rolls. The partial source does not define what a failed Damage roll means or a per-selection limit; check the Damage re-roll rule before applying it. |
| Fractal Disjunction | Changehost of Deceit | For your opponent’s Shooting phase, this eligible SCINTILLATING LEGIONS unit, excluding MONSTER units, can be targeted by ranged attacks only by models within 18″. The effect encodes positive targeting permission rather than a complete prohibition outside 18″; confirm the notes’ intended restriction. |
| Glimpse of Eternity (Psychic) | Infernal Master | Once per turn per unit, change one Hit, Wound or saving throw result to 6. The source does not state whether this happens before or after rolling; confirm that choice window. |
| HORRORS ARE PINK. HORRORS ARE BLUE. WHERE ONCE THERE WAS ONE, NOW THERE ARE TWO. | Pink Horrors | Once no PINK models remain, this unit uses the Blue Horrors datasheet. The source places suppression of Blue Horrors abilities inside a no-PINK condition but then tests for a remaining PINK model, making that suppression branch unreachable. Confirm when the new abilities become available. |
| Hunter of Souls | Daemon Prince of Tzeentch with Wings | Against CHARACTER targets, this unit re-rolls Hit and Wound rolls of 1. The source labels this partial and gives no other Hunter of Souls mechanics; check for omitted clauses. |
| Illusions of Tzeentch (Psychic) | Exalted Sorcerer on Disc of Tzeentch | While this model leads a unit, its unit is intended to be targetable by ranged attacks only from within 18″. The source only encodes permission within 18″, rather than a complete prohibition beyond it; verify the intended targeting restriction. |
| Immaterial Flare (Aura) | Mutalith Vortex Beast | Friendly PSYKER units within 6″ add 1 to Psychic test results. The source notes say this bonus does not stack with other modifiers to the Psychic test result; that exclusion is missing from the effect and must be checked. |
| Implacable Guardians | Rubricae Phalanx | When targeted in your opponent’s Shooting phase, reduce incoming Damage by 1 for non-PSYKER models in this unit for the phase. The source notes exclude PSYKER models, but the effect applies to the whole unit; confirm that model scope. |
| Incandaeum | Grand Coven | Once per battle, the bearer may select Doombolt even if another model in your army has already attempted it this phase. This is a Doombolt repeat exception, not permission to repeat every Ritual; the specific exception appears only in the source notes. |
| Kaleidoscopic Tempest | Hexwarp Thrallband | When this unit is targeted in your opponent’s Shooting phase and is wholly within the Flow of Magic, it gains Stealth and reduces its detection range by 3″ for the phase. The provisional source does not define detection range; confirm that mechanic before applying it. |
| Kindred Sorcery | Grand Coven | At the start of your Command phase, choose a Kindred Sorcery option until your next Command phase: Imbued Manifestation gives this unit’s ranged Psychic weapons +6″ Range; Psychic Maelstrom adds 1 to Psychic Wound rolls; Wrath of the Immaterium gives Psychic weapons Devastating Wounds. The source marks the options consumable but does not state the reset or reuse procedure; check whether an option may be chosen again later in the battle. |
| Multitudinous Limbs | Ritual of Regeneration | When an eligible THOUSAND SONS PSYKER INFANTRY or MOUNTED unit is selected to Advance or Fall Back, it gains permission to start an action for the phase. The effect does not explicitly waive the Advance/Fall Back action restriction and expires in the Movement phase; confirm the intended permission and duration. |
| Noctilith Mantle | Hexwarp Thrallband | While this unit is on the battlefield, it is designated wholly within the Flow of Magic but cannot attempt Rituals. The source represents region membership as a tag without connecting it to the named-region state; confirm which Flow benefits apply. |
| One Head Looks Back | Kairos Fateweaver | When an enemy uses a Stratagem on a unit within 12″ of Kairos, the source intends a 1CP increase for that use. It assigns the cost modifier to this unit rather than clearly to the enemy target; confirm which player and use pay the extra CP. |
| Prismatic Displacement | Servants of Change | When a friendly MUTANT INFANTRY or MOUNTED unit is selected to Advance or Fall Back, its ranged weapons gain Assault and it gains shooting and charge permissions for the turn. The charge permission does not explicitly override the Advance/Fall Back restriction, and the shooting permission omits Fall Back; confirm which restrictions are waived. |
| Sacrificial Blessing | Tzaangor Shaman | While this Tzaangor Shaman leads a unit, it may destroy one Bodyguard model to gain D3 Psychic weapon Attacks and Strength until phase end. The encoded scope is permanent and it supplies no activation event; confirm when the sacrifice is made and when the bonus ends. |
| Sacrificial Blessing | Kaa'skrek | When Kaa’skrek’s unit is selected to attack in your Shooting phase or either Fight phase and has a Bodyguard model, you may destroy one Bodyguard to add D3 to Kaa’skrek’s Attacks and Strength for the phase. The effect does not identify which weapon profiles these stat changes apply to; confirm the weapon scope rather than copying the ordinary Shaman’s Psychic-only limit. |
| Scuttling Walker | Defiler | This Defiler’s Normal, Advance and Fall Back moves can pass through non-TITANIC models and terrain, and it passes Desperate Escape tests. The source triggers these permissions only after the move ends and ambiguously allows moving while engaged; confirm the timing, allowed move types and required ending position. |
| Siege Shield | Chaos Vindicator | For ranged attacks, this model ignores worsening Hit modifiers. Its demolisher cannon can select a target subject to the condition that no other friendly unit is engaged with that target. The encoded permission does not explicitly waive the normal engagement targeting restriction; confirm that exception and any remaining Blast restriction. |
| Sorcerous Support | Chaos Rhino | After this Rhino shoots in your Shooting phase, select one enemy unit it hit. Friendly models that disembarked from this Rhino this turn add 1 to Psychic Hit and Wound rolls against that target for the phase. The source labels this record partial; confirm any omitted scope before relying on it. |
| Spirit Snare | Daemon Prince of Tzeentch | When a friendly THOUSAND SONS PSYKER with Cabal of Sorcerers is destroyed within 9″, choose a model with this Spirit Snare ability in range. That model gains +1 to Ritual Psychic tests for the battle, stacking to a maximum of +2. The trigger checks a shortened Cabal ability ID rather than the imported faction-specific IDs; confirm which casualties qualify. |
| Spirit Snare | Zadophon the Soul Eater | Zadophon’s Spirit Snare has no effect mechanics in this imported record. Do not copy the Daemon Prince’s version merely because it has the same name. |
| Split | Blue Horrors | After attacks resolve that destroy a BLUE model in this unit, while the unit is still on the battlefield, roll a D6: on 4+, add one Brimstone Horror to this unit. The pinned enrichment has a different Split effect; preserve this import and verify the replacement model and count. |
| Split | Pink Horrors | After attacks resolve that destroy a PINK or BLUE model in this unit, while the unit is still on the battlefield, roll a D6: on 4+, replace a PINK with two Blue Horrors or a BLUE with one Brimstone Horror. The pinned enrichment differs; confirm the current replacement counts rather than using the other Split version. |
| Strands of Time | Hexwarp Thrallband | After an eligible THOUSAND SONS PSYKER unit Falls Back, choose shooting or charging permission for the turn; while wholly within the Flow of Magic it receives both. The encoded base branch already grants both and lacks a clear Fall Back shooting exception; confirm the intended choice before use. |
| Temporal Instability | Servants of Change | When an eligible MUTANT INFANTRY or MOUNTED unit is selected to Advance or Fall Back, it can start an action despite that move. The source gives only a phase duration, which ends before later action steps; confirm when this permission is used and expires. |
| Touched by Tzeentch | Warpmeld Pact | At the start of your Movement phase, an eligible unit gains permission to shoot or charge after Advancing this turn, choosing one when acting. The effect grants Assault and charging together without a choice, while its notes require one of the two; confirm that choice restriction. |
| Umbralefic Crystal | Grand Coven | Once per battle per army, in your Command phase, if the bearer’s unit is unengaged, put it into Strategic Reserves. It gains Deep Strike until the start of your next Shooting phase and must ingress in your next Movement phase, including turn 1. The effect instead sequences reserves and ingress immediately with a turn duration; confirm the notes’ timing and expiry. |
| Unwavering Phalanx | Rubricae Phalanx | After an enemy ends a Charge move engaged with this eligible Rubric Marines unit, incoming attacks suffer -1 to Wound for the turn. The structured effect requires Strength to exceed Toughness, while its notes omit that condition; confirm whether the penalty is conditional. |
| Walking Rampart | Sekhetar Cohort | In your Movement phase, before or after the bearer moves, select one friendly SEKHETAR ROBOTS unit within 3″ to regain up to D3+1 lost wounds. The bearer also has Lone Operative while within 3″ of a friendly SEKHETAR ROBOTS unit. The healing effect targets a unit without naming which model regains wounds; confirm that model selection. |
| Warding Hex | Hexwarp Thrallband | In the Command phase, make this unit’s objective sticky until the next Command phase. The source does not identify an objective selection, ownership/range requirement or precise activation event; check those conditions before applying Warding Hex. |
| Warp Syphon | Warpforged Cabal | After rolling the extra Channelling die, while within 6″ of a friendly THOUSAND SONS VEHICLE unit, the bearer can cause 1 mortal wound to a selected Vehicle in range to re-roll that extra die before checking doubles or triples. The effect instead specifies a Psychic re-roll without binding it to the Channelling die; confirm the exact die and sequence. |
| Warpfire Infusion | Warpforged Cabal | When a friendly THOUSAND SONS VEHICLE is selected to shoot or fight, re-roll one Hit, Wound or Damage roll of your choice; if it is within 6″ of a friendly THOUSAND SONS PSYKER, re-roll one of each instead. A nearby qualifying Vehicle’s Deadly Demise threshold becomes 5+. The preserved import uses a phase scope while the pinned source differs, and its death branch modifies this model rather than clearly the destroyed Vehicle; confirm duration and recipient. |
| Warpflame Gargoyles | Warpforged Cabal | After an enemy ends a Charge move engaged with this eligible THOUSAND SONS VEHICLE unit, roll six dice: each 5+ causes 1 mortal wound to that enemy. The notes then require that enemy to take a Battle-shock test, but the effect tests this unit instead; confirm which unit takes the test. |
| Warpmeld Dagger | Warpmeld Pact | When attempting a Ritual, before determining the Psychic test result, the bearer may suffer D3 mortal wounds. If it survives, add 1 to the test result for each mortal wound suffered. The effect instead adds the D3 roll total regardless of damage prevention and triggers before rolling; confirm the timing and whether prevented wounds count. |
