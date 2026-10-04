# Dictionary Notes

Build a dictionary in your vault: look up definitions, idioms, and quotes, and save each one as a note using your own templates.

Type a word, an idiom, or a few words from a quote, pick the result you want, and Dictionary Notes creates a note in that type's folder, filled in from a template you can customize.

## Features

- **Three lookup types, one plugin:**
  - **Definitions** of words, from Free Dictionary API, Wiktionary, or Merriam-Webster. Spanish words can be defined in Spanish (from Wikcionario) or explained in English.
  - **Idioms** such as "break the ice", with meanings, examples, and origin, from Wiktionary.
  - **Quotes** by keyword, author, or topic, with the author, work, and year, from Wikiquote.
- **Quick lookup:** select the book icon in the ribbon and choose **Definition**, **Idiom**, or **Quote**, or run a command from the command palette. If you have text selected in a note, it's used as the search text.
- **Find what you mean:** idiom search is forgiving ("spill beans" finds "spill the beans"), and every list can be filtered by typing.
- **Honest quote attribution:** quotes that Wikiquote lists as disputed, misattributed, or unverified are clearly labeled, with Wikiquote's explanation. A quote found on a topic page is checked on the author's own page.
- **Notes from templates:** each type has its own folder (default: `Definitions`, `Idioms`, `Quotes`) and its own template. Use the built-in templates or your own.
- **Backup sources:** if the main source for definitions or idioms is down or has no entry, Dictionary Notes can try another one.
- **Clear errors:** you get a plain message when you're offline, nothing is found, a service is busy or down, or your API key is wrong. Errors appear in the search window so you can retry straight away.
- **Safe with existing notes:** if a note already exists, Dictionary Notes opens it or creates a numbered copy. It never overwrites a note.

Definitions support Spanish and any Wiktionary language code. Idioms and quotes are in English. Requires Obsidian 1.13.0 or later.

## Installation

### From Community plugins

1. Open **Settings → Community plugins** and turn off **Restricted mode** if it's on.
2. Select **Browse**, search for **Dictionary Notes**, then select **Install** and **Enable**.

### Manually

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/BurningBurrito/obsidian-dictionary-notes/releases/latest).
2. In your vault folder, create the folder `.obsidian/plugins/dictionary-notes/` and copy the three files into it.
3. Reload Obsidian, then enable **Dictionary Notes** in **Settings → Community plugins**.

## Usage

Select the book icon in the ribbon and choose a type, or open the command palette (<kbd>Ctrl/Cmd</kbd>+<kbd>P</kbd>) and run one of these commands:

| Command | What it does |
| --- | --- |
| **Dictionary Notes: Create new definition note** | Look up a word and pick one of its definitions. |
| **Dictionary Notes: Create new idiom note** | Look up an idiom, or a word in it, and pick the idiom and a meaning. |
| **Dictionary Notes: Create new quote note** | Search for a quote and pick one. |

### Definitions

1. Choose a button at the top of the search window:
   - **English** (or your main language from the Language setting): the word, from your dictionary source.
   - **Español**: a Spanish word, defined in Spanish, from Wikcionario.
   - **Spanish → English**: a Spanish word, explained in English.

   Dictionary Notes remembers the button you used last. To hide the buttons, turn off **Spanish definitions → Spanish in the search window**.
2. Type a word and press <kbd>Enter</kbd>. If a Spanish word isn't found, you're offered close spellings with accents, such as `canción` for `cancion`.
3. If the word is a form of another word, such as `corrí` (of `correr`) or `ran` (of `run`), you can look up the base word instead, or keep the form.
4. If the word has several meanings, choose one. Type to filter the list.
5. The note is created and opened: English words in your Definitions folder, Spanish words in your Spanish folder (default: `Definitions/Español`).

### Idioms

1. Type an idiom, part of one, or a single word in it, such as `break the ice`, `spill beans`, or `ice`, and press <kbd>Enter</kbd>.
2. If what you typed matches an idiom exactly, it's used straight away. Otherwise, choose from the list of matching idioms.
3. If the idiom has several meanings, choose one.
4. The note is created in your Idioms folder and opened.

### Quotes

