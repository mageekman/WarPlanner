# Tyranids description audit

## Regular-army follow-up — 2026-11-16

Astra Militarum was published first in PR #43, release `014f28c2f5ab4997f5e7356f30856963d5db9348`, before this Tyranids pass began.

This follow-up updates **47 active regular-army rules and four unit profiles**, resolving **35 of 36 flagged entries** and refreshing eleven related/current entries, including the approved Norn harpoon correction. The uploaded active scope is **174 rules: 173 usable summaries and one explicit source conflict**, plus **52 units and ten detachments**. Combat Patrol remains archived; other unit profiles, keywords, source imports, existing guide preferences and disabled records are preserved.

Sources are the current faction/datasheet references and official Tyranids faction pack **v1.3, legal October 14, 2026**. URLs, source hashes, context fingerprints and selected already-correct unit updates are in `tests/fixtures/tyranids-finish-sources.json`. Original study wording: `scripts/tyranids-finish-notes.json`. Baseline: `tests/fixtures/tyranids-finish-before.json`. `node scripts/finish-tyranids.cjs tests/fixtures/tyranids-finish-before.json /tmp/tyranids-finish` generates the offline, revision-checked update and rejects changed/added/missing Tyranids records.

Corrections restore the full army-wide Shadow trigger and separate six-inch penalty, Synapse’s actual providers and both benefits, regeneration counts/caps, spawned-unit sizes and strict spacing, current reserves and deep-strike limits, named 0CP/repeat-use exceptions and model-specific death reactions. Harpy creates one Spore Mines unit with D3 models rather than D3 units. The Norn harpoon requires its same-turn hit, eligible target within 12 inches and ending the charge engaged with that target; the approved rule’s stable ID and guide settings remain intact.

Overrun now appears in the Guide’s separate Consolidate step; Adrenalised Onslaught appears at Pile In and Consolidate when equipped. They are not mixed into ordinary Fight attacks. Existing before-timing values remain compatible; the Guide routes these two named movement effects to their existing core movement steps. Current profile checks also correct Harpy/Hive Crone Movement and OC to “-”, Sporocyst Movement to “-”, and Harridan Movement to 14. Original imported profiles remain preserved. Non-numeric aircraft/immobile values no longer become false numeric quiz answers. Enhancement eligibility now enforces Monster exclusions and required Deep Strike in the builder and imported Guide lists.

Two source discrepancies are documented explicitly. **Malign Presence** follows the official v1.3 replacement: once per turn, +1CP paid by the opponent on the actual targeted use within 12 inches, without a Warlord gate. The community page’s Warlord/every-use wording conflicts with that replacement. **Rapacious Hunger remains needs source review:** its immediate regeneration is described, but the old D3-to-fixed-3 special clause does not match the official Feed the Swarm D3+1 heal. No fixed-4 or other invented benefit is substituted, and the rule stays out of quiz answers and distractors.

This is a follow-up for the uploaded catalog, not a complete Codex/Legends/weapon import, points certification or full army-legality engine. Earlier results below are preserved as history.

Reviewed all 186 enabled native Tyranids rules against their preserved imported mechanics and the [pinned 40kdc core index](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b/data/core/tyranids). This replaces the generic description prompts left after the earlier faction import repair. It is a source audit, not official rules verification.

| Result | Entries |
| --- | ---: |
| Concise study summaries | 147 |
| Specific source issues | 26 |
| Missing effects | 13 |

Every native description now contains a study summary or a specific explanation of missing or conflicting data. Normal and Vardenghast Swarm versions stay distinct: Bio-stimulus changes melee AP in one version and grants Feel No Pain in the other; Disruption Bombardment has different targets and expiry windows. Source scopes, tests, dice thresholds and bearer-versus-unit restrictions remain explicit. Synapse and Shadow in the Warp are among the source records needing clarification; the audit does not invent their missing selection or timing rules.

Core Stratagem records supply targets, including the alternative one-unit/two-unit modes and their Synapse, proximity and engagement restrictions. Exocrine, Pyrovores and Screamer-Killer receive early-shooting hints while retaining after-shooting resolution. Instinctive Defence identifies its conditional Fights First benefit without marking a unit as permanently having Fights First. Corrected guide placement separates shooting, setup, round-start and turn-end triggers.

The original imported mechanics, reference flags, 57 unit profiles, 11 detachments, faction alias, four previously disabled foreign copies, account army lists and original text uploads remain unchanged. All 186 updates pass through the existing admin import RPC and revision-history trigger. Full comparisons against the audit snapshot reject edited entries before generating the transaction; expected revisions reject concurrent edits during application.

The production summaries are saved in Supabase. `scripts/audit-tyranids.cjs` generates the review plan and SQL without applying it. Find unresolved entries under Rules workshop → Tyranids → All rules & abilities → Filter rules → Summary coverage. Incomplete/conflicting descriptions remain out of practice pools; exact imported details remain inspectable under Conditions & sources.

