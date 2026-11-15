# WarPlanner — personal study edition, v0.28

Necrons catalog audit: all 230 native rules reviewed across 57 datasheets
(58 profiles) and 13 detachments. There are 158 usable summaries, 57 source issues
and 15 missing effects. The imported Reanimation procedure and Resurrection Orb
records remain incomplete and explicitly flagged. See [AUDIT-NECRONS.md](AUDIT-NECRONS.md)
for coverage, outstanding issues and the guarded repair.

Drukhari catalog audit: 164 rules and 10 detachments reviewed, with four missing
Coven of Agonies datasheets restored for 27 units and 28 profiles. There are 102
usable study summaries, 43 source issues and 19 missing effects. Power From Pain
remains an empty source record and is flagged explicitly. See
[AUDIT-DRUKHARI.md](AUDIT-DRUKHARI.md) for the review list and guarded repair.

Thousand Sons catalog audit: all 156 generic rule prompts now have source-based
study text or a specific source-issue description. Two saved rule edits and three
edited units are preserved. Coverage includes 158 rules, 38 units (44 profiles)
and 10 detachments. There are 109 available summaries including the saved edits,
47 source issues and two missing effects. See [AUDIT-THOUSAND-SONS.md](AUDIT-THOUSAND-SONS.md)
for the review list and guarded repair workflow.

A phone-friendly study companion for your 11th-edition Aeldari roster. The walkthrough teaches explicit core timing windows and offers roster-specific reminders. It is not a game-state tracker or a rules judge.

## Open

Open `warplanner.html` in a modern browser. No build or installation needed. For account login, run `npm ci && npm run build`, serve `docs/` over HTTP, and configure the local redirect in Supabase. Optional Google Fonts fall back to system fonts without a connection. For consistent browser storage, serve the folder with `python -m http.server 8000 --directory dist` and use the same origin each time.

## Flashcard phase reference

The action part of each phase is a visible board of relevant cards. Short headings identify the timing window (Start of Turn, Start of Movement, End of Shooting). The guide opens with a Start page: select a saved list and the first player, then press Start. Lists are grouped as Space Marines, Imperium, Chaos, Xenos (unclassified factions follow under Other) and sorted by faction and list name inside each group. Edition and content-coverage notes live below the Start button. During the walkthrough, the turn toggle and phase tabs remain fixed above an internally scrolling page. A small settings gear at the top right returns to setup to reset the guide or choose another army. Its Small, Medium and Large font options adjust guide content; Medium retains the original typography. The choice persists per account on this device and survives guide resets. Only Core Rules and the content below it move. Plain SVG arrows sit at the midpoint of full-height edge controls inside the guide frame. Content extends beneath these controls without reserved gutters; subtle gradient shadows mark both edges. Header controls remain above the edge hit areas. On hover-capable devices they are hidden until hovered, fading to half opacity over 1.1 seconds. Touch devices show a soft 4.8-second opacity pulse and a two-pixel directional nudge as a swipe hint. Keyboard focus reveals the controls; reduced-motion settings use static hints instead of animation. The guide uses the available dynamic viewport height and keeps an inset margin on mobile and desktop, including landscape layouts. Arrow navigation slides the current content page out while the adjacent page enters; horizontal touch dragging moves both pages with the finger and either completes or snaps back. Navigation moves through steps, phases, player turns and rounds in both directions. Reduced-motion settings and browsers without the Web Animations API use immediate page changes. On touch devices, swipe left for the next page and right for the previous page. Vertical scroll, short/diagonal gestures, multi-touch, screen-edge browser gestures, text selection and interactive controls are excluded. Animation orchestration and swipe handling are covered by automated DOM-adapter/event tests, including in-flight navigation locking, cancellation and reduced motion. These automated motion checks use a DOM adapter; a Chromium mobile rendering check also passed, while physical-device swipe behavior remains unverified. There is no unit dropdown, per-unit completion button, unit review queue, or confirmation gate when moving on.

- Shared army/detachment options and Stratagem prompts appear once at the top. Their previews and expanded panels describe targeting/eligibility instead of enumerating the roster; rules without a unit target say so. Stratagem prompts with different targets are separate named cards. Movement starts with Swift as the Wind and Flitting Shadows, followed by other applicable shared options.
- Unit-specific abilities appear under the **unit's name**: Avatar of Khaine, Swooping Hawks, Warp Spiders, and other units with relevant rules. Ordinary units with no special reminder are omitted from the board; absence does not mean they cannot act.
- Unit cards start collapsed and show the applicable ability, enhancement, and shared-rule names beneath the unit name. Expand the unit to read its facts and timing; conditions and source references remain optional. Color labels distinguish unit abilities, army/detachment rules, core rules, Stratagems and enhancements.
- When the same mechanically identical ability belongs to three or more unique unit types, it gets its own collapsible shared card. Its preview lists those types, or “Multiple Units” if the preview exceeds two lines. Fights First stays on individual unit cards. Repeated squads do not increase this threshold.
- A unit block is omitted if all of its relevant rules are already in shared blocks. Its eligibility remains listed in the shared rule. Units with unique relevant abilities still have their own block.
- The guide shows each unique unit type once, with leaders separate from bodyguards: Fire Dragons, Fuegan and Autarch each have their own card. Saved rosters retain all squad copies, equipment and attachments; reminders still use those actual relationships and independent limits.
- Fight unit cards show a Fights First badge when all imported members have the rule, including a Banshee-leading Autarch’s conditional ability. A standalone Autarch is not given the badge. Charge-granted Fights First is not inferred because battlefield actions are not tracked.
- War Walkers and the Falcon are the first Shooting unit cards because they can help later attackers. Suggestions do not set a mandatory order. The provider card describes the benefit once rather than repeating it under every possible recipient.
- Fire Dragons retain their unit-specific rules and point to shared detachment choices shown above. Fuegan's Melta-range reminder appears on his own card when his imported attachment qualifies, conditional on him still leading.
- Start/end-of-phase and turn/round windows remain separate. Fight keeps its pile-in, fight and consolidation steps. Movement/Shooting during the opponent's turn show possible friendly responses, not an invented enemy roster.
- Existing same-origin armies, labels, source confirmations and phase position are retained when upgrading from v0.3. Old per-unit review state is discarded because it is no longer used.

## Source review and limits

Core sequences were compared with the June 2026 official 11th-edition PDF on 13 November 2026. Asurmen's updated weapon ability and the Aspect Shrine Token exclusion were compared with the official October Aeldari update. Fuegan’s range reminder was also checked against the live community datasheet on 13 November 2026. Other army summaries use the documented Wahapedia export and comparisons with a pinned 40kdc snapshot; they need confirmation in the player's current app/book. See [content-review.json](docs/content-review.json) for the inventory, source fingerprints and limits, and [CREDITS.md](CREDITS.md) for attribution.

