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

## The Oronath engine (v2, in progress)

`dice.js`, `arc.js` and `characters.js` are the reusable engine for the **"The Last Signal of Oronath"** arc — a real dice system (d20/d10/2d6 with difficulty tiers and complications that branch rather than let you retry), an arc schema with a validator that rejects a broken arc *before* play, and a character system whose traits shift difficulty and grant advantage. They expose `window.OronathDice`, `window.OronathArc` and `window.OronathCast`; the shipped v1 game does not load them yet.

Run the tests with no framework, no build and no dependencies:

```bash
node tests/dice.test.js && node tests/arc.test.js && node tests/characters.test.js
```

Each prints one `ok` line on success and a failure list otherwise. [`tests/harness.html`](tests/harness.html) runs the same three suites in a browser — open it from `file://` and read the console.