## Specific source issues

| Rule | Detachment / unit | Issue |
| --- | --- | --- |
| Adaptive Biology | Invasion Fleet | The source gives Feel No Pain 5+ only while the bearer has lost no wounds, and grants 4+ at the start of your turn if it has lost wounds. Check which save applies between taking the first wound and that next turn. |
| Adrenalised Onslaught | Unending Swarm | The source adds 3″ to Pile-in and Consolidation moves, but triggers after those moves have ended. Check when the extra distance applies. |
| Alien Cunning | Invasion Fleet | After deployment, the source selects up to three friendly TYRANIDS units, then both redeploys them and puts them in Strategic Reserves as mandatory steps. Check whether those should be alternative choices. |
| Cryptophotaic Camouflage | Ambush Predators | The source reduces this unit’s detection range by 3″ but does not define detection range or how it affects the game. Check that mechanic before applying it. |
| Death Blow | Terror of Vardenghast | This fight-on-death variant contains a step that destroys the bearer if it has not fought, without a destruction trigger. It also delays removal until the unit fights or the phase ends. Check the trigger and resolution sequence. |
| Death Blow | Winged Tyranid Prime | The source includes a step that destroys the bearer during a melee attack if it has not fought, rather than triggering when the bearer is destroyed. Check that condition before using its 4+ fight-on-death effect. |
| Feed the Swarm | Assimilation Swarm | A HARVESTER can select a friendly TYRANIDS unit within 6″ to heal D3+1 wounds or return one model, with one selection per phase. The source gives no activation event, so check when regeneration is allowed. |
| Higher Imperatives | Talons of the Norn Queen | The source activates Singular Purpose for friendly NORN EMISSARY and NORN ASSIMILATOR units in a Command phase, but Singular Purpose is restricted to battle round 1. Check whether Higher Imperatives overrides that restriction or allows changing the original choice. |
| Hypersensory Adaptations | Ambush Predators | The source selects an enemy visible to this model and within 12″ of this unit, then adds 6″ to its detection range. Detection range is not defined; check its game effect. |
| Malign Presence (Aura) | The Swarmlord | An enemy Stratagem targeting a unit within 12″ triggers this once-per-turn effect, but the extra CP cost is assigned to the Swarmlord’s own unit. Check which player pays the increased cost. |
| Neuronode | Vanguard Onslaught | After deployment, the source selects up to three friendly VANGUARD INVADER units, then both redeploys them and puts them in Strategic Reserves as mandatory steps. Check whether those should be alternative choices. |
| Overrun | Invasion Fleet | The source adds Consolidation distance only after the Consolidation ends, then grants a separate 6″ Normal move in Synapse range. Check the extra-distance timing and whether the Normal move replaces or follows Consolidation. |
| Parasitic Infection | Parasite of Mortrex | After this model destroys an enemy INFANTRY unit with its Barbed Ovipositor in the Fight phase, the source creates a Ripper Swarms unit wholly within 3″. It does not specify that unit’s model count or enemy-spacing restrictions; check the setup details. |
| Pheromone Trail | Lictor | The source gives one use of a 0CP Stratagem targeting this unit, but never names the Stratagem. Check which Stratagem Pheromone Trail discounts; do not treat it as any Stratagem for free. |
| Psychic Terror (Psychic) | Neurotyrant | While a friendly NEUROTYRANT is on the battlefield, an unspecified ability use applies −1 to enemy Battle-shock tests. The source never identifies that ability, so check its trigger rather than applying the penalty to every ability use. |
| Seed Spore Mines | Biovores | Once per turn in the Shooting phase, the source creates a Spore Mines unit wholly within 48″ instead of this unit shooting. It gives no enemy-spacing restriction or model count for the new unit. Check those setup details. |
| Seeded Broods | Vanguard Onslaught | The source allows reserve units to be set up with a round offset of 1, but does not say whether that means one round earlier or later, or which arrival limits change. Check the arrival timing. |
| Shadow in the Warp | Tyranid Warriors with Ranged Bio-weapons, Winged Hive Tyrant, Norn Emissary, Winged Tyranid Prime, The Swarmlord, Tyranid Warriors with Melee Bio-weapons, Hyperadapted Raveners, Norn Assimilator, Neurolictor, Zoanthropes, Broodlord, Parasite of Mortrex, Neurotyrant, Tyranid Prime with Lash Whip, Tervigon, Maleceptor, Hive Tyrant, Terror of Vardenghast, Vardenghast Swarm Barbgaunts, Vardenghast Swarm Psychophage, Vardenghast Swarm Termagants, Vardenghast Swarm Von Ryan's Leapers | The source records a one-use Battle-shock effect on enemies within 6″, but does not identify the range’s origin, activation timing or whether the use is shared across the army. Check the complete Shadow in the Warp rule. |
| Skulking Hunters | The Vardenghast Swarm | The source reduces this unit’s detection range by 6″ during your opponent’s Shooting phase, but never defines detection range or its game effect. Check that mechanic. |
| Spawn Termagants | Tervigon | The source returns D3+3 destroyed models to one friendly TERMAGANTS unit within 6″, with one selection per phase, but gives no activation event. Check which phase and timing allow the return. |
| Stalking Forward | Hierophant | The source permits movement through non-TITANIC models and terrain up to 4″ during Normal, Advance and Fall Back moves, but triggers only after the move ends. Check when those permissions apply. |
| Synapse | Trygon, Mawloc, Tyranid Warriors with Ranged Bio-weapons, Winged Hive Tyrant, Harridan, Norn Emissary, Winged Tyranid Prime, Von Ryan’s Leapers, Hierophant, The Swarmlord, Exocrine, Venomthropes, Tyranid Warriors with Melee Bio-weapons, Spore Mines, Tyrannocyte, Ripper Swarms, Biovores, Deathleaper, Hyperadapted Raveners, Norn Assimilator, Sporocyst, Tyrannofex, Neurolictor, Psychophage, Zoanthropes, Broodlord, Harpy, Parasite of Mortrex, Tyrant Guard, Screamer-Killer, Mucolid Spores, Hormagaunts, Genestealers, Toxicrene, Pyrovores, Neurotyrant, Termagants, Tyranid Prime with Lash Whip, Hive Guard, Barbgaunts, Neurogaunts, Hive Crone, Tervigon, Old One Eye, Maleceptor, Carnifexes, Hive Tyrant, Gargoyles, Haruspex, Lictor, Raveners, The Red Terror, Terror of Vardenghast, Vardenghast Swarm Barbgaunts, Vardenghast Swarm Psychophage, Vardenghast Swarm Termagants, Vardenghast Swarm Von Ryan's Leapers | The source gives friendly TYRANIDS within 6″ of friendly SYNAPSE models an extra D6 on Battle-shock tests. Its separate +1 melee Strength branch omits the SYNAPSE anchor and TYRANIDS restriction. Check that branch’s eligible units and range before applying the full rule. |
| Synaptic Imperatives | Synaptic Nexus | The source offers a 5+ invulnerable save, +1 to Advance and Charge rolls, or +1 to melee Hit rolls for a battle round. Each branch targets friendly units within 6″ without identifying the range’s origin. Check eligibility, the Synapse link and any reuse limits. |
| Tremor Senses | Subterranean Assault | After deployment, the source selects up to three friendly TYRANIDS units, then both redeploys them and puts them in Strategic Reserves as mandatory steps. Check whether those should be alternative choices. |
| Vanguard Intellect | Subterranean Assault | The source permits Deep Strike in the next Movement phase, including round 1, but gives no reserve-state requirement or event that starts that countdown. Check its arrival conditions. |
| Will of the Hive Mind | Winged Hive Tyrant, Hive Tyrant | Once per battle round, a Stratagem on a friendly TYRANIDS unit within 12″ triggers a 1CP discount, but that discount is assigned to the bearer’s unit rather than clearly to the selected ally. Check which target receives it. |