1. Choose how to search:
   - **Keyword:** words from the quote, such as `imagination is more important`.
   - **Author:** a person's name, such as `Mark Twain` or `einstein`. Lists all of their quotes on Wikiquote.
   - **Topic:** a subject, such as `courage`. Lists Wikiquote's quotes on that topic.
2. Type and press <kbd>Enter</kbd>. Dictionary Notes remembers the search type you used last.
3. Choose a quote. The list shows the author and source, and a label for any quote that isn't firmly sourced. Type to filter by text, author, or source.
4. The note is created in your Quotes folder and opened. Its name is the author and the start of the quote, such as `Albert Einstein - Imagination is more important than knowledge`.

Tips:

- Assign hotkeys in **Settings → Hotkeys** by searching for "Dictionary Notes".
- To hide the ribbon icon, right-click the ribbon and turn it off. The commands keep working.
- The meaning you choose fills `{{definition}}` or `{{meaning}}`. `{{allDefinitions}}` and `{{allMeanings}}` always include every meaning.

## Quote attribution labels

Many famous quotes are credited to people who never said them. Wikiquote tracks this, and Dictionary Notes shows it:

| Label | Meaning |
| --- | --- |
| _(no label)_ | Sourced: in the author's main quotes on Wikiquote, or cited on a topic page. |
| **Attributed (unverified)** | Wikiquote lists it as attributed to the author, without a confirmed original source. |
| **Disputed** | Attributed to the author, but Wikiquote considers the attribution doubtful. |
| **Misattributed** | Wikiquote says the author didn't say it. Its note often says who did. |
| **Unsourced** | Found on a topic page with no citation. |

The label appears in the quote list, in the `attribution` property, and as a warning at the top of the note (the `{{attributionNote}}` variable), including Wikiquote's explanation when there is one.

When you pick a quote found on a topic page, Dictionary Notes looks it up on the author's own Wikiquote page and uses the label from there. On topic pages, the author is taken only from a linked name in the citation. If there's none, the author is "Unknown" and `{{citation}}` shows who Wikiquote names. Work and year are read from Wikiquote's citations and section headings, so they're sometimes empty.

## Settings

The first two settings apply to all three types.

| Setting | Default | Description |
| --- | --- | --- |
| If the note already exists | Open the existing note | Or **Create a new note with a number**, such as `run 2`. |
| Open note after creating it | On | Opens the new note in the current tab. |

Each type has its own section with these three settings:

| Setting | Default | Description |
| --- | --- | --- |
| Note folder | `Definitions`, `Idioms`, or `Quotes` | Folder for new notes of that type. It's created if it doesn't exist. |
| Template file | _(empty)_ | A note to use as the template. Leave empty to use the built-in template. |
| Create an editable template | | Saves the built-in template to `Templates/Definition note.md`, `Templates/Idiom note.md`, or `Templates/Quote note.md` and selects it, so you can change it. |

**Definitions** also has:

| Setting | Default | Description |
| --- | --- | --- |
| Dictionary source | Free Dictionary API | Where definitions come from. |
| Merriam-Webster API key | | Shown only when Merriam-Webster is the source. The key is stored in Obsidian's keychain, not in the plugin's settings file. |
| Language | `en` | Language code for Free Dictionary API and Wiktionary. Merriam-Webster is English only. |
| Use a backup source | On | If the main source fails or has no entry, try Wiktionary instead (or Free Dictionary API when Wiktionary is the main source). |

**Spanish definitions** has:

| Setting | Default | Description |
| --- | --- | --- |
| Spanish in the search window | On | Shows the **English**, **Español**, and **Spanish → English** buttons when looking up a word. |
| Note folder | `Definitions/Español` | Folder for notes about Spanish words, whether defined in Spanish or explained in English. |
| Template file | _(empty)_ | Template for definitions written in Spanish. Leave empty to use the built-in Spanish template. Spanish words explained in English use the Definitions template. |
| Create an editable template | | Saves the built-in Spanish template to `Templates/Spanish definition note.md` and selects it. |

**Idioms** also has:

| Setting | Default | Description |
| --- | --- | --- |
| Use a backup source | On | If Wiktionary fails, look up the exact idiom in Free Dictionary API instead. |

## Templates

A template is a normal note containing `{{variables}}`. When a note is created, each variable is replaced with information from the lookup. Variables the plugin doesn't recognize are left as they are, so syntax from other template plugins keeps working.

