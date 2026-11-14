# Space Marines and chapter audit — 2026-11-14

Audited the parent Space Marines catalog and every chapter supplied by the pinned community source: Blood Angels, Dark Angels, Deathwatch, Black Templars, Space Wolves, Ultramarines, Imperial Fists, Iron Hands, Raven Guard, Salamanders and White Scars.

The 640 distinct source abilities now have original, concise study wording or a named explanation of what prevents a reliable summary. Of those distinct abilities, 505 have complete study summaries, 126 have specific source conflicts or missing limits, and nine have absent effects. Counts include saved source corrections, not a claim of official verification. Unresolved entries are excluded from practice answers.

## Catalog coverage

Each chapter has its own source rules, generic Space Marine units and rules, chapter units, stat profiles, detachments, and faction-scoped quiz material. The parent faction keeps its existing chapter datasheets and now has their associated abilities. Namespace-specific references prevent a chapter from using another chapter’s datasheets or linking its version of a rule to an unrelated unit.

| Faction | Rules | Units with profiles | Detachments |
| --- | ---: | ---: | ---: |
| Space Marines | 427 | 177 | 17 |
| Blood Angels | 265 | 91 | 21 |
| Dark Angels | 281 | 94 | 21 |
| Deathwatch | 239 | 84 | 18 |
| Black Templars | 259 | 87 | 21 |
| Space Wolves | 291 | 99 | 21 |
| Ultramarines | 239 | 82 | 18 |
| Imperial Fists | 222 | 76 | 18 |
| Iron Hands | 223 | 76 | 18 |
| Raven Guard | 222 | 76 | 18 |
| Salamanders | 222 | 76 | 18 |
| White Scars | 222 | 76 | 18 |

These totals include shared parent material scoped into each chapter, rather than additional distinct rules. Detachment options combine the parent and chapter files. They are not an army-legality certification; source construction exclusions still apply.

## What changed

- Replaced generic import prompts with summaries of the actual effect, including choices, beneficiaries, limits and duration where supported.
- Restored the missing Blood Angels and Dark Angels units from the parent unit source; added the eight previously absent chapter factions.
- Kept chapter stat profiles available in the Workshop and practice pools. Generic unit profiles are copied unchanged, with faction-specific catalog links.
- Used core stratagem and enhancement records for CP costs, phases, turn, bearer requirements and target restrictions. Core-only shared records now use the corresponding parent mechanics.
- Marked Hailstrike, Signum Array, Divinator-class Auspexes, Driven from Cover and Shattered Defences for early shooting consideration, while keeping their actual resolution timing. Fights First distinguishes a unit benefit from a bearer-only benefit.
- Preserved every existing imported source record, profile, reference-only setting, enabled status and stable ID. Four saved mechanics variants differ from the pinned upstream source; the audit preserves and explicitly accounts for them.
- Kept account lists, original uploads, reports, admin access and other factions outside the update.

## Source limitations

The source contains provisional community interpretations. Examples needing a current authoritative reference include contradictory Black Rage support conditions, Driven by Fury’s mover and distance, conflicting Dark Angels Fight-on-death and mortal-wound instructions, missing saga effects, and multiple effects applied to the wrong side. These are visible as specific review notes, not guessed rules. Reference-only settings remain as imported; this audit does not automatically promote them into guide activations.

The upstream parent file includes chapter variants in some generic units’ ability lists. The scoped catalog selects the appropriate chapter variant and removes foreign chapter links. It retains ordinary core abilities such as Leader, Deep Strike and Deadly Demise, including their parameters.

## Reproduction and verification

Source: [wn-mitch/40kdc-data](https://github.com/wn-mitch/40kdc-data/tree/6ea813f7706bc9a492026d8b4403af99a965162b), commit `6ea813f7706bc9a492026d8b4403af99a965162b`.

- `tests/fixtures/marines-audit-before.json`: reviewed pre-update catalog scope.
- `tests/fixtures/marines-audit-sources.json`: pinned relevant core/enrichment source tables; attribution in CREDITS.md.
- `scripts/marines-study-notes.json`: 556 authored mechanical groups covering all 640 unique source abilities.
- `scripts/audit-marines.cjs`: rejects changed or unexpected workshop records, preserves original source data, and generates per-faction updates using `expectedRevision` checks. It never connects to a database itself.
- `tests/marines-audit.test.cjs`: complete coverage, chapter isolation, profiles, references, target restrictions, sequencing, saved variants, edit guards, and all four quiz types for every faction.

Run `node scripts/audit-marines.cjs BEFORE_JSON OUTPUT_PREFIX` only against the exact reviewed baseline. Generated SQL requires the existing admin import RPC, preserves revision history and runs per faction within an atomic transaction. The script is a one-time migration, not a command to overwrite later Workshop edits.

Verification includes the complete test suite, syntax checks, build and bundle, rollback-only database previews, post-save field/revision/history comparisons, and desktop/mobile browser checks with mocked accounts and requests. Browser checks include all twelve Workshop folders and all twelve faction quiz pools, answer rule cards, no mobile overflow and unchanged saved lists.