The program does not guarantee latest-errata completeness or validate a roster. It cannot infer ranges, visibility, casualties, remaining tokens, passengers, reserve assignments, or whether a leader is still leading. It shows possible reminders, not legal activations. Stratagem cards point to timing opportunities and intentionally require the complete current reference for cost and full resolution. Mission scoring, weapon-by-weapon lessons, some passive/damaged-profile details and tournament-specific rulings remain outside coverage.

This is personal-use software, not a cleared public product. The earlier source/IP assessment remains in `/workspace/war-plan-research`; research evidence and official rulebook PDFs are not shipped in this app. Supabase Auth handles accounts; GitHub Pages serves the app. No telemetry or bundled upstream rules library is included. Prepared app content is local after download; there is no PWA service worker. Browser storage can be unavailable under file URLs and is removed by clearing browser data.

## Checks

`npm run check` checks syntax. `npm test` checks imports, attachment preservation, point totals, source-aware reminder selection, corrected token scope, edition-specific sequencing, round transitions, flashcard grouping, leader-bound effects, navigation, persistence, safe rendering, and progress migration. App interaction tests use a minimal DOM adapter, not a browser.

`npm run bundle` rebuilds `warplanner.html` and `warplanner-source.zip`. Chromium checks cover the account gate, signup/reset modes, failed-login feedback and mobile width. Successful confirmation and recovery emails still require a real inbox check. Review real-device layout and source-linked community cards before relying on the app during a game.


## Hosting and accounts

Repository: https://github.com/mageekman/WarPlanner
Site: https://mageekman.github.io/WarPlanner/

This follows Command Ledger’s static GitHub Pages approach. Pages publishes the committed `docs/` directory from `main`. Source lives in `dist/`; `npm ci && npm run build` refreshes the published copy and vendors the exact Supabase SDK from the lockfile. Run `npm run check && npm test` before committing both source and built files. The public client configuration in `dist/config.js` contains only a publishable key; never put service-role keys or passwords there.

Supabase project: `zmhybqzodbpshpnnopvz` (WarPlanner). Email/password authentication supports sign-up confirmation, sign-in, persistent sessions, sign-out and password recovery. Configure Authentication → URL Configuration with Site URL and Redirect URL `https://mageekman.github.io/WarPlanner/`. Keep email confirmation enabled. Configure custom SMTP before broader use; Supabase’s default sender is limited. Authentication emails and successful confirmation/recovery need a real inbox check by the owner.

Account login unlocks the interface. GitHub Pages files and the repository remain public; private army lists are stored in Supabase's `saved_army_lists` table under the authenticated user ID. RLS permits only the owner to select, insert, update or delete a row. Original exports, units, labels and import warnings are stored with each list. The previous `account_armies` seed table remains read-only for compatibility, and its seed is copied into account list storage. Apply `supabase/schema.sql` followed by `supabase/account-list-storage.sql` and `supabase/immutable-upload.sql`, then `supabase/list-deletion.sql` when setting up a new database.

On sign-in/reload the account library is fetched from Supabase, including pagination. Existing account-scoped device lists are uploaded automatically; identical contents are deduplicated and differing legacy or concurrent versions are preserved as recovered copies. Updates use revision checks to prevent silent overwrites. A local copy remains as a recovery draft/cache; it is not the authority for lists already saved online. Failed saves show an error and Retry; sign-out waits for saves. Refresh once on each previously used device to migrate its lists. The app does not claim a device's unuploaded lists are already in the database.

Guide progress, display settings and active-list selection remain device-local. Changes made on another device appear on sign-in/reload; this release does not use Realtime subscriptions. Signing out clears the active roster from the interface. Hosted accounts never inherit the offline edition's shared `warplan.prototype.v1` key. The offline single-file bundle remains a separate, device-only personal-use edition.


## Saved-list library

My army opens account-specific saved lists. Existing single-army saves migrate into the library automatically. Importing appends a list, and opening a list makes it active for the guide. Each list retains its unit labels and original export when provided. Switching active lists starts a fresh walkthrough. Summary cards show roster, detachment and disposition rather than point values; the original export retains its point values verbatim when opened. The older starter roster has no original export, so its import panel explicitly shows the saved roster instead. Hosted lists, their imports and unit labels are saved to the signed-in Supabase account and load on other devices.


## Aeldari source expansion (v0.7)

The app now indexes the pinned source's 80 Aeldari datasheets, 16 detachments, 54 enhancements and 81 Stratagems (including Legends and Combat Patrol records). Saved lists select their own unit rules, detachment and actually imported enhancements. “Army & detachment rules” and each unit's reference section expose entries that have no safe phase mapping. Unit keywords extend Aspect Host membership, Deep Strike, vehicle manoeuvres and Fights First beyond the starter roster. Wraith units without Battle Focus are not given manoeuvre cards merely for being Aeldari.

This is **not a complete verified rules library**: 300 indexed records include 73 effect summaries and 227 reference-only entries; 97 records are explicitly provisional/approximate/stubs upstream. Timing and bearer gates are enforced where supplied, but reminders do not establish battlefield eligibility. Missing effects and mixed/unmapped triggers stay source-linked references. Eighteen new summaries were compared with the secondary export, including the one-model Tears of Isha heal and melee-only Malevolent Souls trigger. Official codex completeness and current errata remain unverified.

`docs/aeldari-coverage.json` records the counts and reference-only rules. `docs/aeldari-source.json` pins upstream file hashes. To reproduce the index, check out 40kdc-data at the specified commit and run `python scripts/import-aeldari.py /path/to/40kdc-data`, then `npm run build`. Hash mismatches abort the importer. Original rulebook descriptions, lore, weapon/profile tables and upstream tools are not bundled. The generated study index and independently written overrides are committed for review.


## List editor and on-site builder (v0.9)

Use **My army → Create list** to create an Aeldari roster without an upload, or **Edit list** on a saved list to edit its working roster. Search the 80-entry unit catalog by name; add independent squad entries, choose available model counts, configure equipment notes and tokens, select enhancements, and attach leaders using source-backed bodyguard choices. List names, detachments and dispositions are editable. The detachment checkbox picker supports multiple selections; the guide and enhancement picker use every selected detachment. Same-name enhancements identify their source detachment. Legacy single-detachment lists remain compatible, and imported source text stays unchanged. Disposition options show the source's detachment pairing as guidance; the editor does not validate complete army legality. The current unit picker covers Aeldari; other imported factions keep editable existing entries and metadata.

