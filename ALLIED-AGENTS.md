# Assigned Agents in Imperial lists

Imperial Agents have two distinct roles in WarPlanner:

- An **Imperial Agents army** uses the uploaded Agents catalog, its own detachments and its own versions of requisitioned Grey Knights, Sisters and Deathwatch datasheets.
- A **different Imperial army** can select eligible Agents as allies. Those entries retain their Agents profiles, keywords, equipment and datasheet abilities. Inclusion does not grant host-faction army rules, host detachments or host enhancements. Explicit datasheet permissions remain available, such as an Inquisitor leading Imperial Infantry Battleline or Kroyle supporting eligible host models.

## Working with a roster

Search for an Agent by name in the list builder. Results are labelled **Imperial Agents ally**, and the working list retains the selected datasheet identity. Where native and allied units share a name, imported entries require a **Datasheet source** choice in the list editor. Clicking a native result in the builder records that native choice as well; it cannot silently become its Agents counterpart. Original uploaded list text remains intact.

The roster shows Assigned Agents counts for the selected battle size:

| Battle size | Characters | Retinue | Requisitioned |
| --- | ---: | ---: | ---: |
| Incursion, 1000 points | 1 | 1 | 1 |
| Strike Force, 2000 points | 2 | 2 | 1 |
| Onslaught, 3000 points | 3 | 3 | 2 |

Inquisitorial Agents may use one Retinue exemption per included Inquisitor. Voidsmen-at-Arms may use one per included Voidfarers Character. The two exemptions are tracked separately and cannot exempt arbitrary Retinue units. Dedicated transports are counted separately, with a reminder about starting embarked passengers and transport eligibility. Assassin duplicates and Warlord restrictions, unknown or non-IMPERIUM entries, imported host enhancements and excess allowances produce review notes.

These are study and roster checks. The site does not certify points, deployment, transport capacity, battlefield roles or full army legality. Assigned Agent prices can differ from Agents-army prices; the imported point values are retained and must be checked against the current points publication. Custom battle limits are classified into the existing size tiers; use the standard battle-size selector for these allowances.

## Shared editing and rule boundaries

`dist/allies.js` creates read-only runtime views from the enabled Agents source units and their linked datasheet rules. Each view carries its canonical source key and an explicit source faction, with unique runtime IDs. No extra editable catalog records are created in host folders. Editing an Agents source and reapplying the catalog refreshes all views; correction reports route to that source.

The reviewed `assignedAgents` metadata on the Agents faction record controls eligibility, limits, excluded historical/patrol entries and the four documented Inquisitors allowed to lead native IMPERIUM INFANTRY BATTLELINE. Non-Imperial and unknown factions receive no automatic allies. The historical Aquila sheet and named Inquisitor’s Hand sheets are excluded from external suggestions.

Host keywords are never appended. Detachment rules, enhancements and unlinked faction rules are never projected. The Guide keeps the allied source identity, labels allied cards, respects equipment and attached-provider gates, and does not list an attached Agent as a recipient of a host army-rule card. Rites of Teleportation supports the attached Inquisitor’s Deep Strike permission only when the matching Agents Terminator bodyguard and source rule are present.

Whole-faction quizzes stay native to that faction. Saved-list quizzes can use the actual allied datasheets included in the selected roster; source-review entries remain excluded. Profile/rule reporting resolves the canonical Agents source rather than a transient view. No database schema, auth policy or account data changes are required.

The unit resolver uses an indexed lookup invalidated when the catalog is reapplied. The views are not stored in saved catalog snapshots, and existing Guide session caches still invalidate on catalog or roster changes.

See [the source audit](AUDIT-IMPERIAL-AGENTS.md) for coverage, corrections and outstanding issues.
