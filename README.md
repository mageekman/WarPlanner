# WarPlanner — personal study edition, v0.6

A phone-friendly study companion for your 11th-edition Aeldari roster. The walkthrough teaches explicit core timing windows and offers roster-specific reminders. It is not a game-state tracker or a rules judge.

## Open

Open `warplanner.html` in a modern browser. No build or installation needed. For account login, run `npm ci && npm run build`, serve `docs/` over HTTP, and configure the local redirect in Supabase. Optional Google Fonts fall back to system fonts without a connection. For consistent browser storage, serve the folder with `python -m http.server 8000 --directory dist` and use the same origin each time.

## Flashcard phase reference

The action part of each phase is a visible board of relevant cards. Short headings identify the timing window (Start of Turn, Start of Movement, End of Shooting). The guide opens directly with the turn toggle and phase tabs, which remain fixed above an internally scrolling page. Only Core Rules and the content below it move. Centered SVG side arrows stay at the vertical midpoint of that frame. Arrow navigation slides the current content page out while the adjacent page enters; horizontal touch dragging moves both pages with the finger and either completes or snaps back. Navigation moves through steps, phases, player turns and rounds in both directions. Reduced-motion settings and browsers without the Web Animations API use immediate page changes. On touch devices, swipe left for the next page and right for the previous page. Vertical scroll, short/diagonal gestures, multi-touch, screen-edge browser gestures, text selection and interactive controls are excluded. Animation orchestration and swipe handling are covered by automated DOM-adapter/event tests, including in-flight navigation locking, cancellation and reduced motion. These automated motion checks use a DOM adapter; a Chromium mobile rendering check also passed, while physical-device swipe behavior remains unverified. There is no unit dropdown, per-unit completion button, unit review queue, or confirmation gate when moving on.

- Shared army/detachment options and Stratagem prompts appear once at the top. Their previews and expanded panels describe targeting/eligibility instead of enumerating the roster; rules without a unit target say so. Stratagem prompts with different targets are separate named cards. Movement starts with Swift as the Wind and Flitting Shadows, followed by other applicable shared options.
- Unit-specific abilities appear under the **unit's name**: Avatar of Khaine, Swooping Hawks, Warp Spiders, and other units with relevant rules. Ordinary units with no special reminder are omitted from the board; absence does not mean they cannot act.
- Unit cards start collapsed and show the applicable ability, enhancement, and shared-rule names beneath the unit name. Expand the unit to read its facts and timing; conditions and source references remain optional. Color labels distinguish unit abilities, army/detachment rules, core rules, Stratagems and enhancements.
- When the same mechanically identical ability belongs to three or more imported battlefield units, it gets its own collapsible shared card. Its preview lists every matching unit, including duplicate squad labels. The rule is not repeated inside each unit block, but its name remains in that unit’s preview. Attached leaders and bodyguards count as one unit for this threshold. Two users keep the ability in their unit cards.
- A unit block is omitted if all of its relevant rules are already in shared blocks. Its eligibility remains listed in the shared rule. Units with unique relevant abilities still have their own block.
- Identical squads share a card with their individual labels. They retain independent limits; a group with different rules or an attached leader stays separate.
- Fight unit cards show a Fights First badge when all imported members have the rule, including a Banshee-leading Autarch’s conditional ability. A standalone Autarch is not given the badge. Charge-granted Fights First is not inferred because battlefield actions are not tracked.
- War Walkers and the Falcon are the first Shooting unit cards because they can help later attackers. Suggestions do not set a mandatory order. The provider card describes the benefit once rather than repeating it under every possible recipient.
- Fire Dragons retain their unit-specific rules and point to shared detachment choices shown above. Fuegan's Melta-range reminder appears only with his imported leader/bodyguard group and is conditional on him still leading.
- Start/end-of-phase and turn/round windows remain separate. Fight keeps its pile-in, fight and consolidation steps. Movement/Shooting during the opponent's turn show possible friendly responses, not an invented enemy roster.
- Existing same-origin armies, labels, source confirmations and phase position are retained when upgrading from v0.3. Old per-unit review state is discarded because it is no longer used.

## Source review and limits