Edits are drafts until Save. Cancel leaves the saved list unchanged. Saving uses the existing account sync, retry and conflict-recovery behavior. Original uploaded export text is never rewritten by the editor and is protected by a database trigger. Older starter rosters without original text keep an immutable first-edit roster snapshot instead. Site-created rosters are identified as created in WarPlanner and do not invent an uploaded source. Editing the roster resets its guide walkthrough while retaining display preferences.


## Rules workshop (v0.11)

The signed-in administrator has a **Rules workshop** navigation entry. Search and edit existing rules, unit abilities, army/detachment rules, Stratagems, enhancements and core guide pages. Add factions (Space Marines/Imperium/Chaos/Xenos), detachments, units and rules with phase/turn/timing, eligible unit names, targets, conditions, study questions and source links. The database starts with 442 entries: 312 rule reminders, 80 units, 16 detachments, 33 core pages and the Aeldari faction.

Save writes to Supabase. The current browser updates its guide and builder immediately; other signed-in players load the catalog on sign-in or page reload. New factions and detachments become available in list creation, with units searchable by faction. Rule-to-unit associations populate roster references automatically. Existing saved lists and their original uploads are not rewritten. Roster matching uses names, so renaming a faction, unit or detachment does not migrate old lists.

Disable entries to retire them without deleting their history. Core guide pages cannot be disabled. Revision history loads an earlier version as a draft; saving creates a new revision. Revision comparisons reject stale writes from another tab, and failed saves retain the draft. Newly edited rule text is marked admin-maintained rather than automatically claiming official verification. Timing, equipment and leader conditions remain relevant; the editor is not a general rules simulator or roster legality validator.

`supabase/admin-content.sql` creates the server-managed singleton admin membership, shared catalog and edit history. The only administrator is the existing owner account verified during setup. Clients can read only their own membership and have no role-assignment permissions. Signed-in players can read content; database RLS restricts content writes and revision history to the administrator. An invoker trigger stamps identities/timestamps, increments revisions and records previous versions. History inserts require an active trigger, preventing direct API history writes. No privileged keys or administrator email checks appear in the frontend. Existing private army-list policies stay in place.

`node scripts/seed-catalog.cjs` generates idempotent SQL batches from bundled content; apply these using an authorized database-owner connection. The standalone offline bundle continues using the bundled catalog and has no admin controls. Automated content tests cover rule propagation, timing changes, faction isolation, custom enhancements, revision conflicts and validation; browser checks cover the full owner workflow, non-admin gating, mobile layout and draft recovery. Database permission checks are run separately under the real authenticated and anonymous Postgres roles, with test writes rolled back.


## Editable guide priorities and unit flags (v0.12)

In **Rules workshop**, open a rule or unit and expand **Guide order & badges**. Choose early, normal or late order, rank within that group (1 first, 99 last), phases, player turn, optional badge text and an explanation. Default labels follow the phase, e.g. Move early or Shoot late. Rules of any category support these hints. Detachment and faction settings provide defaults when a rule has no explicit guide settings. Unit cards derive hints from their own record and their applicable abilities; shared rule cards retain their own hints. Early suggestions win when several applicable hints disagree, and late hints apply when there is no early suggestion. Sorting is within shared cards and within unit cards; the core phase sequence and actual rule triggers stay unchanged.

War Walkers, Shroud Runners and Falcon retain their previous early-shooting defaults, now visible and editable in their unit records. Selecting normal clears that unit's default. Custom badges are phase/turn-scoped reminders, such as Deep Strike, Keep in aura or Once per battle; they do not grant or simulate those rules. Explicit unit hints or badges keep an otherwise shared-only unit visible once in the main activation page.

Unit records also offer **Fights First**: automatic from current rules, has Fights First, or does not have Fights First. This override applies to that datasheet's models. Every member of an attached unit must still qualify for the unqualified Fights First badge. An explicitly flagged datasheet with a nonqualifying attachment shows a check-attachments reminder instead. Existing leader-dependent automatic cases remain conditional.

Hints and flags live in the existing catalog JSON, use the same owner-only write policies, revision history and conflict handling, and reload across devices. Saved army uploads remain untouched. The content loader preserves equipment restrictions and avoids turning a conditional Fights First reminder into an unconditional ability reference.


## Saved-list deletion and reference browsing (v0.13)

**My army** offers Delete on each saved list and Delete list inside a list. A confirmation names the list and explains that deletion cannot be undone. The app waits for the account request to succeed before removing the list; failed requests keep it visible for retry. Deleting the active list resets the guide and selects another saved roster. Deleting the final list leaves an empty library and guide setup without restoring the starter roster. The offline prototype deletes only its local copy.

`supabase/list-deletion.sql` grants owner-only DELETE on `saved_army_lists`. A deletion removes that row's roster, labels and original-upload payload. A separate RLS-protected `deleted_army_lists` table retains only the owner, list ID and deletion time. Invoker triggers record those IDs and reject attempts to reuse them, including recovery-ID inserts from older clients. Identity locks serialize deletion with ID reuse. Clients cannot write deletion records directly or remove them. Local cache migration and stale saves respect deleted IDs; intentionally importing the same roster under a new ID is allowed. Other devices see account deletions when they reload, and stale edits are removed instead of being restored as recovered copies. Browser tests use mocked Auth/REST; real database tests verify owner deletion, cross-account denial, deletion-ID protections and legacy recovery rejection with all test writes rolled back.

In **Rules workshop → Rules & abilities**, use **Reference status → Reference only** to find entries awaiting a complete study summary, including entries with no phase mapping. All rules and Other rules remain available. Reference entries are labeled in the browser and editor, searchable by name/faction/detachment or summary, and remain editable. Changing the reference checkbox refreshes the filtered results after saving. This filter surfaces the stored summaries and references; it does not fetch missing full rulebook text.

Expanded shared-rule cards show eligibility once, in the header preview; the body focuses on timing, effects and optional conditions/sources. Shared abilities with a unit-list preview still expand to show the full eligible-unit list.

In the guide settings gear, turn off **Show preview info** to show only card names and badges when collapsed. Expanded cards still include their full details; shared-rule eligibility moves into the expanded body while previews are hidden. The setting persists alongside font size in this account’s browser preferences, and toggling it preserves open cards and the current page.


## Rules/source imports (v0.15)

Open **Rules workshop → Import source files**. Choose a faction (and the group if adding a new faction), add source files, then **Build import preview**. File selection and parsing make no database changes. Multiple file selections accumulate, so core and enrichment files can be selected from separate folders.

Supported inputs:

