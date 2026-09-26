# MERLIN

**Not That One.**

A short gothic horror-comedy browser adventure: a cursed village at the foot of a vampire’s castle, three questionable heroes, d20 checks with real stakes, two shops, and a Count who will correct you before he bites you.

Static single-page app. No build step. No network requests at runtime.

## Play

Open [`index.html`](index.html) directly in a browser (`file://`), or drop this folder on [Netlify](https://www.netlify.com/) with publish directory `.` and no build command (`netlify.toml` is already set).

## Files

| File | Role |
|------|------|
| `index.html` | Shell |
| `style.css` | Gothic candlelight UI |
| `data.js` | Characters, items, shops, encounters, scene graph |
| `engine.js` | Dice, combat, economy, `localStorage` |
| `ui.js` | Typewriter, sheet, shops, combat UI |

Progress autosaves to `localStorage` under `merlin.save.v1` on every scene change, shop purchase, level-up, and combat turn. Refresh resumes mid-scene (and mid-fight). Use **New Game** to erase the save. The guest book lives in `merlin.fates.v1`; the castle-gate checkpoint in `merlin.gate.v1`; today's Daily Curse record in `merlin.daily.v1`.

## The Oronath engine (v2)

`dice.js`, `arc.js` and `characters.js` are the reusable engine for **"The Last Signal of Oronath"** — a real dice system (d20/d10/2d6 with difficulty tiers and complications that branch rather than let you retry), an arc schema with a validator that rejects a broken arc *before* play, and a character system whose traits shift difficulty and grant advantage. They expose `window.OronathDice`, `window.OronathArc` and `window.OronathCast`; the shipped v1 game does not load them.

**Play the first arc:** open [`oronath.html`](oronath.html) (`file://` or via [The Last Signal of Oronath](oronath.html) on the splash screen). It loads the validated bundle `arcs/last-signal.js` (`window.OronathArcBundle`). `loop.js` + `persist.js` drive chapter → choice → real roll → branch (no retries); saves live under `oronath.save.v1` (separate from the v1 MERLIN save). `sample-arc.js` ("The Last Wick") remains loadable as the fallback and as the suite fixture if the bundle script is absent.

Run the tests with no framework, no build and no dependencies:

```bash
node tests/dice.test.js && node tests/arc.test.js && node tests/characters.test.js && node tests/loop.test.js && node tests/persist.test.js && node tests/build-arc.test.js && node tests/last-signal.test.js
```

Each prints one `ok` line on success and a failure list otherwise. [`tests/harness.html`](tests/harness.html) runs the five engine suites in a browser — open it from `file://` and read the console. `tests/build-arc.test.js` and `tests/last-signal.test.js` are Node-only (they exercise `fs` and the local generator).

## Arc pre-generation (roadmap 2.6)

Arcs are built **before** play, on your machine. The browser only loads a finished IIFE script; there is no API key and no runtime network request on the site.

**Rebuild the shipped arc (keyless — how 2.8 ships):**

```bash
node tools/build-arc.js --from arcs/last-signal.json --out arcs/last-signal.js
```

**Generate via a provider** (key from the environment only; never commit it):

```bash
export XAI_API_KEY=…          # or OPENAI_API_KEY for --provider openai
node tools/build-arc.js --provider grok --out arcs/your-arc.js
# optional: --spec brief.txt  --model <name>
```

A missing key prints a clear message and exits 2. Validation always runs before write; an invalid arc prints every rule violation by path and writes nothing. [`oronath.html`](oronath.html) loads `<script src="arcs/last-signal.js"></script>` after `sample-arc.js` — it assigns `window.OronathArcBundle`. Without that tag, the page plays `sample-arc.js` (`window.OronathSample`).

**Deploy (roadmap 2.7):** Netlify still publishes `.` with no build command (`netlify.toml` unchanged). Commit the generated `.js`, push `main`, and verify https://merlin-dnd.netlify.app/oronath.html.
