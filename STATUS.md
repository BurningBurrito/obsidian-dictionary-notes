# Status: Dictionary Notes (`dictionary-notes`)
**Current phase:** Update — Spanish definitions: Phase 1 done, **waiting for approval**
**Last updated:** 2026-10-03

## Update: Spanish definitions (branch `feature/spanish-definitions`)

Goal (user): definitions support Spanish; recommend how to extend idioms and quotes in a future release.
Phases as in the previous update: 1 review and research (stop for approval), 2 design (stop for
approval), 3 build, 4 test, 5 release.

### Done
- [x] Created branch `feature/spanish-definitions` from `main` (9490755, version 1.1.0)
- [x] Phase 1 — what works today (live, plugin's own lookup code, Language setting `es`): Free Dictionary
      API and Wiktionary already return English Wiktionary's **Spanish entries, explained in English**
      (canción → "song"; correr → 13 senses; IPA from Free Dictionary API; Spanish examples). Gaps:
      definitions are English glosses; Spanish "sin" and English "sin" collide as `Definitions/sin.md`;
      language is one global setting; source links go to the page top (English section) and Free
      Dictionary API links break on phrases ("echar de menos"); verb forms (corrí) don't offer the base
      word; Merriam-Webster (Collegiate) is English only and ignores the language
- [x] Phase 1 — Spanish sources:
  - Wikcionario (es.wiktionary.org): CC BY-SA 4.0, definitions **in Spanish** (correr: 37, with inline
    Sinónimos/Antónimo; verb forms marked "Forma verbal"; Etimología, Locuciones, Refranes sections).
    No REST definition endpoint (HTTP 501); needs a parser for action=parse HTML (dl/dt/dd under
    part-of-speech headings in the "Español" section)
  - Merriam-Webster Spanish-English API: bilingual (English explanations + translations), endpoint
    /references/spanish/json/; separate key not confirmed by the docs page
  - RAE (dle.rae.es): no official public API; only unofficial scrapers (not suitable)
- [x] Phase 1 — for idioms and quotes (future release): en.wiktionary Category:Spanish_idioms 3,341
      (English explanations); es.wiktionary ES:Locuciones 140, ES:Refranes 269; es.wikiquote 8,929 pages
      (CC BY-SA 4.0), sections "Citas"/"De sus obras"/"Citas sobre …", attribution headings rare
      (Atribuidas 43 pages, Dudosas 11, Disputadas 1, Erróneamente atribuidas 0, no frames on sampled
      pages); en.wikiquote already keeps Spanish originals in {{original}} (Cervantes 24/206, Borges
      14/156, García Márquez 0/28)
- [x] Phase 1 — interface language: Obsidian's `getLanguage()` (since 1.8.7) makes a Spanish UI possible;
      separate from Spanish definitions

### In progress
- [ ] Waiting for the user: which Spanish definitions (in Spanish, in English, or both) + approval

### Next
- [ ] Phase 2: design, **wait for approval**
- [ ] Phase 3: build · Phase 4: test · Phase 5: release (GitHub release; the plugin is listed)

### Decisions made
- (pending approval) Recommended: both kinds for Spanish words, chosen per lookup; Wikcionario as the new
  source for Spanish-language definitions; keep English-explained Spanish from the current sources.

### Open questions / blockers
- What "definitions support Spanish" should mean: definitions written in Spanish, in English, or both.

---

## Previous: 1.1.0 Idioms and Quotes (released 2026-10-03; branch `feature/idioms-quotes`, deleted)

### Done
- [x] Checked listing status: **listed** in the community directory. `dictionary-notes` appears in
      obsidianmd/obsidian-releases `community-plugins.json` (added by the mirror sync 72a7adf1,
      2026-10-02 14:32 UTC, right after 1.0.1 was published), with the standard
      "not been manually reviewed by Obsidian staff" label.
- [x] Confirmed the update path in the official docs (obsidian-developer-docs, edited 2026-08-07):
      "You only need to submit the initial version of your plugin" and the directory FAQ "Do I need to
      resubmit ... for every update? No." Each new release is re-scanned automatically
      (manifest, release assets, source code, build verification). **Review branch** in the dashboard
      can preview-scan a branch before any release.
- [x] Created branch `feature/idioms-quotes` from `main` (4090ad1)
- [x] Baseline: `npm run build` and `npm run lint` pass on the branch
- [x] Phase 1 code review: 15 source files read. Reusable as-is: `sources/http.ts`, `errors.ts`,
      `renderTemplate`, `notes/create-note.ts` helpers, most of `SearchModal`. Word-specific: `types.ts`,
      `sense-modal.ts`, `buildVariables`, `DEFAULT_TEMPLATE`, `createWordNote`, flat settings shape.
- [x] Phase 1 research (all checked live or against current docs on 2026-10-02):
  - **Idioms:** Wiktionary has 10,659 English idioms (Category:English_idioms). Search
    (`incategory:English_idioms`) finds idioms from partial input ("spill beans", "ice"); REST
    definitions return meanings + examples; the page's Etymology section gives origin. Free Dictionary
    API also returns idioms and tags senses `idiomatic`, but has no search. Bundling a Wiktionary extract
    would add about 3.5 MB to main.js (now 20 KB; measured 336 B/idiom). Research corpora (MAGPIE, EPIE,
    PIE-English, IdiomKB) are unsuitable: sentence data, LLM-generated meanings, or unclear rights.
    Wordnik: key per user, 100 calls/hour, free tier "nonprofit or research use".
  - **Quotes:** Wikiquote (CC BY-SA 4.0) files quotes under Quotes / Attributed / Disputed /
    Misattributed with citations; verified (e.g. "definition of insanity" sits under Misattributed on
    Benjamin Franklin). Quotable is down (DNS fails, repo idle since 2024-01). API Ninjas free plan
    forbids "data caching/storing" and commercial use. FavQs forbids storing content beyond "reasonable
    periods". ZenQuotes free tier is random-only (search needs a paid key), gives no source/work/year,
    site ToS "personal, non-commercial use". They Said So requires paid auth.
  - **Limits:** Wikimedia 200 req/min with an identifying header (10/min without; docs 2026-06-03);
    Free Dictionary API 1,000 req/hour per IP.

- [x] Phase 1 approved by user (sources approved; 4 open questions answered, see Decisions)
- [x] Phase 2 checks: ribbon state is stored as `pluginId:title` in workspace.json (renaming the icon
      resets hidden/order once); declarative settings keys are plain strings on `plugin.settings`
      (flat keys = no conversion); guidelines: general settings without heading, no "settings" in
      headings, sentence case. Wikiquote keyword search ranks topic pages above person pages
      (Einstein's page is 6th for his own quote), so credit comes from each quote's citation line;
      Wikidata `wbgetclaims` P31 = Q5 tells whether a page is a person (~240 bytes).
- [x] Phase 2 design written (summary below) and **approved with all recommendations**
- [x] Phase 3 build, in 4 local commits on `feature/idioms-quotes` (not pushed):
  - M1 restructure (e286e8b): shared flow + `LookupType`; Definitions output proven byte-identical to
    1.0.1 (13/13 old-vs-new checks: template text, variables, rendered notes, file names)
  - M2 idioms (9dc4504): live-tested exact match ("Break The Ice." too), partial ("spill beans"),
    inflected ("kicked the bucket"), literal-pointer filtering ("piece of cake"), clean origin,
    backup source strips the "idiomatic" label and rejects non-idioms ("table")
  - M3 quotes (efbc77d): parser tested on saved pages (Einstein 468 quotes: 303 sourced / 110 attributed /
    12 disputed / 43 misattributed; Franklin "definition of insanity" = Misattributed with note;
    Courage topic page credits via linked citations; date-page votes skipped; translations use the
    English text, original kept in `{{original}}`); live: keyword ~1-2 s, author/topic ~0.3 s
  - M4 docs: manifest + package.json description (approved text, 128 chars), keywords, README rewritten
    (three types, labels, settings, variables, 5 network services, licensing, "Upgrading from 1.0");
    README templates verified identical to the code; no placeholder text
  - build, lint, and lint-without-moment-types all clean (0 warnings)

- [x] Phase 3 approved by user; user approved pushing `feature/idioms-quotes` (not main) for CI and the
      dashboard's "Review branch" scan

- [x] Phase 4 automated test suite (471bf26): **77 tests, all pass**, offline in ~1 s (`npm test`);
      `npm run test:record` re-records the real responses (668 KB gzipped in tests/fixtures/http).
      Covers: settings migration from real 1.0.1 data.json shapes; Definitions vs golden output generated
      by the 1.0.1 code; idioms (exact/partial/inflected/literal pointer/origin/backup/backup off);
      Wikiquote parsing (labels by box and by heading, translations, "Quotes about", topic credits,
      date pages); quote search (author/topic/keyword, people only, author-page check); every error
      message (offline, unreachable, 429 with/without Retry-After, 5xx, 15 s timeout via mock timers,
      unreadable JSON, Wiktionary/Wikiquote/Wikidata failures); full flow on an in-memory vault
      (folder created, nested folders, existing note opened, numbered copy, missing template, folder
      setting is a file, 1.0.1 folder/template kept, backup notice, cancel, all three types)
- [x] Tests checked by deliberate breakage: parser box/heading signals, template text, default
      folder: each caught (added box-only/heading-only tests after the first breakage slipped through
      because the two signals back each other up)
- [x] CI runs `npm test` (600a04d); `linkedom` added as an exact dev dependency (ISC, not bundled)
- [x] `test-vault-upgrade/` (gitignored): real 1.0.1 release assets, build attestation verified
      (release.yml @ tag 1.0.1, commit 21588c7), plugin enabled, checklist note "Upgrade test.md"
- [x] Pushed `feature/idioms-quotes` (user approved; main untouched, no tags). CI green on Node 22 and 24
      (run 37079995026: build, lint, npm test, lint without moment types)
- [x] Noticed `.obsidian/` in the project root (created 19:39, default config only, likely from opening
      the project folder as a vault). Left in place; added `/.obsidian/` to .gitignore

- [x] User reported all tests passed. Files confirm the manual UI checks in `test-vault/` (new version,
      19:42–19:45: Definitions/fag.md, Idioms/give me a break.md, a quote note from a topic search;
      settings saved with all new keys, quoteSearchMode remembered as "topic")
- [x] Upgrade test, **untouched-settings path** (user, 20:03–20:07): vault opened, new build installed
      (main.js identical to the current build), definition/idiom/quote notes created; settings were
      all defaults, so new definition notes went to `Definitions/` as designed
- [x] Upgrade test, **customized path**: user reran the test; files show the only change was the plugin
      being turned off at 20:11 (no snapshot, default settings, no hotkeys.json, no template or
      My Words note), so it was not exercised in Obsidian. User chose to continue to Phase 5; this case
      relies on the automated tests on exact 1.0.1 data (settings.test, flow.test "keeps using the
      folder and template from 1.0.1"). Command ID unchanged, so hotkeys map as before
- [x] **Phase 4 closed** (user: "all tests passed"; continue to Phase 5)
- [x] Phase 5 prep:
  - Release docs rechecked: unchanged since 2026-08-07 (no resubmission; new GitHub release = update;
    each release re-scanned). Obsidian reads manifest.json/versions.json from the default branch and
    downloads assets from the release whose tag matches, so **publish the release before pushing main**
  - minAppVersion 1.13.0 still right: the only APIs marked 1.13.1 that matched were name collisions
    (group search, settings pages, DisplayValueComponent: none used)
  - Version **1.1.0** (minor: new features, nothing breaks): commit 8c08d4f "Release 1.1.0"
    (manifest, package, package-lock, versions.json "1.1.0": "1.13.0"); no tag yet
  - Release candidate checks: build, lint, lint without moment types, 77/77 tests; CI green on Node 22
    and 24 (run 37081288407); local main.js sha256 a0ec3f6d… (40,336 bytes) for comparing with the draft
  - Release notes drafted (shown to the user)

- [x] User answers: Review branch scan of `feature/idioms-quotes` showed **no warnings**; no screenshots
      for now (README placeholders caused a 1.0.0 warning; add real ones later, README-only change);
      release approved ("move to next phase")
- [x] **Released 1.1.0**:
  - Annotated tag `1.1.0` on 8c08d4f "Release 1.1.0", pushed; release workflow run 37081883370 passed
    (tag check, build, attestation, draft)
  - Draft verified before publishing: 3 assets; manifest 1.1.0 / minAppVersion 1.13.0 / new description;
    main.js (40,336 bytes) and styles.css byte-identical to the local build; manifest identical to the
    tagged commit; attestation verified (release.yml @ refs/tags/1.1.0, commit 8c08d4f)
  - Published 2026-10-03 00:24 UTC with the release notes, marked latest; public downloads return 200
  - `main` fast-forwarded to the feature branch (this status commit) and pushed, after the release was
    live, so users are only offered 1.1.0 once its files exist

- [x] Deleted the merged `feature/idioms-quotes` branch on GitHub (user approved; it pointed at main's
      commit bcccdad with no extra commits and no open PRs). Local copy kept
- [x] Wrote the listing's long description (plain text; shown on the listing's Overview tab and sidebar,
      above the README excerpt, so it doesn't repeat the README)

### Carried over
- [ ] User, on community.obsidian.md: **Check for new releases**, read the scan result for 1.1.0, then
      **Edit listing**: paste the short description ("Build a dictionary in your vault: look up definitions,
      idioms, and quotes, and save each one as a note using your own templates.") and the long description
- [ ] Later (user: leave for later): screenshots (README in `docs/` or dashboard listing, 1200×800), mobile test, Merriam-Webster
      test with a real key, the "ice cream" source-link fix for Definitions, work-page authors via Wikidata

### Decisions made
- Release path: **already listed**, so updates ship as a normal GitHub release. No new submission.
- Plugin ID `dictionary-notes` stays (listed; changing it resets downloads and forces reinstalls).
- Sources (approved): idioms from **Wiktionary** (search + meanings + origin), Free Dictionary API as
  backup for meanings; quotes from **Wikiquote** only; no bundled datasets; no API keys needed.
- Concept (user): the plugin builds **a dictionary of Definitions / Idioms / Quotes**. Files (manifest,
  package.json, README, settings, templates) get updated to reflect this in Phase 3.
- Default Definitions folder becomes **"Definitions"** (user's choice). Saved settings still win, so
  anyone who saved settings in 1.0.x keeps "Dictionary"; untouched installs switch. No notes are moved.
- Disputed / Misattributed / unverified quotes are **shown with a clear label** (not hidden).
- **English only** for idioms and quotes for now; other languages later.
- Command ID **`create-word-note` kept** (existing hotkeys keep working).
- Version **1.1.0** (minor): new features, nothing breaks for existing users.
- Release order (plugin is listed): tag → draft → verify → publish → then push `main`, so users are
  never offered a version whose release files don't exist yet.
- No placeholder text in the README (it caused a 1.0.0 review warning); screenshots pending user choice.

- Build details (Phase 3): plain search ranks idioms best (finds related idioms too); exact title match
  skips the list. Author search accepts **people only** (Wikidata Q5), so a topic like "Love" is never
  credited as an author. On topic pages the author comes only from a **linked** name in the citation
  (no guessing from text). Results sorted Sourced first. Added `{{original}}` (quote in its original
  language) beyond the approved variable list.

### Design (approved)
- Architecture: shared flow (search → choose item → name/exists check → choose detail → render →
  create) in `src/core/`; one module per type in `src/lookups/{definitions,idioms,quotes}/`
  implementing a `LookupType` interface; shared search window + one generic picker in `src/ui/`.
- Settings: keep all 1.0 keys (now = Definitions); add `idiomFolder`, `idiomTemplateFile`,
  `idiomUseFallback`, `quoteFolder`, `quoteTemplateFile`, `quoteSearchMode`. Layout: shared settings
  without heading, then groups Definitions / Idioms / Quotes.
- Quotes: Keyword / Author / Topic search; status labels Sourced / Attributed / Disputed /
  Misattributed / Unsourced, shown in the picker, as an `attribution` property and a warning callout
  (`{{attributionNote}}`); status confirmed on the author's own page after picking.
- Note names: definitions `word`, idioms `idiom`, quotes `Author - excerpt` (~50 chars).
- Ribbon: recommend one icon with a menu (Definition / Idiom / Quote).
- Name stays "Dictionary Notes"; new description; commands "Create new definition/idiom/quote note".

### Open questions / blockers
- `npm audit`: 3 moderate findings in `moment` via the `obsidian` types and lint plugin (dev only,
  existed before; Obsidian provides moment at runtime). `npm audit fix --force` would downgrade the
  Obsidian API to 0.14.5, so not applied.
- Not testable here: mobile (isDesktopOnly false; only Obsidian APIs and DOMParser used).
- Possible later improvement (seen in manual test): topic search on a work's page (e.g. "Dune") gives
  author "Unknown" because those pages credit characters, not the writer. Wikidata could supply the
  work's author (P50) and set {{work}} to the page title. Not in scope for this release.
- Found while testing (not changed, Definitions must stay identical without approval): the 1.0
  Free Dictionary API source uses the API's unencoded URL, so a multi-word definition lookup
  ("ice cream") gets a source link with raw spaces that breaks the Markdown link. Fixed for idioms.
- The listing description on community.obsidian.md may need updating by hand ("Edit listing") after
  release; the directory reads manifest.json from `main`.

---

## Previous: 1.0.x release (complete)

### Done
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

  - User submitted at community.obsidian.md; automated review gave 2 warnings on 1.0.0:
    1. `@typescript-eslint/no-unsafe-assignment` at src/notes/template.ts:89. Cause (reproduced locally): the
       review lints without moment's type package, so `moment()` is error-typed. Fix: a tiny `DateFormatter`
       type for the one method we use. CI now also lints without moment types.
    2. README placeholder text (screenshots comment + "coming soon"). Removed; also reworded `<your vault>`.
  - Released **1.0.1** (user approved): draft verified (manifest 1.0.1, main.js identical to local build,
    attestation from tag 1.0.1 / 21588c7), published as latest; CI green incl. the new step
  - 1.0.1 passed the automated review and was **listed** on 2026-10-02

### Decisions made
- Name **Dictionary Notes**, ID **dictionary-notes** (ID can never change after release).
- Repo **obsidian-dictionary-notes**, public; commits use the GitHub noreply address (repo-local config).
- First release **1.0.0** (user's choice); versions.json lists only released versions.
- Sources: Free Dictionary API default; Wiktionary backup; Merriam-Webster optional.
- minAppVersion 1.13.0 (declarative settings); API key in SecretStorage.
- Release workflow drafts first; publishing is a separate, deliberate step.
- Fixes to released code always get a new version (never move a published tag).

### Open items carried over
- Merriam-Webster parser tested on documented sample data only (no key yet).
- Mobile not tested (isDesktopOnly is false; only Obsidian APIs used).
- Optional: real screenshots in docs/ + README.