- **40kdc JSON:** extract the GitHub ZIP first. Add a faction's `abilities.json`, `phase-mappings.json` and core `units.json`, `detachments.json`, `factions.json`, `enhancements.json`, `stratagems.json`, `leader-attachments.json` and `unit-compositions.json` as available. Folder selection accepts the supported tables and reports other tables as skipped. Source abilities resolve unit IDs and existing rule aliases; structured effects get a readable mechanics view, with raw JSON retained for inspection, instead of being treated as complete rulebook prose. Unresolved unit eligibility does not become a blanket army activation.
- **Wahapedia CSV:** add `Factions.csv`, `Datasheets.csv`, `Abilities.csv` and `Datasheets_abilities.csv` together to resolve faction IDs and unit associations. `Detachments.csv`, `Detachment_abilities.csv`, `Enhancements.csv`, `Stratagems.csv`, `Datasheets_keywords.csv` and `Datasheets_leader.csv` are supported too. BOMs, pipe/comma/semicolon/tab delimiters, quoted multiline cells and doubled quotes are handled. HTML is converted to plain text; uploaded markup is never executed. Unrelated faction records are excluded, and neutral scenario-specific Stratagems are excluded unless marked Core. New CSV units default to one model until their settings are reviewed.
- **WarPlanner JSON:** export a catalog backup from the import page, or download the editable JSON template. Backups preserve the catalog format and settings. PDFs, ZIPs and executable JavaScript files are not parsed.

The preview shows matches, proposed text, changed fields, raw source details and validation errors. Source imports default to **Add** for new entries and **Source details only** for matches, preserving existing summaries, timing, guide flags, model counts and attachments. **Replace content** is an explicit per-entry choice; backup matches default to Skip. Conflicting duplicate or ambiguous matches are excluded for manual attention. Source entries start as reference-only and do not claim official verification. Imported source text and structured records remain available under **Imported source details** in the editor, including after subsequent manual edits.

Inputs are limited to 300 files / 20 MB and previews to 2,000 entries. Save up to 1,000 selected entries in one transaction (8 MB maximum). The preview reloads current revisions; server-side revision checks reject conflicts and roll back the whole batch. Rebuild the preview to resolve a conflict. Failed requests retain the preview. Existing revision history records updates, and repeat source imports default to Skip when their source record is unchanged. Imports never rewrite saved army lists.

Apply `supabase/catalog-import.sql` to enable the `import_rules_catalog` RPC. It runs as SECURITY INVOKER, checks the existing singleton admin membership and uses the catalog's RLS and history trigger. Only the administrator can import. No privileged key is used in the browser. Database tests verify owner success, conflict rollback and non-admin rejection with test writes rolled back. Parser tests and browser checks cover source files, preservation, previews, retries, export and mobile layout.


## Concise imported rules (v0.17)

Imported JSON effects now use short player instructions in guide cards, workshop summaries and import previews. Recognized effects preserve their targets, conditions, timing, limits and meaningful durations. Hallowed Ground separates its reroll benefit from qualifying areas; Crowe's leading bonus and Foesight each fit in one sentence. Default permanent duration and internal schema labels stay out of the main description.

The original mechanics breakdown remains collapsed under Conditions & sources → Imported mechanics details. Unrecognized structures ask for a checked summary rather than presenting technical fields as instructions. The Grey Knights sample has 56 automatically summarized records out of 134; eleven records have no effect mechanics encoded. Generated summaries remain reference material pending verification. A missing effect means missing source information, not that an ability does nothing.

Existing importer placeholders and untouched summaries generated by v0.16 update on refresh without reuploading or rewriting the database. Imported prose is preferred when available. Custom summaries, guide placement, verification flags and original source records are preserved. Saving the workshop editor remains an explicit catalog edit.

Regression fixtures include four structured Grey Knights records from the 40kdc source credited in CREDITS.md. Tests cover complete Hallowed Ground eligibility and timing, changed source conditions, model-versus-unit scope, weapon restrictions and preservation of custom notes.

## Grey Knights summary coverage (v0.18)

The initial v0.17 translator covered 56 of 134 Grey Knights source records. An additional 63 independently written, source-derived notes now cover Narthecium, both Strike Squad objective rules, Combat Squad, transport abilities, dice tables and other structured effects. These notes are study interpretations, not officially verified rules. Each is bound to the complete source mechanics, restrictions, scope and timing; changed or unknown mechanical fields invalidate it even if the source digest stays the same. Genuine manual workshop text still takes precedence.

The inspected Grey Knights sample now has 119 available summaries, 11 empty effect records and four unresolved source ambiguities: Haloed in Soulfire, Force Wave, Responsive Displacement and Vigilance of Titan. Those four explain the specific source problem in their cards. Missing data cannot supply a rule summary; check a current rules source and write the reminder in the workshop.

In Rules workshop, choose Rules & abilities, then use **Summary coverage → Needs summary** or **Missing source mechanics**. Search for a rule, edit **Rule text / study summary**, check its timing and eligibility, and **Save to database**. Use Reference status independently to include reference-only entries. Source-only imports preserve your wording; explicit replacement imports replace it. Merely reading generated summaries never rewrites the catalog or player lists. Saving a previously generated fallback no longer prevents that fallback from updating automatically.

The complete Grey Knights structured fixture is retained in tests for coverage checks. Production notes contain only the source snapshots needed to invalidate stale interpretations. Attribution: CREDITS.md and LICENSE-40KDC-DATA.txt.

Catalog loading now fetches consecutive 500-entry pages until complete. A regression test covers 1,001 entries and confirms a failed later page does not replace the last complete catalog.

## Workshop faction folders (v0.19)

The Rules workshop uses four columns: Factions → Content groups → Entries → Editor. Factions are grouped by Space Marines, Imperium, Chaos and Xenos, then sorted alphabetically. All content provides global browsing; Shared / core holds common rules and guide pages. Select Grey Knights → Detachments to browse that faction's detachments, then select a detachment to edit it on the right. Units and detachments include links to their editable rules. Path buttons return to earlier levels or the current editor.

Each faction has folders for faction details, units, detachments, army/detachment rules, abilities, Stratagems, enhancements and all rules. Search and reference/summary filters operate within the selected folder. Empty folders remain available for new content. New entries inherit the selected faction; new rules opened from a unit or detachment inherit that relationship. Existing content is never moved or rewritten by browsing.

On screens up to 900px, one column appears at a time. The path bar switches levels and retains the current unsaved form. Choosing different content still prompts before discarding edits. Save, import, revision history and database authorization use the existing services. Browser checks cover faction isolation, related rules, scoped filters, new-entry defaults, saved edits, unsaved-change protection, desktop columns and mobile navigation.