Core sequences were compared with the June 2026 official 11th-edition PDF on 13 November 2026. Asurmen's updated weapon ability and the Aspect Shrine Token exclusion were compared with the official October Aeldari update. Fuegan’s range reminder was also checked against the live community datasheet on 13 November 2026. Other army summaries use the documented Wahapedia export and comparisons with a pinned 40kdc snapshot; they need confirmation in the player's current app/book. See [content-review.json](docs/content-review.json) for the inventory, source fingerprints and limits, and [CREDITS.md](CREDITS.md) for attribution.

The program does not guarantee latest-errata completeness or validate a roster. It cannot infer ranges, visibility, casualties, remaining tokens, passengers, reserve assignments, or whether a leader is still leading. It shows possible reminders, not legal activations. Stratagem cards point to timing opportunities and intentionally require the complete current reference for cost and full resolution. Mission scoring, weapon-by-weapon lessons, some passive/damaged-profile details and tournament-specific rulings remain outside coverage.

This is personal-use software, not a cleared public product. The earlier source/IP assessment remains in `/workspace/war-plan-research`; research evidence and official rulebook PDFs are not shipped in this app. Supabase Auth handles accounts; GitHub Pages serves the app. No telemetry or bundled upstream rules library is included. Prepared app content is local after download; there is no PWA service worker or cross-device synchronization yet. Browser storage can be unavailable under file URLs and is removed by clearing browser data.

## Checks

`npm run check` checks syntax. `npm test` checks imports, attachment preservation, point totals, source-aware reminder selection, corrected token scope, edition-specific sequencing, round transitions, flashcard grouping, leader-bound effects, navigation, persistence, safe rendering, and progress migration. App interaction tests use a minimal DOM adapter, not a browser.

`npm run bundle` rebuilds `warplanner.html` and `warplanner-source.zip`. Chromium checks cover the account gate, signup/reset modes, failed-login feedback and mobile width. Successful confirmation and recovery emails still require a real inbox check. Review real-device layout and source-linked community cards before relying on the app during a game.


## Hosting and accounts

Repository: https://github.com/mageekman/WarPlanner
Site: https://mageekman.github.io/WarPlanner/

This follows Command Ledger’s static GitHub Pages approach. Pages publishes the committed `docs/` directory from `main`. Source lives in `dist/`; `npm ci && npm run build` refreshes the published copy and vendors the exact Supabase SDK from the lockfile. Run `npm run check && npm test` before committing both source and built files. The public client configuration in `dist/config.js` contains only a publishable key; never put service-role keys or passwords there.

Supabase project: `zmhybqzodbpshpnnopvz` (WarPlanner). Email/password authentication supports sign-up confirmation, sign-in, persistent sessions, sign-out and password recovery. Configure Authentication → URL Configuration with Site URL and Redirect URL `https://mageekman.github.io/WarPlanner/`. Keep email confirmation enabled. Configure custom SMTP before broader use; Supabase’s default sender is limited. Authentication emails and successful confirmation/recovery need a real inbox check by the owner.

Account login currently unlocks the interface. GitHub Pages files and the repository remain public; login cannot make static rule summaries private. The `account_armies` table holds an administratively seeded roster for its owner, protected by a SELECT policy matching `auth.uid()` to `user_id`. Other accounts receive an empty army and an import prompt. The user-specific seed is not committed in SQL. Imported edits and study progress are still local; full cross-device synchronization is not implemented. See `supabase/schema.sql`. Armies and progress are stored locally under the authenticated user ID. Signing out clears the active roster from the interface, and switching accounts loads a separate saved state. The old shared `warplan.prototype.v1` key is used only by the offline edition; hosted accounts never inherit it. The offline single-file bundle has no account gate and remains available for personal use.


## Saved-list library

My army opens account-specific saved lists. Existing single-army saves migrate into the library automatically. Importing appends a list, and opening a list makes it active for the guide. Each list retains its unit labels and original export when provided. Switching active lists starts a fresh walkthrough. Summary cards show roster, detachment and disposition rather than point values; the original export retains its point values verbatim when opened. The older starter roster has no original export, so its import panel explicitly shows the saved roster instead. Lists and imported changes remain local to the signed-in account on that device.
