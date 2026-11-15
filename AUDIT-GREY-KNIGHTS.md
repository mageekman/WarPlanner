# Grey Knights readiness audit — 2026-11-15

Source-derived review of the preserved Grey Knights imports against `wn-mitch/40kdc-data@6ea813f7706bc9a492026d8b4403af99a965162b`. This is not certification against the current official Codex. Original source records and reference/review flags remain intact.

| Coverage | Count |
| --- | ---: |
| Rules and abilities | 134 |
| Units / named stat profiles | 30 (26 enabled) / 30 |
| Detachments | 10 |
| Usable study summaries | 105 |
| Specific source conflicts or incomplete conditions | 18 |
| Empty effect records | 11 |

All pinned ability, unit, detachment and faction-rule IDs are present. The four previously disabled Crowe’s Sanctifiers datasheets remain disabled, preserving the saved catalog choice; they are included in source coverage but are not restored to the army builder. All 30 unit profiles match the pin; unit and detachment ability links and all eight leader-attachment records resolve. All rules receive persisted text or an explicit source issue. The two previously saved summaries (A Threat Ended and Channelled Force) are retained verbatim.

Six squad size selectors omitted counts inside the source composition-tier intervals. Interceptors, Purgation, Purifiers and Strike Squads now expose 5–10; Brotherhood Terminators and Paladins expose 4–10, preserving the pin’s existing four-model option rather than inventing an official minimum. This is interpretation of the retained community composition data, not an official validation of those source tiers. Profiles, keywords, equipment references, attachments and saved lists are unchanged.

## Important corrections and retained conflicts

- Standard **Gate of Infinity** names the Crowe’s Sanctifiers ability in its eligible-unit filter. It, **Prescient Redeployment**, and **Tome of Forbidden Ways** retain explicit eligibility warnings. Reserve selection at the end of the opponent’s Fight phase and the next Movement-phase arrival are separate timing rows. The Combat Patrol replacement retains its own source unit pool, 2/3/4 selection counts, unengaged requirement and first-round arrival permission.
- **Channelled Force** keeps the optional 2D6 test succeeding at or above Leadership and the choice between Sustained Hits 1 and Lethal Hits for Psychic melee weapons.
- **Hallowed Ground** retains the own-deployment-zone baseline, 6″ Purifier extension, territory-by-territory phase-start objective snapshots, visibility restriction for ranged attacks, and qualified full Hit re-rolls. **Paragon of Sanctity** affects one selected unit, not the whole region.
- Six leading-only abilities require an attached leader in the Guide. Equipment-bound Banner, Narthecium and Thunderhawk bomb rules retain their equipment gates. Upgrade enhancements use the pinned Interceptor/Purgation datasheet restrictions; other enhancements preserve their actual keyword gates without adding a Character restriction absent from the source.
- **Sanctifying Ritual** belongs at the end of your Command phase. Target-marking effects retain after-shooting resolution and early-order hints. Deep Strike/disembarkation effects with a later Charge benefit have separate timing rows. Core Stratagem costs, player turns, phases, exclusions and selection conditions are retained.
- **Armoured Aegis** heals one model in the saved source, while the pin says “per model”. **Dauntless Champions** and Combat Patrol **Purifying Force** have saved phase durations versus permanent pinned scopes. **Radiant Champion** has saved melee/triggering-model gates absent from the pinned mortal-wound part. All four variants remain unchanged and are bound to fixed source hashes.
- Setup timing in **Combat Manifestation** and **Hallowed Beacon**, move timing in **Force Wave**, charge-roll timing in **Repelling Sphere**, the undefined defender in **Responsive Displacement**, and the Movement-only shooting permission in **Soul-Locked** remain explicit review issues.
- **Haloed in Soulfire**, **Eye of the Augurium**, **Sanctified Auspexes**, **Argent Wrath**, and **Vigilance of Titan** retain specific targeting, cost binding, refresh-frequency, aura-frequency or detection-range gaps. These are not filled from another edition or similarly named rules.

The 11 empty records are Aegis Eternal, Duty Unending, Exigent Assignments, Flames of Sanctity, Hexwrought Reprisal, Inescapable Judgement, Necessary End, Sigil of Exigence, Strike from the Warp, Unending Fidelity and Warding Chant. They receive no invented effect or activation timing. All 29 unresolved entries are excluded from practice answers and distractors.

## Applying and verifying

`node scripts/audit-grey-knights.cjs BEFORE_JSON OUTPUT_PREFIX` checks the exact catalog snapshot and source bindings, validates profiles and references, and generates the revised catalog, manifest and one transaction through the existing admin-only, revision-checked import RPC. It does not connect or apply changes itself. The output changes 134 rules and six unit size lists; the other 35 catalog records are untouched. No schema, policy or account-list migration is required.

Tests cover source coverage, all four variants, unchanged imports and saved wording, teleport eligibility, Hallowed Ground, target restrictions, enhancement bearers, leading-only effects, equipment references, phase placement, model sizes, practice exclusions and concurrent-edit rejection. Browser checks cover the Workshop timeline, detachment filters, multiple timing rows, editable source warnings, field highlighting and unit size selectors on desktop and mobile.