## Adeptus Mechanicus study summaries (v0.20)

Inspected the 167 rules already imported into the shared catalog. Added 119 independently written study notes, alongside the 21 existing automatic translations: 140 usable summaries, 16 records with no encoded effect and 11 records with specific source issues. The additions cover Doctrina Imperatives (standard and Purge Corps), Battle Protocols, Canticles, Rad-bombardment, objective rules, transport support, weapon-specific bonuses and Battleline upgrades.

Exact mechanics snapshots bind every note and issue explanation to its source, including targets, timing, duration, restrictions and unknown fields. Source changes invalidate stale interpretations even if the digest is unchanged. Existing workshop text and reference-only status remain intact. This release changes presentation without rewriting the user's imported catalog or saved lists.

The unresolved source records are Chant of Electrotraction, Cyber-static Canticles, Electro-shock, Guided Retreat, Noospheric Recon, Noospheric Transference, Omnissiah’s Blessing, Overloaded Safeguards, Repolarised Augurs, Scuttling Walker and Shroud Protocols. Their cards explain missing timing, contradictory targets, undefined mechanics or incomplete restrictions. Use Adeptus Mechanicus → All rules & abilities → Filter rules → Summary coverage in the workshop to find these or the empty effect records. They require a current rules reference and a manually checked description.

Regression tests retain the full structured source fixture and cover all 167 entries, mechanics changes, Battleline/weapon scope, round/phase differences, dice thresholds, limited uses, custom notes and source issues. Browser checks use copies of the imported catalog with mocked Auth/REST responses and verify workshop filters, the guide, mobile layout and manual override saving. Attribution: CREDITS.md and LICENSE-40KDC-DATA.txt. These source-derived study interpretations are not official rules verification.

## Aeldari description audit (v0.21)

Audited the 312 Aeldari catalog entries against the pinned 40kdc mechanics and core Stratagem restrictions, keeping existing independently reviewed notes and saved workshop edits. The older built-in index had 198 generic reference prompts and terse mechanical translations. The audited view has 255 usable descriptions (196 rewritten or expanded), 25 missing effect records and 32 specific source issues. Three saved admin entries remain untouched. See AUDIT-AELDARI.md for findings and unresolved records.

The Aeldari catalog predates the JSON source importer, so its rows have no importSource field. A presentation adapter upgrades only an exact match to the original bundled payload; every saved text, timing, guide hint, restriction, digest or unknown extra field takes precedence. Each upgraded view exposes the pinned source and mechanics under Conditions & sources and in the workshop. Viewing never rewrites database content, revisions or saved armies. Saving the workshop form persists the user's summary normally. Placeholder-only rows are classified as needing a summary even if no source is attached.

Existing reference/provisional flags stay intact. Three older Aspect Host reminder cards now explicitly use source-reference status: Warrior Focus has a source-derived effect; Doom Inescapable and Preternatural Precision have no encoded effect. This audit does not promote community data to official verification or change phase placement and activation ordering. The earlier aeldari-coverage.json describes the original index; the current presentation audit is reported in AUDIT-AELDARI.md.

Regression checks cover every entry, preservation of arbitrary saved changes, timing, model/unit and leader scope, source conflicts, core Stratagem restrictions, existing reviewed summaries and inspectable source details. Browser tests use copies of the current catalog with mocked Auth/REST responses, including the three existing edited entries, and verify filters, guide reminders, mobile layout and saving custom wording.

## Compact guide explanations (v0.22)

Guide headings have an info button instead of a permanent explanation paragraph. The native popover shows the original step text, closes with ×, outside click/tap or Escape, and restores keyboard focus to its opener. Its position stays within the viewport; resizing and page navigation dismiss it. The popup lives outside the animated slide so carousel previews cannot duplicate it, and swipes while reading it do not change pages.

Army content displays directly in a labelled section, without the outer “Your army at this step/phase” dropdown or introductory caption. Individual unit and shared-rule cards remain collapsible. Steps with no matched abilities retain an explicit empty message. Desktop/mobile browser checks cover opening, dismissal, focus, viewport fit, automatic army content and carousel navigation.

## Workshop unit stat fields (v0.23)

Admin unit editors have individual fields for Movement, Toughness, Save, Wounds, Leadership, Objective Control and invulnerable save, grouped into named profiles. Open Rules workshop → Faction → Units → Unit. Imported `importSource.record.profiles` values prefill the editor when no saved profiles exist. Units without profiles show blank fields; no stats are guessed or fetched automatically. Add/remove profiles for mixed model types.

Save stores optional `data.profiles` in the existing catalog JSON through the existing admin-authorized save and revision history service. Saved profiles take precedence over the raw source, including an explicitly empty array after removing all profiles. Original imported records remain unchanged; source-only reimports preserve edited stats. Numbers, inch/target-number suffixes, zero Objective Control, blank values, dice expressions and source placeholders are handled explicitly. Validation errors retain edited values so they can be corrected.

The new stat fields render only in the admin workshop. No stat profiles are added to the guide, My Army or other player-facing views. This is a presentation restriction: existing authenticated catalog access is unchanged. No schema migration, bulk data rewrite or army-list update is required. Tests cover source/manual precedence, multiple profiles, validation and reimports; mocked browser checks cover prefills, save/reload, removal, missing values, mobile layout and non-admin UI exclusion.


## Player reports and admin review (v0.24)

Each active guide page has a collapsed **Report an incorrect or missing rule** section immediately above **Rules reference & review**. Its dropdown contains the current page’s unique units, abilities and core page, plus **Something is missing**. Players select Rules Summary, Timing, Targets or Something else and provide their proposed change. Timing offers window, phase and turn selections; missing-rule reports ask for a name and proposed text. Reports are stored against the signed-in account in Supabase, with the observed catalog revision and minimal guide context. No army export or email is included. In-memory drafts survive guide navigation; failed requests retain the draft, and an unchanged retry uses the same request ID.

The sole existing administrator sees a pending-count badge on Rules workshop and a collapsible **Submitted reports** queue. It refreshes on sign-in, window focus and every 30 seconds while visible, with a manual Refresh option. Pending and reviewed views retain the report and resolution. **Approve** applies a summary, target or timing proposal; **Edit** loads a proposal in the regular editor and changes Save to **Approve and apply**; **Reject** closes the report without changing the catalog. Unit reports, Something else, missing rules and entries changed since submission require Edit to confirm exact fields. New missing rules begin as reference-only drafts with no active phases until scope/timing are confirmed.

