# Status: Dictionary Notes (`dictionary-notes`)
**Current phase:** Phase 4 — GitHub repo (complete). Next: Phase 5 — Release and community submission
**Last updated:** 2026-10-02

## Done
- [x] Phase 1: researched reference plugin + dictionary sources; plan approved
- [x] Phase 2: scaffold from official sample, naming rules verified, test vault + Hot Reload
- [x] Phase 3: lookup (3 sources + fallback), definition picker, templates, note creation, error handling,
      declarative settings; 39/39 harness checks; user tested in the test vault and approved
- [x] Phase 4:
  - README: features, install, usage, settings, template variables + source coverage, frontmatter behavior,
    network use and accounts disclosure, content licensing, troubleshooting, development, releasing, credits
  - Screenshots placeholder in README (commented-out image links for docs/*.png)
  - Release workflow: checks tag == manifest version, builds, attests (public repos only), drafts a release
    with main.js, manifest.json, styles.css; lint CI on Node 22 + 24
  - Verified a clean clone builds and lints; scanned history for secrets (none)
  - Commit author email switched to GitHub noreply (repo-local config; history rewritten before first push)
  - Created **public** repo https://github.com/BurningBurrito/obsidian-dictionary-notes, pushed `main`,
    added topics; GitHub Actions lint run passed (Node 22 + 24)

## In progress
- (none)

## Next
- [ ] Phase 5: verify the current submission process (developer dashboard, automated review)
- [ ] Decide first release version (manifest is 0.1.0) and push the tag (ask first); publish the draft release (ask first)
- [ ] Optional before submitting: add screenshots to docs/ and README; test on mobile; test Merriam-Webster with a real key
- [ ] Prepare the submission and show everything before sending (STOP for confirmation)

## Decisions made
- Name **Dictionary Notes**, ID **dictionary-notes** (ID can never change after release).
- Repo name **obsidian-dictionary-notes** (user's pick; the "obsidian" word ban applies only to plugin id/name).
- Sources: Free Dictionary API default; Wiktionary backup; Merriam-Webster optional (v1.0).
- Fallback also triggers on "not found" and a missing MW key (with a notice), not when offline.
- minAppVersion 1.13.0 for declarative settings; API key in SecretStorage (settings store only its name).
- Wiktionary: `Api-User-Agent` with the repo URL, keeping Obsidian's own User-Agent (Wikimedia rate limits).
- Frontmatter values YAML-safe; unknown placeholders left untouched.
- "Note already exists" default: open it (never overwrite).
- Release workflow creates a **draft** release so it can be reviewed before publishing.
- Commits use the GitHub noreply address (set in this repo's local git config only).
- STATUS.md is tracked in the public repo (contains no secrets).

## Open questions / blockers
- Merriam-Webster parser tested on documented sample data only (no key yet).
- Mobile not tested (isDesktopOnly is false; only Obsidian APIs used).
- Phase 5: submission now goes through Obsidian's developer dashboard with automated review
  (announced 2026-05-12). Verify the process then.
