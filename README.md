# Dictionary Notes

Look up a word in a dictionary and create a note from its definition using your own template.

Type a word, pick the meaning you want, and Dictionary Notes creates a note named after the word, in the folder you choose, filled in from a template you can customize.

<!--
Screenshots to add (save them in docs/ and uncomment):
![Search window](docs/search.png)
![Choosing a definition](docs/choose-definition.png)
![A created word note](docs/word-note.png)
-->
_Screenshots coming soon._

## Features

- **Quick lookup:** run **Create new word note** from the command palette or select the book icon in the ribbon. If you have text selected in a note, it's used as the search word.
- **Pick the meaning you want:** words with several meanings show a list you can filter by typing.
- **Notes from a template:** each note is named after the word and saved in your chosen folder (default: `Dictionary`). Use the built-in template or your own.
- **Three dictionary sources:**
  - Free Dictionary API (default, no account needed)
  - Wiktionary (no account needed)
  - Merriam-Webster (needs a free API key)
- **Many languages:** Free Dictionary API and Wiktionary support any Wiktionary language code, such as `es` or `fr`.
- **Backup source:** if the main source is down or has no entry, Dictionary Notes can automatically try another one.
- **Clear errors:** you get a plain message when you're offline, a word isn't found, a service is busy or down, or your API key is wrong. Errors appear in the search window so you can retry straight away.
- **Safe with existing notes:** if a note for the word already exists, Dictionary Notes opens it or creates a numbered copy. It never overwrites a note.

Requires Obsidian 1.13.0 or later.

## Installation

### From Community plugins

1. Open **Settings → Community plugins** and turn off **Restricted mode** if it's on.
2. Select **Browse**, search for **Dictionary Notes**, then select **Install** and **Enable**.

### Manually

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/BurningBurrito/dictionary-notes/releases/latest).
2. Copy them to `<your vault>/.obsidian/plugins/dictionary-notes/`.
3. Reload Obsidian, then enable **Dictionary Notes** in **Settings → Community plugins**.

## Usage

1. Open the command palette (<kbd>Ctrl/Cmd</kbd>+<kbd>P</kbd>) and run **Dictionary Notes: Create new word note**, or select the book icon in the ribbon.
2. Type a word and press <kbd>Enter</kbd>.
3. If the word has several meanings, choose one. Type to filter the list.
4. The note is created and opened.

Tips:

- Assign a hotkey in **Settings → Hotkeys** by searching for "Create new word note".
- To hide the ribbon icon, right-click the ribbon and turn it off.
- The meaning you choose fills `{{definition}}` and related variables. `{{allDefinitions}}` always includes every meaning.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Note folder | `Dictionary` | Folder for new word notes. It's created if it doesn't exist. |
| Template file | _(empty)_ | A note to use as the template. Leave empty to use the built-in template. |
| Create an editable template | | Saves the built-in template to `Templates/Dictionary note.md` and selects it, so you can change it. |
| If the note already exists | Open the existing note | Or **Create a new note with a number**, such as `run 2`. |
| Open note after creating it | On | Opens the new note in the current tab. |
| Dictionary source | Free Dictionary API | Where definitions come from. |
| Merriam-Webster API key | | Shown only when Merriam-Webster is the source. The key is stored in Obsidian's keychain, not in the plugin's settings file. |
| Language | `en` | Language code for Free Dictionary API and Wiktionary. Merriam-Webster is English only. |
| Use a backup source | On | If the main source fails or has no entry, try Wiktionary instead (or Free Dictionary API when Wiktionary is the main source). |

## Templates

A template is a normal note containing `{{variables}}`. When a word note is created, each variable is replaced with information about the word. Variables the plugin doesn't recognize are left as they are, so syntax from other template plugins keeps working.

### Variables

| Variable | Contents |
| --- | --- |
| `{{word}}` | The word as the dictionary spells it |
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
| `{{source}}` | Name of the dictionary used |
| `{{sourceUrl}}` | Link to the word on the dictionary's website |
| `{{license}}`, `{{licenseUrl}}` | License of the definitions, and a link to it |
| `{{date}}`, `{{time}}` | When the note was created (`YYYY-MM-DD`, `HH:mm`) |
| `{{date:FORMAT}}`, `{{time:FORMAT}}` | Same, in a [Moment.js format](https://momentjs.com/docs/#/displaying/format/), such as `{{date:dddd, MMMM D}}` |

Not every source provides every field. An unavailable field is left empty.

| Field | Free Dictionary API | Wiktionary | Merriam-Webster |
| --- | --- | --- | --- |
| Pronunciation | Yes | No | Yes |
| Examples | Yes | Rarely | Yes |
| Synonyms and antonyms | Often | No | No |
| Etymology | No | No | Yes |
| Audio | No | No | Yes |

### Properties (frontmatter)

When a variable is the whole value of a property, such as `synonyms: {{synonyms}}`, Dictionary Notes formats it so the properties stay valid: text is quoted when needed, and lists like synonyms become real list properties. Don't add your own quotes around these variables.

### Built-in template

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

## Network use and privacy

Dictionary Notes needs an internet connection to look up words. Each lookup sends **only the word you typed** to the dictionary service selected in settings, and to the backup service if the backup option is on and the first one fails. With Merriam-Webster, your API key is sent along with the word, because Merriam-Webster requires it.

| Service | Used for | Account needed |
| --- | --- | --- |
| [Free Dictionary API](https://freedictionaryapi.com) (`freedictionaryapi.com`) | Default source | No |
| [Wiktionary REST API](https://en.wiktionary.org/api/rest_v1/) (`en.wiktionary.org`), run by the [Wikimedia Foundation](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy) | Optional source, and the default backup | No |
| [Merriam-Webster Dictionary API](https://dictionaryapi.com) (`dictionaryapi.com`) | Optional source | Yes. Requires a free account and API key. Free keys are for non-commercial use under [Merriam-Webster's terms](https://dictionaryapi.com/info/terms-of-service). |

Dictionary Notes has no telemetry or analytics, and it doesn't read or send your notes. Each service may log requests under its own policies.

## Definitions and licensing

- Definitions from **Free Dictionary API** and **Wiktionary** come from [Wiktionary](https://en.wiktionary.org) and are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). If you publish notes that contain them, keep the attribution. The built-in template adds a source line for this.
- Definitions from **Merriam-Webster** are © Merriam-Webster, Inc. and subject to [their terms](https://dictionaryapi.com/info/terms-of-service).

## Troubleshooting

| Message | What to do |
| --- | --- |
| You appear to be offline | Check your internet connection. |
| No definitions found | Check the spelling. Merriam-Webster suggests alternatives you can select. Words are searched as typed, then in lowercase. |
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

### Releasing

1. Run `npm version patch` (or `minor` / `major`). This updates `package.json`, `manifest.json`, and `versions.json`, commits, and creates a tag such as `1.0.1` (no `v` prefix).
2. Run `git push --follow-tags`.
3. The **Release Obsidian plugin** workflow builds the plugin and creates a draft GitHub release with `main.js`, `manifest.json`, and `styles.css`. Review it on GitHub, then publish it.

## Credits

- Inspired by [Book Search](https://github.com/anpigon/obsidian-book-search-plugin) by anpigon (MIT License). Dictionary Notes follows its workflow but doesn't include its code.
- Built from the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
- Definitions by [Free Dictionary API](https://freedictionaryapi.com), [Wiktionary](https://en.wiktionary.org), and [Merriam-Webster](https://dictionaryapi.com).

## License

[MIT](LICENSE)
