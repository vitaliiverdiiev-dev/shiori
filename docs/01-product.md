# 01 — Shiori Product Brief

## Purpose

Build **Shiori**, a free, open-source, self-hosted Japanese learning application. It is a personal learning tool and a real full-stack engineering project—not a commercial product. Anyone should eventually be able to run their own instance (preferably with a one-command Docker Compose startup after initial configuration).

Build **Shiori from scratch** in a new repository named `shiori`. Keep universal implementation decisions reusable for other self-hosted apps (organizer, finance tracker, electronics inventory), but do not build a separate starter framework now.

## Canonical product identity

The **only authoritative source** for the current brand strings is root `product.config.json`:

- Product: **Shiori**
- Japanese full title: **日本語の栞** (Nihongo no Shiori)
- Logo glyph: **栞**
- English tagline: **Your Guide to Japanese**
- Repository: **`shiori`**

The logo is the glyph itself for M00, rendered with an appropriate Japanese-capable font; do not build an elaborate graphic identity. Brand/legal availability can be revisited if the public release requires it. Theme colors/radii/typography belong to semantic CSS tokens, not the identity JSON file. This JSON is _product identity configuration_, not a home for deployment secrets.

## Core learning experience (future product scope)

Learn **hiragana, katakana, kanji and vocabulary together** with explicit relationships:

- Word → written forms, kana reading(s), meaning(s), pronunciation, examples.
- Word → constituent kanji → other useful words with those kanji. Suggestions must not silently flood the study queue.
- A kanji may have multiple readings; in-word readings must be evaluated in context. Never assume one single romaji answer for every standalone kanji.
- Distinguish learning/progress for recognition, meaning, reading, typed writing, and eventually handwriting.

### Practice modes

1. **Quick practice**: show kana/kanji/word; user types romaji or the requested Japanese reading; immediate green/red feedback, reveal correct answer after errors, advance quickly.
2. **Detailed practice**: after every attempt reveal reading, meaning, and relevant word/kanji links.
3. **Self-assessed flashcards**: flip and mark "knew" / "didn't know"; schedule review accordingly.
4. **Writing practice** (later): demonstrate stroke order and practice drawing with pointer/stylus, with robust feedback added only when feasible.

For meaning → Japanese, accept Japanese IME input and possible kana/kanji choices. Handle browser composition events; do not validate halfway through an IME composition. Transliteration, alternate readings and accepted variants require domain-specific evaluation, not naïve string equality.

### Organization

- Curated content collections (kana, starter vocabulary, basic kanji, real-world topics).
- Personal collections, saved words, session history, spaced repetition.
- No grammar course or free-form sentence grading initially. Examples may appear for context.
- English/Japanese learning content initially. Structure for future localization (including Ukrainian) without implementing full i18n in M00.

## Self-hosting and identity (future scope)

- Multi-user server with isolated user data.
- First administrator bootstrap and registration modes: `open`, `invite`, `closed`.
- Secure email/password sessions; consider Google sign-in later as a provider addition rather than a redesign.
- Docker Compose on a single host first; images can be published to GHCR later. Cloud providers (AWS etc.) are _not_ a first milestone.
- Public code license to be selected; dictionary/kanji/audio licenses must be reviewed separately before bundling or redistribution.

## Offline/mobile (future scope)

- Mobile-first web/PWA, intentionally app-like on phones; native React Native/Expo client later.
- Download selected content packs, keep progress locally, sync completed attempts when connectivity returns.
- Shared domain rules and API contracts across web and mobile; platform-specific UI and storage adapters.

## Explicit non-goals for initial bootstrap

No Japanese data, database, sign-up flows, OAuth, handwriting recognition, sync engine, admin panels, tables, modals, comprehensive design system, Expo app, Kubernetes, or commercial functionality. M00 does establish reusable UI basics, real product identity, and the initial full-stack application shell.
