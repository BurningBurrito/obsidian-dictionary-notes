# Status: Dictionary Notes (`dictionary-notes`)
**Current phase:** Phase 3 — Build (features complete; waiting for test in Obsidian)
**Last updated:** 2026-10-02

## Done
- [x] Phase 1: researched reference plugin + dictionary sources; plan approved
- [x] Phase 2: scaffold from official sample, naming rules verified, test vault + Hot Reload, first commit
- [x] User confirmed the skeleton loads in the test vault (command shows notice)
- [x] Phase 3 code:
  - Sources: Free Dictionary API (default), Wiktionary REST (backup), Merriam-Webster (key via SecretStorage)
  - Automatic fallback to the backup source (setting, default on); lowercase retry for case-sensitive sources
  - Errors with user-facing messages: offline, network failure, 15 s timeout, not found (+ MW spelling
    suggestions), rate limit (429 + Retry-After), server error (5xx), unreadable response, missing/invalid key
  - Search modal (pre-filled with selected text; errors shown inline so you can retry)
  - Definition picker (filterable SuggestModal; sub-senses indented)
  - Template engine: 15 variables + {{date}}/{{time}} with moment formats; YAML-safe values in frontmatter
  - Note creation: safe file names, folder auto-created, "already exists" → open it or create "word 2"
  - Declarative settings: folder, template file, "create editable template" action, existing-note behavior,
    open after creating, source, MW key (shown only for MW), language, backup source
- [x] `npm run build` + `npm run lint` clean
- [x] Scratch test harness (not in repo): 39/39 checks pass against live APIs + simulated failures

## In progress
- [ ] User tests milestone 2 in the test vault

## Next
- [ ] Fix anything found in testing
- [ ] Optional: user gets a free Merriam-Webster key to test that source live
- [ ] Phase 4: README (features, install, settings, variables, network-use disclosure, attribution),
      GitHub repo via gh (ask public/private + confirm name), push, release workflow check

## Decisions made
- Name **Dictionary Notes**, ID **dictionary-notes** (ID can never change after release).
- Sources: Free Dictionary API default; Wiktionary backup; Merriam-Webster optional (v1.0).
- Fallback also triggers on "not found" and on a missing MW key (with a notice saying so), but not when
  offline (the backup would fail the same way). If the backup also fails, the main source's error is shown.
- minAppVersion 1.13.0 for declarative settings; API key in SecretStorage (settings store only its name).
- Wiktionary: send `Api-User-Agent` with contact URL but keep Obsidian's own User-Agent. Wikimedia limits
  unidentified clients to 10 req/min and browser clients to 200 req/min, and keys anonymous limits by
  User-Agent, so a custom UA could make all plugin users share one bucket.
- Wiktionary lists each sub-sense twice (nested + top-level); nesting is used only to mark depth.
- Frontmatter: whole-value placeholders are emitted as YAML-safe scalars/lists; unknown placeholders are
  left untouched (so other template plugins still work).
- "Note already exists" default: open the existing note (never overwrite).
- Ribbon icon always added; Obsidian lets users hide ribbon icons (right-click ribbon), so no extra setting.
- Test vault inside project but gitignored; dev builds auto-copy into it; Hot Reload.
- Local git commits at milestones (user approved); nothing pushed until Phase 4.

## Open questions / blockers
- Merriam-Webster parser tested on documented sample data only (no key yet).
- Wiktionary `Api-User-Agent` names `https://github.com/BurningBurrito/dictionary-notes`; keep the repo name
  in Phase 4 or update the constant in src/sources/wiktionary.ts.
- Phase 5: submission now goes through Obsidian's developer dashboard with automated review
  (announced 2026-05-12). Verify the process then.
- `{{etymology}}` and `{{audio}}` are only filled by Merriam-Webster.