Apply `supabase/rule-reports.sql` after `supabase/admin-content.sql`. Report submission and review RPCs run with caller permissions under RLS. Players can submit and read only their own reports; only the existing admin can read the queue or review. Approval updates the catalog and resolves the report in one transaction; the existing catalog history trigger preserves the previous full iteration. Revision checks reject stale edits, failed proposals roll back, and repeated identical submissions/reviews do not duplicate writes. No role-assignment or privileged browser keys are added.

Verification: proposal/context and service tests run in `npm test`; `tests/rule-reports.sql` checks real database permissions, idempotency, approval/history, stale edits, rollback, rejection and missing-rule creation inside a transaction that rolls back all fixtures. Browser QA with mocked Auth/REST covers ordinary-player submissions, timing/missing fields, mobile layout, lost-response retries, admin badge, direct and edited approvals, pending-only report dismissal and rejection.


## Generated recall practice (v0.25)

Practice now offers faction selection, Mixed / Match the rule / Unit stats / Unit abilities, and sets of 5, 10 or 20 questions. Each question has four shuffled answers, locks after selection, reveals the correct answer and catalog explanation, and contributes to the current set’s score. Finished sets offer a missed-question review and another randomized set. Sessions stay in memory across app navigation and clear on account load/sign-out; scores are not persisted or treated as account records. Existing guide and army views do not display unit stat profiles.

Question generation lives in `dist/practice.js`, separate from presentation in `dist/practice-ui.js`:

- Rule matching selects a readable rule summary and three different rule names in the same category and explicitly assigned faction. Identical descriptions, duplicate answer names and incomplete summaries are excluded. The correct rule’s name is masked when it appears in the clue. Detachment names qualify answer labels.
- Unit ability questions ask which ability is listed for a unit. Ownership uses explicit unit matching or ability/source-ID references. Distractors share the category and exclude every known ability of that unit, duplicate names and equivalent descriptions. Conditions are retained in the revealed explanation.
- Unit stat questions ask for a named unit/profile characteristic. Values come from workshop profiles, with imported profiles as fallback, using the same precedence as the editor. Three distinct incorrect values come from that same characteristic in other profiles in the faction. Unknown values are skipped; a field needs four distinct known answers. Ambiguous duplicate profile names are skipped. There are no guessed/generated stat values.
- Mixed sets choose randomly among available question types, then draw unused questions within each type. Sets shorten when the eligible pool is smaller than the requested length. Sparse modes disable Start and explain why more catalog data is needed.

The practice bank uses the current loaded catalog, so existing imports and workshop edits supply its material without a separate quiz database or schema changes. The pinned Aeldari seed currently supplies rule and unit ability questions but no unit stat profiles. Imported factions with sufficient known profiles can supply stat questions immediately.

Automated tests cover category/faction matching, unique answers, equivalent-description exclusion, unit ownership/aliases, profile precedence, source rendering, sparse data, randomized sessions and one-time scoring. Mocked browser checks cover setup, full sets, feedback/results, missing-data handling, imported Mechanicus stats, unit abilities, mobile/desktop layouts, navigation and account-session reset.


Practice faction isolation (v0.25.1): Questions, correct answers, distractors and unit profiles must all carry the selected faction. Shared/unassigned entries are excluded instead of being assigned an implicit faction. Session construction also rejects questions or answer sets with mismatched faction metadata. Starting practice reads the submitted faction selection directly; sparse factions never borrow alternatives from another faction. The standalone Aeldari prototype supplies its known faction explicitly before building a bank. Regression tests mix Aeldari, Grey Knights, Adeptus Mechanicus, shared and unassigned records across all practice modes.


## Guide cards in practice results (v0.26)

After an answer is selected, Practice reveals the correct rule using the guide’s card layout, with category badges, full study text, targets, timing, conditions and expandable source references. Cards start expanded and can be collapsed. Unit ability questions show the named unit with the tested ability inside it. Rule-description questions with one or two known unit owners also use unit cards; shared abilities with more owners keep one rule card with their unit list. Army/detachment rules, stratagems and enhancements retain their own rule cards. Reference-only entries do not turn broad coverage phases into an activation timing claim.

Stat questions reveal the unit card and the selected named profile, including all seven profile fields. The tested characteristic is highlighted; unknown values stay unknown. These profile cards appear only in Practice results, with guide and army stat presentation unchanged. Missed-question reviews use the same cards. Answer cards are absent before selection.

Question data includes a compact snapshot of the relevant rule, unit and selected profile, so a later catalog edit cannot change the explanation or grading of an already-generated question. Raw imported records are excluded from the snapshot. `dist/study-cards.js` supplies the unit-card shell shared by the guide and practice, and the read-only practice reference renderer. Existing source and condition details remain expandable. Tests cover correct unit/rule association, selected profiles, immutable snapshots, shared rules, escaped content/URLs and the shared shell’s collapsed/expanded behavior. Browser checks cover hidden-before-answer behavior, unit nesting, expanded/collapsible cards, highlighted stats, missed-question reviews and mobile layout.


## Space Marines faction group (v0.26.1)

The primary faction group order is Space Marines → Imperium → Chaos → Xenos, followed by Other for unclassified entries. The workshop faction browser, guide list selector, practice selector, faction editor and import group selector all support the new group. Space Marines is an editable group value; factions remain alphabetical within their groups. Only the existing Space Marines faction moves out of Imperium. Other factions, including Grey Knights, keep their current group.

After deploying frontend support, `supabase/space-marines-group.sql` moves that one existing faction through the normal administrator permissions and catalog history trigger. It changes only `data.group`, preserves imported source records and names/IDs, and is idempotent. No schema, role or saved-list changes are needed. Future chapter factions can be assigned to the group in the workshop.


## Deathwatch catalog copies

`supabase/duplicate-deathwatch-content.sql` duplicates the 10 Deathwatch-specific units stored under Space Marines into the existing Deathwatch faction: five Kill Teams (Decimus, Fortis, Indomitor, Spectrus and Talonstrike), Deathwatch Veterans, Deathwatch Terminator Squad, Watch Master, Watch Captain Artemis and Corvus Blackstar. It also copies Deathwatch Support. Existing Deathwatch rules are reused by their IDs.

Copies receive unique `-deathwatch` IDs and record their source catalog key/revision in `data.duplicatedFrom`. Leader bodyguard IDs point at the copied units. Stats, equipment, ability references, enablement and raw import records are preserved. Original and pre-existing destination records stay intact. The operation uses existing admin RLS, runs atomically, checks references and skips existing destination copies on reruns. A source selection or ID collision that needs review aborts the transaction.

Verified against the live catalog: 10 units and one detachment added; all 68 pre-existing relevant entries matched their before snapshots. The Deathwatch folder contains 10 units, 17 detachments and its existing 40 rules after the operation. A rolled-back database trial, application catalog validation, profile comparisons, attachment/link checks and a mocked browser check with the updated live data passed.


