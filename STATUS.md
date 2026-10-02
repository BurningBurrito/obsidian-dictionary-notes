# Status: Dictionary Notes (`dictionary-notes`)
**Current phase:** Phase 2 — Scaffold (complete; waiting for first test in Obsidian), then Phase 3 — Build
**Last updated:** 2026-10-02

## Done
- [x] Phase 1: researched reference plugin + dictionary sources; plan approved
- [x] Verified current naming rules from the official linter (`eslint-plugin-obsidianmd` validateManifest):
      id/name/description must not contain "obsidian" or "plugin"; description 10–250 chars, capital first,
      ends with ".", only letters/digits/spaces and `. , ! ? ' " -`; only known manifest keys allowed
- [x] Checked name availability against the 8,302 plugins in community-plugins.json
- [x] Scaffolded from obsidianmd/obsidian-sample-plugin (commit 07ceb81, 2026-08-02); sample code removed
- [x] manifest.json / package.json / versions.json filled in; MIT LICENSE
- [x] npm install; `npm audit fix` cleared the 3 high-severity dev-tool advisories
- [x] Obsidian types updated 1.12.3 → 1.13.1 (lockfile from sample was stale)
- [x] Minimal plugin: command "Create new word note", ribbon icon, declarative settings tab (note folder)
- [x] `npm run build` and `npm run lint` both pass with zero warnings
- [x] Test vault at `test-vault/` (gitignored) with Hot Reload 0.3.1; dev builds auto-copy into it
- [x] `git init` (branch `main`), first local commit

## In progress
- [ ] User opens test vault in Obsidian and confirms the skeleton loads

## Next
- [ ] Phase 3: data model + source interface; freedictionaryapi.com client (requestUrl)
- [ ] Search modal → result picker (SuggestModal) → template rendering → note creation
- [ ] Wiktionary REST backup source + automatic fallback setting (default on)
- [ ] Merriam-Webster source with key stored via Obsidian SecretStorage
- [ ] Error handling: offline, not found, rate limit (429), note already exists, bad/missing key
- [ ] README with network-use disclosure (required by developer policies) + attribution (CC BY-SA, freedictionaryapi.com)

## Decisions made
- Name **Dictionary Notes**, ID **dictionary-notes** (user's pick; ID can never change after release).
- Sources: freedictionaryapi.com default; Wiktionary REST backup with auto-fallback (setting, default on);
  Merriam-Webster optional bring-your-own-key, included in v1.0. (User approved Phase 1 plan.)
- Write our own code; reference plugin is a design guide only (credit as inspiration in README).
- **minAppVersion 1.13.0**: use the new declarative settings API (`getSettingDefinitions`), which
  deprecates `display()` and makes settings searchable. New plugin, no legacy users, so no dual code path.
- API keys go in Obsidian's SecretStorage (since 1.11.4), not plaintext data.json.
- `isDesktopOnly: false`: only Obsidian APIs (requestUrl), no Node/Electron, so it can work on mobile.
- Test vault lives inside the project but is gitignored (it will hold settings/keys). esbuild's dev
  mode copies main.js/manifest.json/styles.css into it; Hot Reload reloads the plugin on change.
- Kept npm's new install-script blocking: esbuild works without its postinstall script.
- Ignored remaining `moment` audit advisories: npm's "fix" is a downgrade to obsidian 0.14.5, and
  moment is provided by Obsidian at runtime, not bundled.
- Local git commits at milestones (user approved); nothing pushed until Phase 4.

## Open questions / blockers
- Phase 5: submission now goes through Obsidian's developer dashboard with automated review
  (announced 2026-05-12); obsidian-releases no longer has the PR validation workflow. Verify process then.
- `{{etymology}}` only filled by Merriam-Webster; free sources lack it.
