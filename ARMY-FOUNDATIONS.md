# Army-defining rule corrections — 15 November 2026

Ten live catalog corrections close the highest-priority gaps identified in the
cross-faction status report. These are original study summaries checked against
the linked current references and applicable official faction-pack updates.
The packs supplement the Codex: a checked pack alone does not certify every base
rule. This pass does not certify the rest of any faction’s catalog.

| Area | Corrections |
| --- | --- |
| Drukhari | Power From Pain keeps the user’s three saved token-generation triggers and adds the pool/spend procedure, individual Pain activation timing, phase expiry and attached Leader/Bodyguard interaction. No universal starting-token allocation is invented. |
| Imperial Knights | Bondsman now gives the issuer, 12-inch Armiger selection, no-stacking and next-Command expiry. Code Chivalric supplies independent Deed/Quality choices, D6 tables, simultaneous bonuses, actual fulfilment tests, Honoured state and the 2/3CP reward exception. Valour’s Reward refreshes the detachment’s expendable Enhancements on Oath fulfilment. |
| T’au Empire | For the Greater Good uses the official replacement Observer/Spotted/Guided procedure, a Ballistic Skill improvement and MARKERLIGHT-dependent Ignores Cover. No one-to-one shooter pairing or forfeited Observer shooting is invented. Puretide’s Teachings applies to Farsight’s unit, without the unrelated Necron prerequisite. |
| Adepta Sororitas | Acts of Faith includes generation in both players’ turns, the per-unit/per-phase allowance, stored-value single-die substitution, the current permitted roll list, consumption and re-roll handling. |
| Grey Knights | Standard Gate of Infinity requires the ordinary ability on every model, not the Combat Patrol replacement. Prescient Redeployment and Tome of Forbidden Ways use that corrected eligibility and the appropriate selection allowance. Pickup and ingress stay separate timings. |

The corrected rules become ordinary Guide reminders with explicit timings and
usable study summaries. Conditions identify exact eligibility and exceptions;
original imported mechanics remain visibly labelled as historical, superseded
evidence. Saved text, imported payloads and previous audits remain recoverable
through the existing revision history and source hashes. No unit, profile,
detachment, account or saved list is changed. Combat Patrol versions remain
separate and unresolved empty variants are not promoted into practice.

## Sources and reproduction

Each entry in `scripts/army-foundations-notes.json` contains its checked date,
source links, independent study wording, targets, restrictions and timings.
`tests/fixtures/army-foundations-sources.json` records SHA-256 fingerprints of
the consulted faction pages and official supplements. Full scraped pages and
PDF text are not bundled.

`scripts/repair-army-foundations.cjs` accepts a fresh snapshot and output prefix.
It refuses any changed target record, including a changed revision or saved edit,
and generates ten expected-revision payloads for the existing administrator
`import_rules_catalog` RPC. It never connects to a database. The retained
before-fixture includes five untouched comparison records. After the repair is
applied, rerunning against the live records must fail until a new review is made.

Regression checks cover stale-edit rejection, immutable source/identity/scope
preservation, untouched Combat Patrol variants, practice exclusion, and actual
Guide card placement on both players’ turns, end of Fight and arrivals.

Earlier faction audit reports describe their original audit snapshots; this
document supersedes their warnings for these ten specific entries only.

## Applied verification

The live administrator import updated all ten entries atomically. Readback
matched every expected data payload and incremented each revision once. A
catalog digest confirmed all 9,303 other records unchanged. The saved Power
From Pain edit advances from revision 3 to 4; eight others advance from 2 to 3. Code Chivalric advances from 2 to 4 after
a follow-up timing refinement retains its Quality reminder during every phase
as well as the prebattle and Deed-check windows.

All 554 automated tests, syntax checks, build and bundle checks passed.
Headless Chromium checks at 1440px and 390px verified each corrected timeline
card’s summary, timing rows and editable reference status, plus faction review,
without page errors or horizontal overflow.