## Identify a unit by its ability (v0.27)

Practice adds **Which unit has this ability?** alongside the existing types. It presents an ability’s name and description with four unique unit names from the selected faction. A randomly chosen known owner is the correct answer; other owners are excluded from distractors, including ownership found through duplicate records, matching ability names/descriptions, imported source aliases and alternate core/ability classifications. Abilities without three eligible non-owner units are skipped. Explicit owner names are masked in the description; abilities whose name directly gives away the owner are skipped.

After selection, the existing guide-style unit card reveals the correct unit and full original ability, conditions and sources. The new type participates in Mixed practice and the standard scoring/missed-question review. Counts and session pools include the new type; faction isolation and existing answer-card behavior are retained. No catalog or database changes are required. Tests cover valid owners, source aliases, shared rules, ambiguous duplicate records, clue masking, sparse data and same-faction unit answers.


## Saved-list practice and custom question mixes (v0.28)

Practice offers **Whole faction** or **My saved army list** as quiz content. The list selector uses the signed-in account’s existing saved-list library; its management button opens My army for importing or creating lists. Choosing a practice list does not switch the active guide army, edit the saved roster or create another stored copy. Quiz questions and answer choices are limited to the list’s unique unit types and applicable unit/faction rules, selected detachments and equipped enhancements. Imported detachment IDs are resolved through catalog metadata. Missing unit data is identified, and sparse lists never borrow choices from outside the selected list.

Four question-type checkboxes replace the single dropdown. Select one type, any combination, or use Select all / Clear. Sessions draw a shuffled round from each available checked type before starting another round, giving a balanced custom mix without repeated questions. Unavailable types are explicitly noted and skipped; no selected types or no valid questions disables Start. Existing single-mode session API calls remain supported.

List and question-type choices stay in session memory and clear at account reset/sign-out. A generated quiz retains its list label and immutable question snapshots; deleted/unavailable lists produce an empty list scope rather than falling back to whole-faction material. Results and guide-style answer cards are retained. **New practice set** is now an outlined button at the top right, including on mobile.

Model tests cover roster-only unit/rule/stat choices, duplicate squads, detachment/enhancement filtering, imported detachment IDs, empty/wrong-faction/missing data, custom type validation and balanced mixes. Browser QA covers account-scoped list choices, checkbox focus and selection, an end-to-end two-type list quiz, scoring and answer cards, sparse-list safeguards, saved-army immutability, and mobile/desktop button placement. No database/schema changes or new storage are required.


Practice answer reports: after an answer is revealed, **Are we wrong?** appears below Next question / See results. It opens the existing report form with the correct answer’s rule or unit preselected, plus related displayed entries and Something is missing. Stat and unit-identification reports default to Something else for manual unit-editor review. Reports preserve the quiz’s displayed summary or selected profile facts, identify the practice question, and omit the saved list name/export. If the loaded rule has changed since question creation, direct approval is disabled in favor of Edit. Submission, retry handling, account permissions, the admin notification badge and the existing Approve/Edit/Reject queue are shared with guide reports. The accordion retains its open state while changing fields. No new report endpoint or schema is needed.

## Tyranids import repair (v0.28.1)

The importer resolves the historical `Tyranid` spelling to upstream `Tyranids`, recognizes registered source IDs, and rejects mismatched faction metadata. Folder imports scope every source table, including phase mappings and attachments, to its faction directory. Foreign factionless enhancements and stratagems are excluded with a warning. Wrapped JSON retains its original folder. Direct import-key matches are faction-scoped. Existing curated entries still default to provenance-only updates.

`scripts/repair-tyranids.cjs` generates a revision-checked repair from a full catalog snapshot and the nine Tyranids core/enrichment files pinned at `wn-mitch/40kdc-data@6ea813f7706bc9a492026d8b4403af99a965162b`. It requires the original unedited revision-one records, validates references and profiles, and produces a single transaction using the existing admin-only import RPC. It does not connect to the database itself. The repair preserves stable IDs, renames the faction to Tyranids with Tyranid as an alias, restores 57 units with profiles, 11 detachments and 186 rules, and disables four foreign entries. Existing revisions remain in catalog history; account army lists and original uploads are untouched. Generated SQL/snapshots are operational artifacts and are not bundled into the public site.

Practice and guide reporting resolve the legacy faction alias. Source-derived summaries remain subject to the existing completeness checks: unresolved mechanics stay reference material rather than becoming quiz answers. Regression tests cover spelling, source IDs, mixed folders, wrapper paths, mismatched faction metadata, cross-faction key matches and legacy guide reports.

## Chaos Space Marines audit (v0.28.2)

The first faction-wide catalog pass rewrites all 281 native Chaos Space Marines entries: 231 concise study descriptions, 28 specific source problems and 22 missing effects. It disables 94 foreign-faction copies without deleting them. Original source records, reference status and prior revisions remain intact. Core Stratagem restrictions supply eligibility, exclusions and selection counts. Corrected phase placement includes Dark Pacts at shooting/fighting selection; Warp Tracer receives an early-shooting hint. See `AUDIT-CHAOS-SPACE-MARINES.md` for the remaining source issues.

`node scripts/audit-csm.cjs BEFORE_CATALOG_JSON OUTPUT_PREFIX` generates the reviewed update and SQL without applying it. The script compares every existing rule against the audit snapshot and uses the existing revision-checked admin import RPC, preserving history and rejecting concurrent edits. No schema or account-list changes are made. The summaries are persisted in the catalog; future manual workshop text and approved summary reports clear stale summary-coverage markers. Source snapshots and authored study notes have regression coverage for beneficiaries, limits, choices, targets, timing, source conflicts, practice exclusions and guide placement.

## Tyranids descriptions and multi-detachment text imports (v0.28.3)

All 186 native Tyranids descriptions are audited and persisted: 147 concise summaries, 26 specific source conflicts and 13 missing effects. Generic reference prompts are replaced with useful text or a concrete source gap; unresolved rules stay out of quiz pools. Core Stratagem metadata preserves alternative target modes and eligibility. Guide placement and early-shooting hints are corrected without changing resolution triggers. Unit stats, source records, prior reference status, disabled foreign copies and account rosters remain intact. See `AUDIT-TYRANIDS.md`. `node scripts/audit-tyranids.cjs BEFORE_CATALOG_JSON OUTPUT_PREFIX` generates the source-bound, revision-checked update through the existing admin import RPC. It does not connect or apply SQL itself.