These variables work in every template:

| Variable | Contents |
| --- | --- |
| `{{date}}`, `{{time}}` | When the note was created (`YYYY-MM-DD`, `HH:mm`) |
| `{{date:FORMAT}}`, `{{time:FORMAT}}` | Same, in a [Moment.js format](https://momentjs.com/docs/#/displaying/format/), such as `{{date:dddd, MMMM D}}` |
| `{{source}}` | Name of the source used |
| `{{sourceUrl}}` | Link to the entry on the source's website |
| `{{license}}`, `{{licenseUrl}}` | License of the content, and a link to it |

When a variable is the whole value of a property, such as `synonyms: {{synonyms}}`, Dictionary Notes formats it so the properties stay valid: text is quoted when needed, and lists become real list properties. Don't add your own quotes around these variables.

### Definition variables

| Variable | Contents |
| --- | --- |
| `{{word}}` | The word as the dictionary spells it |
| `{{language}}` | Language code of the word, such as `en` or `es` |
| `{{definition}}` | The meaning you chose |
| `{{partOfSpeech}}` | Part of speech of that meaning, such as `noun` |
| `{{phonetic}}` | Pronunciation (IPA, or Merriam-Webster's respelling) |
| `{{example}}` | First example sentence for that meaning |
| `{{examples}}` | All example sentences for that meaning, as a bulleted list |
| `{{synonyms}}` | Synonyms, comma-separated |
| `{{antonyms}}` | Antonyms, comma-separated |
| `{{etymology}}` | Word origin |
| `{{audio}}` | Link to a pronunciation recording |
| `{{allDefinitions}}` | Every meaning, grouped by part of speech, as numbered lists |

Not every dictionary provides every field. An unavailable field is left empty.

| Field | Free Dictionary API | Wiktionary | Merriam-Webster | Wikcionario (Spanish) |
| --- | --- | --- | --- | --- |
| Pronunciation | Yes | No | Yes | Yes |
| Examples | Yes | Rarely | Yes | Often |
| Synonyms and antonyms | Often | No | No | Sometimes |
| Etymology | No | No | Yes | Yes |
| Audio | No | No | Yes | No |

### Idiom variables

| Variable | Contents |
| --- | --- |
| `{{idiom}}` | The idiom as Wiktionary spells it |
| `{{meaning}}` | The meaning you chose |
| `{{partOfSpeech}}` | Part of speech, such as `verb` |
| `{{example}}` | First example sentence for that meaning |
| `{{examples}}` | All example sentences for that meaning, as a bulleted list |
| `{{origin}}` | Where the idiom comes from (Wiktionary's etymology). Empty if Wiktionary has none, or when the backup source is used. |
| `{{allMeanings}}` | Every meaning, as numbered lists |

### Quote variables

| Variable | Contents |
| --- | --- |
| `{{quote}}` | The quote, in English. Lines of verse are separated by ` / `. |
| `{{original}}` | The quote in its original language, when Wikiquote gives an English translation |
| `{{author}}` | Who the quote is credited to, or `Unknown` |
| `{{work}}` | The book, speech, letter, or other work, when Wikiquote names it |
| `{{year}}` | The year, when Wikiquote gives one |
| `{{citation}}` | Wikiquote's full citation, such as `Letter to Max Born (4 December 1926)` |
| `{{status}}` | `Sourced`, `Attributed`, `Disputed`, `Misattributed`, or `Unsourced` |
| `{{attributionNote}}` | A warning callout explaining the label. Empty for sourced quotes. |
| `{{tags}}` | The topic you searched, plus subjects Wikiquote links in the quote, such as `courage`, `soul`. Formatted as valid tags. |

### Built-in templates

Definitions:

```markdown
---
word: {{word}}
part-of-speech: {{partOfSpeech}}
phonetic: {{phonetic}}
synonyms: {{synonyms}}
source: {{source}}
created: {{date}}
tags:
  - dictionary
---
**{{partOfSpeech}}** {{phonetic}}

> {{definition}}

{{examples}}

## All definitions

{{allDefinitions}}

---
Source: [{{source}}]({{sourceUrl}}), {{license}}
```

Definitions written in Spanish:

```markdown
---
word: {{word}}
language: {{language}}
part-of-speech: {{partOfSpeech}}
phonetic: {{phonetic}}
synonyms: {{synonyms}}
source: {{source}}
created: {{date}}
tags:
  - dictionary
  - spanish
---
**{{partOfSpeech}}** {{phonetic}}

> {{definition}}

{{examples}}

## Etimología

{{etymology}}

## Todas las definiciones

{{allDefinitions}}

---
Fuente: [{{source}}]({{sourceUrl}}), {{license}}
```

Idioms:

```markdown
---
idiom: {{idiom}}
meaning: {{meaning}}
part-of-speech: {{partOfSpeech}}
source: {{source}}
created: {{date}}
tags:
  - dictionary
  - idiom
---
> {{meaning}}

{{examples}}

## Origin

{{origin}}

## All meanings

{{allMeanings}}

---
Source: [{{source}}]({{sourceUrl}}), {{license}}
```

Quotes:

```markdown
---
author: {{author}}
work: {{work}}
year: {{year}}
attribution: {{status}}
topics: {{tags}}
source: {{source}}
created: {{date}}
tags:
  - dictionary
  - quote
---
{{attributionNote}}

> {{quote}}
>
> — {{author}}
> {{citation}}

---
Source: [{{source}}]({{sourceUrl}}), {{license}}
```

## Network use and privacy

Dictionary Notes needs an internet connection to look things up. Each lookup sends **only what you typed** to the services below. With Merriam-Webster, your API key is sent along with the word, because Merriam-Webster requires it.

| Service | Used for | Account needed |
| --- | --- | --- |
| [Free Dictionary API](https://freedictionaryapi.com) (`freedictionaryapi.com`) | Definitions (default source), including Spanish words explained in English; backup source for idioms | No |
| [Wiktionary](https://en.wiktionary.org) (`en.wiktionary.org`), run by the [Wikimedia Foundation](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy) | Definitions (optional source and default backup), including Spanish words explained in English; idiom search, meanings, and origin | No |
| [Wikcionario](https://es.wiktionary.org) (`es.wiktionary.org`), the Spanish Wiktionary, run by the Wikimedia Foundation | Definitions written in Spanish, and spelling suggestions for Spanish words | No |
| [Merriam-Webster Dictionary API](https://dictionaryapi.com) (`dictionaryapi.com`) | Definitions (optional source) | Yes. Requires a free account and API key. Free keys are for non-commercial use under [Merriam-Webster's terms](https://dictionaryapi.com/info/terms-of-service). |
| [Wikiquote](https://en.wikiquote.org) (`en.wikiquote.org`), run by the Wikimedia Foundation | Quote search and quotes | No |
| [Wikidata](https://www.wikidata.org) (`www.wikidata.org`), run by the Wikimedia Foundation | Checking whether a Wikiquote page is about a person, so quotes are credited correctly | No |

A quote search sends a few requests: one search, then one request for each Wikiquote page read (up to four for a keyword search) and a short Wikidata check for each page.

Dictionary Notes has no telemetry or analytics, and it doesn't read or send your notes. Each service may log requests under its own policies.

## Content and licensing

- **Definitions** from Free Dictionary API and Wiktionary come from [Wiktionary](https://en.wiktionary.org) and are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Definitions written in Spanish come from [Wikcionario](https://es.wiktionary.org) and are also licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Definitions from Merriam-Webster are © Merriam-Webster, Inc. and subject to [their terms](https://dictionaryapi.com/info/terms-of-service).
- **Idioms** come from [Wiktionary](https://en.wiktionary.org) (directly, or through Free Dictionary API) and are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- **Quotes** come from [Wikiquote](https://en.wikiquote.org), whose collection is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Quotes from works that are still under copyright remain their authors' and are included on Wikiquote under fair use, as described in [Wikiquote's copyright policy](https://en.wikiquote.org/wiki/Wikiquote:Copyrights).
- **Wikidata** is used only to check whether a page is about a person. Nothing from it is saved in your notes. Its data is available under [CC0](https://www.wikidata.org/wiki/Wikidata:Copyright).

If you publish notes that contain this content, keep the attribution. The built-in templates add a source line for this.

## Upgrading from 1.1

Your settings, templates, and hotkeys carry over. What's new:

- **Spanish definitions:** the definitions search window has **English**, **Español**, and **Spanish → English** buttons. It starts on **English**, which works as before. To hide the buttons, turn off **Spanish definitions → Spanish in the search window**.
- **Forms of words:** looking up a form such as `ran` offers the base word (`run`) first. You can keep the form.
- **Fixed:** source links from Free Dictionary API for phrases such as `ice cream` now work, and non-English words link to their language's section on Wiktionary.
- **Properties:** a single word with accents, such as `café`, is no longer put in quotes. Both forms are valid.

## Upgrading from 1.0

Your settings, templates, and hotkeys carry over. What changed:

- **Definitions** work as before. The command is now called **Create new definition note**, and existing hotkeys for it keep working.
- **The ribbon icon** now opens a menu with **Definition**, **Idiom**, and **Quote**.
- **The default Definitions folder** is now `Definitions` instead of `Dictionary`. If you ever changed any Dictionary Notes setting, your folder setting was saved and doesn't change. If you never opened the settings, new definition notes go to `Definitions`. Your existing notes aren't moved; to keep using `Dictionary`, set it under **Definitions → Note folder**.
- **Create an editable template** now saves the Definitions template as `Templates/Definition note.md`. A template you created before (`Templates/Dictionary note.md`) keeps working.

## Troubleshooting

| Message | What to do |
| --- | --- |
| You appear to be offline | Check your internet connection. |
| No definitions found | Check the spelling. Merriam-Webster suggests alternatives you can select. Words are searched as typed, then in lowercase. |
| No idioms found | Try fewer words or a single key word, such as `bucket` instead of `kicked the bucket over`. |
| No quotes found | Try fewer or different words, or search by author or topic. |
| "…" isn't a person on Wikiquote | Author search lists people only. For groups, works, or subjects, use a keyword or topic search. |
| … has received too many requests | The service is limiting requests. Wait the time shown, or turn on **Use a backup source**. |
| … is having problems / took too long to respond | The service is down or slow. Try again later, or switch to another source. |
| Merriam-Webster needs an API key / rejected the API key | Add or check your key in settings. Make sure it's a key for the **Collegiate Dictionary**. |
| Template "…" was not found | The template file was moved or deleted. Choose it again in settings. |

## Development

```bash
npm install
npm run dev     # rebuild on every change
npm run build   # type-check and production build
npm run lint    # Obsidian's official ESLint rules
```

If a `test-vault/` folder exists in the project, `npm run dev` copies `main.js`, `manifest.json`, and `styles.css` into `test-vault/.obsidian/plugins/dictionary-notes/` after every build. Open `test-vault/` as a vault to try changes without touching your real notes. The [Hot Reload](https://github.com/pjeby/hot-reload) plugin reloads the plugin automatically. `test-vault/` is gitignored.

The code is organized by lookup type. `src/core/` has the shared flow, network, error, and note code; `src/lookups/definitions/`, `src/lookups/idioms/`, and `src/lookups/quotes/` each implement the `LookupType` interface in `src/lookups/lookup-type.ts`.

### Releasing

1. Run `npm version patch` (or `minor` / `major`). This updates `package.json`, `manifest.json`, and `versions.json`, commits, and creates a tag such as `1.0.1` (no `v` prefix).
2. Run `git push --follow-tags`.
3. The **Release Obsidian plugin** workflow builds the plugin and creates a draft GitHub release with `main.js`, `manifest.json`, and `styles.css`. Review it on GitHub, then publish it.

## Credits

- Inspired by [Book Search](https://github.com/anpigon/obsidian-book-search-plugin) by anpigon (MIT License). Dictionary Notes follows its workflow but doesn't include its code.
- Built from the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
- Definitions by [Free Dictionary API](https://freedictionaryapi.com), [Wiktionary](https://en.wiktionary.org), [Merriam-Webster](https://dictionaryapi.com), and [Wikcionario](https://es.wiktionary.org).
- Idioms by [Wiktionary](https://en.wiktionary.org), with [Free Dictionary API](https://freedictionaryapi.com) as a backup.
- Quotes by [Wikiquote](https://en.wikiquote.org), with person checks by [Wikidata](https://www.wikidata.org).

## License

[MIT](LICENSE)
