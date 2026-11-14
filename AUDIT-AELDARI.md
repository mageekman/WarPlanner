# Aeldari description audit

Audited all 312 Aeldari catalog entries using the [pinned 40kdc source](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b/data/enrichment/aeldari), its core Stratagem restrictions and previously reviewed study notes. This checks descriptions against source material; it is not official rules verification.

| Current result | Entries |
| --- | ---: |
| Usable descriptions | 258 |
| Missing effect data | 22 |
| Specific source issues | 32 |
| Generic description prompts | 0 |

## Current import refresh (v0.28.4)

Recent imports added turn and bearer metadata. The original presentation adapter intentionally requires an exact original payload, so those additions stopped many earlier descriptions from applying. The refresh saves the reviewed wording directly in the database for 301 entries and leaves all 11 workshop-edited entries completely unchanged. This includes the checked Eldritch Raiders text for Adrenal Infusions, Impeding Fire and Veterans of the Void, which resolve three previously empty-source entries.

The original adapter remains strict. The operational refresh compares source structures against the pinned records, validates added metadata against the core index, and separately accounts for two imported corrections already reflected in the reviewed notes: Crystal Matrix uses phase-limited individual re-rolls, and Tears of Isha heals one model rather than every model. It does not trust unchanged source digests alone. The complete current row and expected revision must match before an update can apply.

The 148 generic live prompts are replaced with reviewed descriptions, specific source issues or named missing-effect explanations. Generic army/detachment target previews are replaced with concrete beneficiaries or an explicit source gap. Recall answers now use the saved study description. All 80 unit profiles, 16 detachments, faction data, phase placement, early-activation hints, uploaded mechanics and account rosters are preserved. Revision history retains the previous payloads.

Examples: Protect keeps its FARSEER requirement; Misfortune keeps end-of-Movement timing, visibility, 18″ range and duration; Dance of Death keeps its choice and Fight-phase timing. Warrior Focus distinguishes ignored characteristics and Hit-roll modifiers. Critical hits and critical wounds remain separate. The existing 32 source issues below still need checking; they and the 22 missing effects remain excluded from practice pools.

`scripts/refresh-aeldari.cjs` generates the reviewed transaction without connecting or applying it. Summaries are persisted through the existing administrator-only import RPC and history trigger, rather than relying on a browser-only overlay. New source mechanics or unknown constraints fail validation; saved workshop edits are never silently replaced.

## Records that still require checking

Use **Rules workshop → Aeldari → All rules & abilities → Filter rules → Summary coverage** to find these or the missing effect records. Edit the study summary using a current rules reference and save it to persist your checked wording.

| Rule | Source issue |
| --- | --- |
| Aethersails | The fixed Advance distance is triggered after the Advance ends. Check its selection timing. |
| Archraider | The trigger targets an enemy Stratagem, but its cost modifier targets this unit. Check whose Stratagem cost increases and how the selected Character provides it. |
| Aspect Shrine Token | This token variant has no usage limit and a permanent duration. Check its token count, Character restriction and one-use limit before treating it as repeatable. |
| Aspect Training | The Striking Scorpions bonuses are nested inside a requirement to lead Howling Banshees. Those conditions cannot both be met as written. |
| Casting Back the Veil | The source increases detection range by 6″ without defining that mechanic. |
| Choreographer of War | Pile-in and Consolidation extensions trigger after those moves end. Check their timing and ending-position requirements. |
| Cloak and Shadow | The ranged restriction only permits targeting within 18″ without explicitly forbidding farther targeting. Check that restriction before combining it with Stealth. |
| Cloudstrider | The reserve instruction removes only the leading model while it is attached. Check whether the whole attached unit should move and how its arrival works. |
| Crewed Platform | The record destroys every platform when any model is destroyed. Check the intended remaining-crew condition before removing platforms. |
| Fading Fusillade | Permission to shoot expires in the Movement phase when the Fall Back is selected. Check its duration before using it in the Shooting phase. |
| Far-reaching Doom | The source increases detection range by 6″ without defining that mechanic. |
| Fated Hero | The benefit depends on a chosen target keyword, but the record does not define which keywords can be chosen or when. |
| Fog of Dreams (Psychic) | The source allows ranged targeting within 18″ but does not explicitly prohibit it beyond that distance. Check the intended restriction. |
| Graceful Warriors | The source grants Stealth but also subtracts an undefined detection range. Check that second effect before using the full rule. |
| Inevitable Death | The relocation has no destination, proximity or placement restrictions. Check those before moving the Yncarne. |
| Overlord | The stronger re-roll checks whether the leading model is below starting strength, rather than the unit. Check the intended beneficiary condition. |
| Point‐blank Devastation | The source describes failed number-of-attacks rolls without defining a pass/fail threshold. Check which attack-count rolls can be re-rolled. |
| Polychromatic Camouflage | The source allows ranged targeting within 18″ but does not explicitly prohibit it beyond that distance. Check the intended restriction. |
| Psychic Shield | The source permits ranged targeting within 18″ without explicitly forbidding farther targeting. Check the intended restriction. |
| Revenant Jet Pack | The fixed Advance distance is triggered after the Advance ends. Check its selection timing. |
| Ride the Wind | Reserve entry, immediate return and a later-round return are combined in one sequence without clear choice or arrival conditions. |
| Shedskin Raiment | The same unit is redeployed and then placed into reserves in a mandatory sequence. Check whether these should be alternative choices. |
| Shepherds of the Dead | The enemy receives the Vengeful Dead tag, but the bonus condition does not identify that enemy as the attack target. Check the intended matching condition. |
| Strands of Fate | The record adds a rolled Fate die but does not define the pool count or the complete spending restrictions. |
| Strength from Death | The Fade Back branch adds another move without saying whether it replaces or modifies the normal manoeuvre. Check its interaction and eligible units. |
| Support Artillery | The record only says this unit can attach; it does not identify eligible units or attachment restrictions. |
| Suppressing Storm | The enemy is tagged as suppressed, but the Hit penalty is applied to the shooting unit. Check which unit should take the penalty. |
| Titanic Advance | Movement permissions are triggered after movement ends. Check when moving through models and terrain is actually allowed. |
| Titanic Agility | The permission to move through models and terrain triggers after the move ends. Check its timing before using it during movement. |
| Titanic Strides | The movement permissions trigger after the move ends, and the tall-terrain procedure needs its exact timing checked. |
| Torc of Morai-Heg | An enemy Stratagem triggers the rule, but the cost modifier targets this unit. Check whose cost should increase. |
| Unshrouded Truth | Mandatory reserve entry, arrival, an Ingress move and a movement prohibition are combined without activation timing or clear sequencing. |
