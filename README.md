# Pie Study

Pie Study is a study home for your Obsidian vault. It turns lesson notes into a map you can see at a glance, tracks how well you understand each lesson, and tells you what is due for review.

## What it does

- **Lesson map.** Shows the lessons of a learning path grouped by area, with each lesson's status: not started, in progress, solid, or due for review.
- **Understanding tracker.** Reads which kinds of understanding you have shown for a lesson (essence, mechanism, application, and more) and shows the gaps.
- **Concept maps.** Renders the Mermaid diagram under a lesson's `## Sơ đồ khái niệm` heading, and merges lesson maps into one map per area.
- **Review.** Flashcards written in your notes, quests and quizzes, scheduled with the FSRS spaced-repetition algorithm.
- **Study log.** Shows the study notebook of each path: what you studied, when, and where you stopped.

The interface is in Vietnamese, with English available.

## How it reads your vault

Pie Study reads lesson notes that carry `learn_*` frontmatter properties, for example `learn_curriculum`, `learn_understood`, `learn_reviewed`, `learn_next` and `learn_dimension`. You can write these properties by hand, but they are normally written by the study skills of Pie Agent (see below).

## Pie Agent (optional, paid)

The "study with Pie Agent" buttons hand a lesson to [Pie Agent](https://pieofmind.work), an AI assistant plugin for Obsidian. Pie Agent is not in the community directory, and this integration needs **Pie Agent Pro, which is a paid product**. Without it, Pie Study still shows your maps, progress and reviews, and the buttons copy the command for you to paste elsewhere.

Pie Study only talks to Pie Agent through Pie Agent's public plugin API inside Obsidian. Pie Study itself sends nothing over the network.

## Files it writes

- `Pie Study/` in your vault: practice logs, the source library (`kho-nguon.json`, plus copies of files you add to it), and two guide notes for Pie Agent on how to write lectures and quizzes.
- The `learn_materials` property of a lesson note, only when you attach or remove a study material from Pie Study. No other property is changed.

It never touches files outside your vault.

## Network use

None. Fonts and icons are bundled. The plugin makes no network requests and collects no telemetry.

## Install

Settings → Community plugins → Browse → search "Pie Study". Or copy `main.js`, `manifest.json` and `styles.css` from a release into `.obsidian/plugins/pie-study/`.

## Build

```bash
npm install
npm run build
```

## Credits

- Be Vietnam Pro font, SIL Open Font License 1.1 (via Fontsource), embedded in `styles.css`.
- Microsoft Fluent Emoji icons (MIT), 14 flat SVGs in `assets/fluent-flat/`. License: `THIRD_PARTY/fluentui-emoji-LICENSE`.
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT), [d3](https://d3js.org) (ISC) and [yaml](https://eemeli.org/yaml/) (ISC).

## License

MIT
