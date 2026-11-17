# Guide progress persistence

Guide checklist, navigation and display preferences now write immediately to an account-scoped `.progress.v1` key. These writes exclude army data, saved armies, unit labels and import warnings. No timer or unload flush is needed for checkbox durability.

The legacy account key remains a full snapshot, written when army data changes or cloud metadata is acknowledged. Existing users retain their local lists and labels. Progress carries the snapshot's unique revision, so an interrupted snapshot/progress update cannot attach older progress to a different roster. A failed snapshot does not publish new progress; failed progress writes retry on a subsequent save. Signing out clears the save context.

Normal progress saves compare object references to detect roster replacement rather than serializing the roster or saved library. In-place unit label changes explicitly mark and synchronize the library. Imports, edits, switching armies, deletion, and cloud metadata paths retain their roster snapshot saves. Cloud scheduling runs only when the library changes.

## Verification

App tests cover legacy migration, small progress-only writes, guards that throw if army/library serialization occurs during saving, restoration, invalid/stale progress, storage write failures, account isolation, roster editing, deletion, and unit labels. Existing guide navigation and preload tests remain in place.

Headless Chromium, 4× CPU throttle, 100 synthetic saved lists and 2,000 checklist marks, 30 saves per approach: the previous full-state path measured a median 9.7 ms per save and wrote 227,599 characters; the split path measured 0.2 ms and wrote 37,484 characters. This is an isolated local save benchmark, not production swipe latency. Reload restored all 100 lists, all 2,000 marks, and the saved step without browser errors. Browser harness and raw results are included.

The frontend build is prepared in `docs/`. This change has not been published.

Final checks: syntax checks, full test suite (783 passing), the final 74 app checks (including the added unit-label persistence test), frontend build, and diff whitespace checks passed.
