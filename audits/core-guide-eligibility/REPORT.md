# Core guide eligibility correction

Reported examples: Firing Deck was attributed to Shroud Runners, and Feel No Pain and Damaged were attributed broadly across an Aeldari list.

The guide treated a generic core ability with an empty explicit unit list as a match for every unit. Datasheet-bound core abilities now additionally require the corresponding ability reference on the resolved datasheet. This applies to Damaged, Damaged Objective Control, Deadly Demise, Feel No Pain, Firing Deck, Hover, Infiltrators, Leader, Lone Operative, Scouts, Stealth, Super-heavy Walker and Support. Existing Deep Strike and Fights First handling remains intact; general mission reminders and core stratagems retain their separate behavior.

Per-model core abilities attach only to the actual bearers when constructing unit cards, shared Applies to labels and battlefield-unit metadata. A leader does not pass its model-only Feel No Pain to its bodyguard through the guide's presentation. Existing explicit unit restrictions still apply. Unknown units and keyword/name guesses do not grant an ability. Conditional abilities granted by other rules remain described by those rules; this change does not infer battlefield effects from prose.

Tests cover the reported Aeldari roster problem across both activation and individual-step paths, shared and unit-card presentation, attached bearers and unknown units. A browser check using Shroud Runners, Falcon, Wave Serpent, Starweaver and Wraithguard showed Damaged only for Falcon/Wave Serpent, Firing Deck only for Starweaver, and no generic Feel No Pain card. No page errors occurred. No database content was edited.

Full suite: 794 passed, 0 failed. Focused eligibility checks, syntax checks, frontend build and diff checks passed. The frontend build is ready in docs/ and has not been published.
