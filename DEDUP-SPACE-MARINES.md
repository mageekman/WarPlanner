# Space Marine unit and rule consolidation

The final pass keeps the existing **177 canonical datasheets** and their **1,094 chapter-specific runtime identities**. Profiles, model counts, common and chapter keywords, leader attachments, ability parameters, faction availability, and source records remain unchanged.

Of 3,060 active Marine/chapter rule records, **2,439 copies are archived**, leaving **621 editable rules**. This pass creates 406 shared groups using existing canonical IDs. Armour of Contempt keeps its existing shared record and separate Shooting/Fight timings. Archived originals retain their full data, source provenance, and revision history.

Rules merge only when their reviewed descriptions, conditions, timings, category, guide settings, source mechanics, and source restrictions agree. Faction and detachment memberships preserve availability. Where the same effect belongs to different units in different chapters, optional membership unit lists and target text retain those differences. The Workshop membership editor exposes these fields. Unit and detachment links resolve archived IDs to the canonical rule.

Saved variants with different timings or reviewed settings remain separate: the Black Templars and Dark Angels Bladeguard entries, Deathwatch Indomitor Doctrines, and Deathwatch Transhuman Strategist. This consolidation does not adjudicate those differences or change their gameplay behavior.

`scripts/finish-marine-dedup.cjs INPUT_JSON OUTPUT_PREFIX [ADMIN_UUID]` verifies the full enabled Marine catalog against revision/content fingerprints, validates the retained source mechanics, and produces changes, a compact operation plan, and a summary. Supplying the administrator UUID also generates the transaction SQL. It never connects to the database. Live application uses the existing admin-only, revision-checked import RPC in one transaction; source copies are disabled rather than deleted. Saved user lists are untouched. No schema or policy changes are needed.

Regression checks compare all chapter datasheets, eligibility by faction/detachment, every phase and player turn, and Shooting/Fight activation ownership. Concurrency guards reject changed or missing rows and new catalog scope. Tests reconstruct the snapshot from retained audit fixtures and the four later edited rule records.
