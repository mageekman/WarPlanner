# Guide reminders and compact saved lists

Guide settings now include independent **Show Core Stratagems** (off by default)
and **Show Deep Strike** (on by default) checkboxes. Preferences persist with the
local account/session state. Changing either updates the current page and
invalidates cached decks and prepared swipe pages without resetting game progress.

Core Stratagem reference entries use their retained source phase/player metadata
for optional Guide reminders. Explicitly authored timings take precedence. CP,
usage and target restrictions remain in the source conditions, and existing
reference/provisional labels stay intact. This change does not certify those
imports or automate Stratagem eligibility. Enabling these reminders does not
enable or disable faction Stratagems or change the Workshop catalog.

Deep Strike uses the editable shared core entry when available, with the existing
core reminder as an offline fallback. It appears for eligible units across
factions, respects the ability requirement on every attached model, and does not
duplicate the fallback card. Turning it off hides the Deep Strike reminder;
other named teleport and reserve abilities retain their own rules.

**Draw secondaries** is a shared editable Core Rule, available at the start of
your Command phase. It reminds Tactical players to follow their mission deck’s
draw and When Drawn procedure, while distinguishing Fixed Missions. It avoids
assuming one draw count/refill procedure across different mission packs. The
rule is supplied as a seed fallback and inserted into the catalog for Workshop
editing; later saved edits override the fallback.

Saved lists are grouped as Space Marines, Imperium, Chaos, Xenos and Other, using
the catalog’s faction groups with the existing fallback classification. List
names sort alphabetically within each group, with faction and ID as tie-breaks.
This changes presentation without reordering stored lists. Compact cards retain
roster, detachment, disposition, the active indicator and Delete action.

Validation: all 565 automated tests, syntax/build/bundle checks, and desktop/mobile
Chromium checks pass. Representative cards measure 121px at both 1440px and 390px
viewport widths, versus 238px and 234px previously. Group order, current-page
toggle behavior, saved settings and secondary-reminder turn restrictions were
checked in the browser. Historical audit tests count faction-native rules
separately from the newly shared core reminders.
