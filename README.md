# WarPlanner — personal study edition, v0.20

A phone-friendly study companion for your 11th-edition Aeldari roster. The walkthrough teaches explicit core timing windows and offers roster-specific reminders. It is not a game-state tracker or a rules judge.

## Open

Open `warplanner.html` in a modern browser. No build or installation needed. For account login, run `npm ci && npm run build`, serve `docs/` over HTTP, and configure the local redirect in Supabase. Optional Google Fonts fall back to system fonts without a connection. For consistent browser storage, serve the folder with `python -m http.server 8000 --directory dist` and use the same origin each time.

## Flashcard phase reference

The action part of each phase is a visible board of relevant cards. Short headings identify the timing window (Start of Turn, Start of Movement, End of Shooting). The guide opens with a Start page: select a saved list and the first player, then press Start. Lists are grouped as Imperium, Chaos, Xenos (unclassified factions follow under Other) and sorted by faction and list name inside each group. Edition and content-coverage notes live below the Start button. During the walkthrough, the turn toggle and phase tabs remain fixed above an internally scrolling page. A small settings gear at the top right returns to setup to reset the guide or choose another army. Its Small, Medium and Large font options adjust guide content; Medium retains the original typography. The choice persists per account on this device and survives guide resets. Only Core Rules and the content below it move. Plain SVG arrows sit at the midpoint of full-height edge controls inside the guide frame. Content extends beneath these controls without reserved gutters; subtle gradient shadows mark both edges. Header controls remain above the edge hit areas. On hover-capable devices they are hidden until hovered, fading to half opacity over 1.1 seconds. Touch devices show a soft 4.8-second opacity pulse and a two-pixel directional nudge as a swipe hint. Keyboard focus reveals the controls; reduced-motion settings use static hints instead of animation. The guide uses the available dynamic viewport height and keeps an inset margin on mobile and desktop, including landscape layouts. Arrow navigation slides the current content page out while the adjacent page enters; horizontal touch dragging moves both pages with the finger and either completes or snaps back. Navigation moves through steps, phases, player turns and rounds in both directions. Reduced-motion settings and browsers without the Web Animations API use immediate page changes. On touch devices, swipe left for the next page and right for the previous page. Vertical scroll, short/diagonal gestures, multi-touch, screen-edge browser gestures, text selection and interactive controls are excluded. Animation orchestration and swipe handling are covered by automated DOM-adapter/event tests, including in-flight navigation locking, cancellation and reduced motion. These automated motion checks use a DOM adapter; a Chromium mobile rendering check also passed, while physical-device swipe behavior remains unverified. There is no unit dropdown, per-unit completion button, unit review queue, or confirmation gate when moving on.

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

The signed-in administrator has a **Rules workshop** navigation entry. Search and edit existing rules, unit abilities, army/detachment rules, Stratagems, enhancements and core guide pages. Add factions (Imperium/Chaos/Xenos), detachments, units and rules with phase/turn/timing, eligible unit names, targets, conditions, study questions and source links. The database starts with 442 entries: 312 rule reminders, 80 units, 16 detachments, 33 core pages and the Aeldari faction.

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

The Rules workshop uses four columns: Factions → Content groups → Entries → Editor. Factions are grouped by Imperium, Chaos and Xenos, then sorted alphabetically. All content provides global browsing; Shared / core holds common rules and guide pages. Select Grey Knights → Detachments to browse that faction's detachments, then select a detachment to edit it on the right. Units and detachments include links to their editable rules. Path buttons return to earlier levels or the current editor.

Each faction has folders for faction details, units, detachments, army/detachment rules, abilities, Stratagems, enhancements and all rules. Search and reference/summary filters operate within the selected folder. Empty folders remain available for new content. New entries inherit the selected faction; new rules opened from a unit or detachment inherit that relationship. Existing content is never moved or rewritten by browsing.

On screens up to 900px, one column appears at a time. The path bar switches levels and retains the current unsaved form. Choosing different content still prompts before discarding edits. Save, import, revision history and database authorization use the existing services. Browser checks cover faction isolation, related rules, scoped filters, new-entry defaults, saved edits, unsaved-change protection, desktop columns and mobile navigation.

## Adeptus Mechanicus study summaries (v0.20)

Inspected the 167 rules already imported into the shared catalog. Added 119 independently written study notes, alongside the 21 existing automatic translations: 140 usable summaries, 16 records with no encoded effect and 11 records with specific source issues. The additions cover Doctrina Imperatives (standard and Purge Corps), Battle Protocols, Canticles, Rad-bombardment, objective rules, transport support, weapon-specific bonuses and Battleline upgrades.

Exact mechanics snapshots bind every note and issue explanation to its source, including targets, timing, duration, restrictions and unknown fields. Source changes invalidate stale interpretations even if the digest is unchanged. Existing workshop text and reference-only status remain intact. This release changes presentation without rewriting the user's imported catalog or saved lists.

The unresolved source records are Chant of Electrotraction, Cyber-static Canticles, Electro-shock, Guided Retreat, Noospheric Recon, Noospheric Transference, Omnissiah’s Blessing, Overloaded Safeguards, Repolarised Augurs, Scuttling Walker and Shroud Protocols. Their cards explain missing timing, contradictory targets, undefined mechanics or incomplete restrictions. Use Adeptus Mechanicus → All rules & abilities → Filter rules → Summary coverage in the workshop to find these or the empty effect records. They require a current rules reference and a manually checked description.

Regression tests retain the full structured source fixture and cover all 167 entries, mechanics changes, Battleline/weapon scope, round/phase differences, dice thresholds, limited uses, custom notes and source issues. Browser checks use copies of the imported catalog with mocked Auth/REST responses and verify workshop filters, the guide, mobile layout and manual override saving. Attribution: CREDITS.md and LICENSE-40KDC-DATA.txt. These source-derived study interpretations are not official rules verification.