## Missing effect records

- Adrenal Surge — Invasion Fleet
- Bio-Reserves (Once per battle per unit) — Terror of Vardenghast
- Biophagic Flow (Aura) — Assimilation Swarm
- Irresistible Will — Synaptic Nexus
- Parasitic Payload — Warrior Bioform Onslaught
- Preservation Imperative — Unending Swarm
- Rapacious Hunger — Assimilation Swarm
- Reclaim Biomass — Assimilation Swarm
- Regenerating Monstrosity — Assimilation Swarm
- Replenishing Swarms — Subterranean Assault
- Tunnel Network — Subterranean Assault
- Unending Waves — Unending Swarm
- Unseen Lurkers — Vanguard Onslaught

## Follow-up application and validation

Applied 51 revision-checked changes after exact comparison of all 260 Tyranids rows. Complete read-back matched every expected field across the 260 rows, and all 51 prior revisions remain in history. The other 9,419 catalog records kept the same revision/content digest (`780c0d11ca77ce2616d8b9c679cdb473`). No schema, authentication, saved-list or report data changed.

725 tests passed, including thirteen follow-up regressions. Syntax/build/bundle checks passed. Browser checks at 1440px and 390px cover Overrun in the actual Consolidate Guide step, Shadow and Malign Presence editing, the retained Rapacious Hunger conflict, regular-only detachment scope and the corrected editable aircraft profiles. Activation checks also retain existing Aeldari movement reminders.
