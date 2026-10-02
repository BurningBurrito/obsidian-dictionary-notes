# Status: Dictionary Notes (`dictionary-notes`)
**Current phase:** Phase 5 — Release and community submission (release published; waiting for user to submit)
**Last updated:** 2026-10-02

## Done
- [x] Phase 1: researched reference plugin + dictionary sources; plan approved
- [x] Phase 2: scaffold from official sample, naming rules verified, test vault + Hot Reload
- [x] Phase 3: lookup (3 sources + fallback), definition picker, templates, note creation, error handling,
      declarative settings; 39/39 harness checks; user tested and approved
- [x] Phase 4: README, LICENSE, .gitignore, release + lint workflows; public repo
      https://github.com/BurningBurrito/obsidian-dictionary-notes
- [x] Phase 5:
  - Verified the current submission process (community.obsidian.md dashboard + automated review;
    no more pull request to obsidianmd/obsidian-releases)
  - Removed unreleased 0.1.0 from versions.json; `npm version 1.0.0` → commit + tag `1.0.0`
  - Pushed (user approved); release workflow passed: tag check, build, attestation, draft release
  - Verified draft: 3 assets, manifest 1.0.0, main.js byte-identical to local build, attestation verified
    (built by release.yml from commit 5376bde)
  - Published release 1.0.0 with notes (user approved); public download URLs return 200
  - Pre-submission checklist: id/name unique (8,304 plugins), manifest at HEAD ok, README + LICENSE,
    release assets, official lint clean, no fetch/innerHTML/eval/Node APIs, CI green

## In progress
- [ ] User submits at community.obsidian.md (sign in with Obsidian account → link GitHub → add plugin)

## Next
- [ ] Read the automated review result in the dashboard; fix any failures (new version: `npm version patch`)
- [ ] Optional: screenshots in docs/ + README; mobile test; Merriam-Webster test with a real key

## Decisions made
- Name **Dictionary Notes**, ID **dictionary-notes** (ID can never change after release).
- Repo **obsidian-dictionary-notes**, public; commits use the GitHub noreply address (repo-local config).
- First release **1.0.0** (user's choice); versions.json lists only released versions.
- Sources: Free Dictionary API default; Wiktionary backup; Merriam-Webster optional.
- minAppVersion 1.13.0 (declarative settings); API key in SecretStorage.
- Release workflow drafts first; publishing is a separate, deliberate step.

## Open questions / blockers
- Merriam-Webster parser tested on documented sample data only (no key yet).
- Mobile not tested (isDesktopOnly is false; only Obsidian APIs used).
- The dashboard may ask for details not covered in the docs (categories, screenshots, disclosures);
  answers prepared in the Phase 5 summary.