40k app text imports split combined detachment lines into individually selected existing faction entries, including separate point annotations and common separators. Canonical matching handles case and punctuation and preserves exact names containing separators. Unknown names remain reviewable with a warning rather than matching another faction. Metadata scanning ends at the first unit, allowing multiple detachment header lines without confusing the disposition or attached-unit headers. The raw upload remains verbatim. Older combined names resolve in the editor, guide and saved-list practice; saving an edit persists the separate names. Custom names are retained when they cannot be safely split against the existing catalog. No private-list database migration is performed.

## Aeldari current-import refresh (v0.28.4)

Reimported turn/bearer metadata changed the exact payloads bound to the earlier Aeldari presentation audit. The strict adapter remains unchanged. `scripts/refresh-aeldari.cjs` validates the current mechanics against the pinned snapshot and supplemental core metadata, accounts for two already-reviewed source corrections, preserves all 11 manually edited rows, and generates revision-checked updates for 301 remaining rules. Reviewed descriptions are saved directly in Supabase, with the original source records retained. All 312 entries now have 258 usable descriptions, 32 specific source issues and 22 missing effects; no generic prompts remain. Generic target previews and stale recall answers are refreshed too. Unit stats, guide hints, timings, detachments, faction metadata and account lists are untouched. See `AUDIT-AELDARI.md`.

## Pending report queue and rendering performance (v0.28.5)

The workshop shows pending reports only. Successful Approve, Edit → Approve, and Reject remove the report immediately and update the navigation badge. The Reviewed selector is removed; resolved records and catalog revisions remain in the database for audit purposes. Failed reviews remain visible for retry. Confirmed approvals stay dismissed even if the following catalog refresh fails, with a refresh notice instead of another pending approval. Polls cannot start during a review, and older pending responses cannot restore resolved reports.

Catalog application now indexes rule links by canonical faction and normalized unit name, preserving existing references and rule order. This replaces repeated full-rule scans for every unit. With the current 3,060-entry catalog, local before/after checks produced identical catalog/rule/step output: approximately 3.0–3.2 seconds before, 0.3–0.5 seconds after. These are catalog-processing measurements rather than total network/page-load timings.

Practice setup retains one session-memory bank while only quiz types or question count change. Content generation, source-array replacement, faction/list changes, any roster edit and account reset invalidate it. Starting a quiz or Another set always rebuilds fresh randomized material. Setup rendering measured roughly 270–530 ms repeatedly before, under 1 ms on cache hits after; the initial calculation remains necessary. Caching is disabled for legacy/standalone contexts without a catalog generation. No additional browser storage, database/schema changes, report deletions or rule-data changes are introduced.

Regression checks cover pending-only rendering, direct/edited approvals, rejection, retry, catalog-refresh failures, polling races, reference equivalence, aliases, cache invalidation and new-quiz randomization. Browser checks exercise the existing player report form, admin approval/editor/rejection flow, refresh persistence, imports, working-list edits, guide cards and mixed practice.

## Space Marines and all available chapters (catalog audit, 2026-11-14)

The live catalog now has reviewed study summaries or explicit source issues for all 640 unique Space Marine/chapter source abilities. Blood Angels and Dark Angels have their missing units and profiles; all eleven supplied chapters have their own faction folders, shared parent units/rules, detachments and faction-scoped quizzes. Original uploads and account lists are unchanged. Incomplete or contradictory effects remain outside quiz answer pools and retain their imported reference status.

See [AUDIT-SPACE-MARINES.md](AUDIT-SPACE-MARINES.md) for coverage, source limits and the guarded one-time audit script.

## Custodes readiness audit (2026-11-15)

The live Adeptus Custodes catalog has descriptions and guide timing for all 158
rules, covering 39 datasheets and 16 detachments. Of these, 116 have usable
source-based study summaries; 41 identify specific source conflicts or incomplete
conditions, and Fearless and Unrelenting remains an empty provisional stub.
Unresolved entries are visible in Workshop summary-coverage filters and excluded
from practice questions. See [AUDIT-CUSTODES.md](AUDIT-CUSTODES.md) for the review
list and revision-checked repair workflow. Imported sources, stat profiles,
reference flags and saved lists are preserved.

## Orks readiness audit (2026-11-14)

Audited all 209 Orks rules across 60 units, 69 stat profiles and 16 detachments. There are 148 usable study summaries, 59 specific source issues and two empty Psyker records. Waaagh! remains explicitly provisional, and Try Dat Button retains its source-conflict warning. Bomb Squig variants keep their distinct one/two-use allowances. Unresolved entries stay out of practice; original sources, flags, memberships and saved lists are preserved. See [AUDIT-ORKS.md](AUDIT-ORKS.md).

## T’au Empire readiness audit (2026-11-15)

Audited all 166 T’au rules across 47 units, 48 stat profiles and eight detachments: 82 usable study summaries, 81 specific source issues and three empty records. For the Greater Good remains in source review; Farsight’s unrelated Necron ability gate and provisional detachment/drone records are explicit. Unresolved entries stay out of practice. Sources, memberships, review flags and saved lists are preserved. See [AUDIT-TAU.md](AUDIT-TAU.md).

## Astra Militarum readiness audit (2026-11-15)

Audited all 251 rules across 75 units, 84 source-matching stat profiles and 12 detachments: 132 usable summaries, 105 source issues and 14 empty records. Orders retain the full menu and officer-specific limits, with Voice of Command timing conflicts explicit. The saved faction edit, original imports, unit identities, flags and lists are preserved. Unresolved entries stay out of practice. See [AUDIT-ASTRA-MILITARUM.md](AUDIT-ASTRA-MILITARUM.md).

## Chaos Daemons readiness audit (2026-11-15)

Audited all 195 rules across 53 units, 54 source-matching stat profiles and nine detachments: 94 usable summaries, 84 source issues and 17 empty records. Shadow of Chaos now appears for Poxbringer-only lists; its original import remains intact. Shadow timing/recovery, Flux tokens and Horror Split differences stay flagged for review. Unresolved entries remain outside practice; other memberships, IDs, flags and saved lists are preserved. See [AUDIT-CHAOS-DAEMONS.md](AUDIT-CHAOS-DAEMONS.md).

## Death Guard readiness audit (2026-11-15)

Audited all 160 rules across 41 source-matching units/profiles and ten detachments: 86 usable summaries, 60 source issues and 14 empty records. Nurgle’s Gift retains its full menu, cap and distinct ordinary/Maggot Lords scopes. Mortarion reactions, resurrection limits and afflicted-state gaps stay explicit. Original sources, memberships, IDs, flags and saved lists are preserved; unresolved entries stay outside practice. See [AUDIT-DEATH-GUARD.md](AUDIT-DEATH-GUARD.md).
