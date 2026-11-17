# Any time guide section

Added a native collapsible section directly below Clear this phase’s review marks. It starts closed, shows a rule count and down-caret, and remembers its open state in account-scoped local progress. The section is available on every guide step.

Current-phase reactions and phase-wide rules use the existing faction, unit, enhancement, timing, turn and type-filter logic. Selection-only, arrival, start/end and other specific-window rules remain in the step flow. An act timing alone does not move a phase-specific action into the drawer: broad phase availability or a core passive rule is required. Every card retains its triggers, conditions, references and editing controls. The section does not claim to know tabletop eligibility.

Any time cards are omitted from the matching step cards. Their checklist identifiers are separate when the same unit has both kinds of reminder, and clearing the phase clears both. Reports still include rules from both sections. Skip empty steps retains a phase-entry stop if its only reminders are in Any time; it does not stop at every otherwise empty step.

Guide sessions cache the phase drawer and prepare its content up front with the existing complete-guide preload. Preloaded phase counts support navigation without rebuilding pages. Opening the section changes native details state and saves only local progress.

Verification: 801 full-suite tests passed, with 0 failures, plus final focused app checks after the reporting integration. Browser checks confirmed placement, collapsed default, remembered open state, independent checkbox persistence across steps, phase clearing, no horizontal mobile overflow, and navigation with page building disabled after preload. Screenshots and raw browser results are included. Tests also cover timing/turn/type filters, caching, roster scope and the empty-step phase-entry behavior.

Built in docs/, not published.
