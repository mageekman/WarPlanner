# Disposition primary mission reminders

Source: [Wahapedia Mission Deck 2026–27](https://wahapedia.ru/wh40k11ed/the-rules/mission-deck-2026-27/), reviewed 16 November 2026.

The guide optionally compares the selected list’s disposition with the opponent’s selected disposition. `dist/dispositions.js` contains all 25 directional matchups and independently written reminders for their primary missions, objective actions, setup, event triggers, completion conditions and scoring. The five accepted dispositions are Take and Hold, Purge the Foe, Disruption, Reconnaissance and Priority Assets. Unknown or missing values require correction rather than guessing from faction or detachment.

The default matchup assumes the normal mission mapping. Mission-changing twists can replace or exchange those missions; setup explicitly asks the player to check these. There is no automatic score, objective, action eligibility or battlefield-state tracking. Reminder checkmarks only record that a prompt was reviewed. The pack’s primary caps are 15VP per battle round and 45VP total.

Objective actions appear during Unit Shooting, with round-one exclusions for Triangulate and Extract Intelligence. Completion prompts and turn-end scoring use End of Turn, not End of Fight. Command scoring begins in round two and moves to turn end in round five. Outmanoeuvre and Battlefield Dominance retain their special round ranges. End-of-battle prompts appear after the second player’s fifth turn, regardless of who went first.

Army pages remain preloaded for both players. A small mission placeholder is bound to the current round when a page mounts, so round-specific reminders cannot become stuck on the round-one preload. This does not rebuild roster pages during swipes.

Guide settings are staged separately from active preferences. Font, previews, rule-type filters, Core Stratagems, Deep Strike and admin editing take effect together on Reload Guide. Applying them rebuilds the preload but preserves turn, round, phase, step and personal review marks. The core phase sequence remains available even when core reminder cards are hidden. These settings never change Workshop records.

Skip empty steps is opt-in and also applies through Reload Guide. Sequential swipes and arrows search for the next or previous step containing a visible rule card or disposition reminder. Manual phase and step selection remains available. Preloaded reminder counts keep navigation from rebuilding army decks. Mission reminders are checked for the destination’s actual round and player. Searching is bounded to one round; if everything is hidden, navigation moves across a phase boundary instead of looping indefinitely.

The Start screen places Settings beside Start. Its native dialog uses the same settings fields as the active guide. Save settings applies choices before Start prepares the pages; Cancel, the close button and Escape restore the prior preferences. Start does not begin until explicitly pressed. Account changes clear pending dialog state.

The collapsible Phase overview above the current step replaces the older bottom-of-phase list. It starts closed and remembers its open/closed preference across navigation and reloads. Each row links directly to a step and shows its visible rule and primary-reminder counts, independent of review marks. Empty steps remain accessible. Rule counts are preloaded; mission counts use the current turn and round. The removed top-level Core Rule/Core Sequence labels and cheat-sheet help sentence do not affect the actual rule-card category badges or source references.

Validation includes all 25 source matchups, action eligibility reminders, completion timing, scoring round ranges, both first-player orders, pending settings across navigation, account reset, preload reuse and review preservation. Browser checks cover mobile and desktop setup, yellow mission cards, deferred settings, round-five scoring and horizontal overflow.
