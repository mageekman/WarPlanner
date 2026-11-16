# Shared units and allies consistency — 2026-11-16

Reviewed the current enabled catalog across all 12 Space Marine factions, Imperial Agents in 18 Imperial hosts, and GSC's two allied detachments. This is a consistency and eligibility pass over uploaded content, rather than a new faction wording, points or complete army-legality audit.

The 5,697-record enabled export produces 157 regular shared Marine datasheets and 1,004 faction-specific views. No duplicate native datasheet names were found in the reviewed factions. Shared and allied ability links resolve to the appropriate faction, with core rules and known source aliases accounted for. Each allied view has an enabled canonical editable source. Combat Patrol exclusions remain in force; historical shared-unit totals include archived patrol sheets and therefore differ from these regular-only counts.

## Corrections

- Shared chapter unit views now expose their canonical unit ID separately from their stable chapter ID. Unit-specific enhancement restrictions can match that explicit identity, without name guessing or granting another datasheet's eligibility. This restores chapter Captain, Techmarine, Ancient, Apothecary and other restricted bearer choices. All 78 applicable chapter/detachment/bearer cases pass the combined audit, including separately sourced native Watch Masters when an allied same-name Agent exists.
- The Guide checks all explicit bearer restriction groups for equipped/imported enhancements, not just groups with excluded keywords or required abilities. Invalid imported unit choices cannot bypass the list-builder restrictions. Keyword, excluded-keyword and required-ability alternatives retain their existing meaning.
- Allied Agents' bodyguard links are filtered to projected eligible Agents. Stale links to the excluded Aquila Kill Team no longer survive. Explicit Inquisitor access to native Imperial Infantry Battleline remains available.
- Corrected two source-bound catalog fields. **Incendiary Animus** retains its explicit Chaplain-or-Judiciar datasheet alternatives and removes a contradictory Chaplain-only keyword gate. **Skjald's Foretelling** requires the actual Wolf Guard Battle Leader keyword, replacing two separately stored keywords absent from that datasheet. Their rule text, stable IDs, memberships, Guide settings, imports and other fields remain intact.

## Confirmed boundaries

- Shared edits propagate to the chapter views; chapter-specific attachments, abilities and keywords remain scoped. Native and allied same-name datasheets still require an explicit source selection.
- Agents retain their own datasheets, keywords and canonical correction targets. Host army rules, host enhancements and Agents detachments do not leak through their inclusion. Agents-specific requisitioned datasheets remain distinct from the native Grey Knights and Sisters equivalents.
- Brood Brothers Auxilia exposes 52 uploaded Astra units; Final Day exposes 14 eligible Tyranid units. Detachment changes retain existing entries for correction while denying invalid allied access. Voice of Command and its dependencies remain suppressed for Brood Brothers, while Kasrkin Warrior Elite remains available under its existing FAQ permission. Final Day retains the SYNAPSE keyword without granting the Synapse or Shadow in the Warp army abilities. Current source profiles flow through the projections.
- Existing allowance, point-verification, enhancement, Warlord, attachment and canonical-reporting tests remain passing. These checks do not certify every possible army composition or automatically import missing datasheets.

## Sources and verification

The two bearer corrections were checked against the current [Space Marines reference](https://wahapedia.ru/wh40k11ed/factions/space-marines/), retrieved 2026-11-16. Reference HTML SHA-256: `6c2c8079d3581a8ea5c62b9ed5072172f67382cf8d6ed36c4d61225343ed711c`. The reference explicitly identifies Chaplain/Judiciar and Wolf Guard Battle Leader bearers respectively; this pass does not promote that community reference into an official certification. Existing Agents and GSC source checks are documented in [ALLIED-AGENTS.md](ALLIED-AGENTS.md) and [AUDIT-GSC-ALLIES.md](AUDIT-GSC-ALLIES.md).

`scripts/audit-shared-allies.cjs CATALOG_JSON` performs a read-only runtime consistency audit against a current enabled catalog export. It checks names, ability/bodyguard links, editable allied sources, canonical bearer cases and GSC projections. `scripts/fix-shared-bearers.cjs` is an offline, exact-baseline-bound generator for the two reviewed corrections; it refuses changed records and never connects to a database.

The two live records were saved through the existing revision-checked import RPC. Complete read-back matches both expected records at revision 2; both revision-1 entries are retained in history. The other 9,677 records retain their key/revision/data digest, `c1b097aadffe641b771832bfc56e8599`. No saved lists, reports, authentication configuration or schema were changed.

Validation: 732 automated tests, syntax checks, build, bundle and combined catalog audit pass. Desktop/mobile Chromium checks exercise chapter enhancement selection, exclusion of ineligible bearers, filtered allied search and an actual Final Day Guide ability. Browser accounts and rosters are mocked; checks do not write account data.
