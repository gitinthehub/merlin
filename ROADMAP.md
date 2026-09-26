# MERLIN — Product Roadmap

**Live:** https://merlin-dnd.netlify.app · **Repo:** github.com/gitinthehub/merlin · **Host:** Netlify (static — publish dir `.`, no build command)

A short gothic horror-comedy dice adventure for the browser. Three pregens, one cursed village, a vampire Count who will correct you before he bites you. One night, ~10–15 minutes, four endings.

This file is the **source of truth**. Every push that completes or changes a roadmap item updates this file in the same commit.

**Status key:** ✅ done · 🔨 in progress · ⬜ not started
**Size key:** S = hours · M = a day or so · L = days

---

## v1.0 — shipped ✅

| # | Item | Delivered |
|---|------|-----------|
| 0.1 | ✅ Scene-graph engine | `data.js` (content) + `engine.js` (pure logic, no DOM) + `ui.js` (render) + `style.css` |
| 0.2 | ✅ d20 core | `d20 + stat` vs DC, advantage (roll 2 keep best), nat 20 = critical success, nat 1 = critical fail, equation line printed to the player |
| 0.3 | ✅ 3 pregens | Bram Hollow (MIGHT, gravedigger), Sister Vellum (SPIRIT, defrocked nun), Pip Ledger (WITS, failed accountant) — distinct stats, voices, and one signature special each |
| 0.4 | ✅ 22-node scene graph | `select → arrival → inn → hearth → mayor → churchyard → fight_ghoul → after_ghoul → marsh → pox → fight_wight → after_wight → gate → foyer → ledger → throne → fight_count → 4 endings + death` |
| 0.5 | ✅ Economy | 2 shops (Hearth & Nail, Cousin Pox's Cart), gold, XP curve (0/20/50), level-ups that raise max HP and a stat |
| 0.6 | ✅ Combat | 3 encounters (ghoul, marsh wight, Count Merlin), telegraphed enemy moves, attack / special / item / flee, Brace |
| 0.7 | ✅ Persistence | `localStorage` key `merlin.save.v1`, written on every scene change, shop transaction, level-up and combat turn; refresh resumes mid-scene and mid-fight |
| 0.8 | ✅ QA | Sol (Grok Bot) passes 1–3; all 17 findings of pass 1 fixed; live build verified |

---

## v1.1 — Make the night land 🔨

The polish pass: the dice have to *look* like dice, the heroes have to have faces, and the four best ideas from Grok Bot's Ideas Guy go in.

| # | Item | Size | Depends on | Status |
|---|------|------|-----------|--------|
| 1.1 | **A die you can see.** Replace the text-only roll chip with a real rendered polyhedral die (d20 / d10 / 2d6) that tumbles and lands showing the face that was actually rolled — d20 with the rolled number upright on the top face, advantage showing both dice with the kept one highlighted, nat 20 / nat 1 called out on the die itself. Respects `prefers-reduced-motion` (static face, no tumble). Pure CSS/SVG — no image assets, no new dependency. | M | — | ⬜ |
| 1.2 | **Character portraits.** A painted portrait for each pregen on the select screen and in the character sheet, so the player knows who they are picking. Art in `images/char-*.png`, wired as `<img>` with the existing glyph as the fallback if a file is missing. | S | art | ⬜ |
| 1.3 | **The Count's Epitaph Card** — every ending (deaths included) produces a shareable image card: character, ending title, run stats (nat 20s, nat 1s, gold wasted), one custom line from the Count, and the site URL, with one "Copy / Save image" button. | M | — | ✅ |
| 1.4 | **Fates Ledger with the Count's hints** — an endings screen showing which endings you have found and which are still locked, with a snide but useful Count hint for each locked one; stored in its own save slot so New Game does not wipe it. | S | — | ✅ |
| 1.5 | **He Remembers You** — carry a little memory between runs (last character, how you died, which ending) and have the Count and Clarence bring it up. | M | 1.4 | ✅ |
| 1.6 | **Call Him a Wizard** — optional dialogue choices that make you deliberately call him a wizard, with a hidden counter: each jab makes him flustered (next telegraphed move weaker) or furious (hits harder), and enough jabs unlock a secret ending or special epitaph. | S–M | — | ✅ |
| 1.7 | **Visual roadmap page.** `roadmap.html` — every plot point below as a card with its art, the check it demands, and a live dice animation for that check; every roadmap phase as a milestone chip with an animated die badge. Linked from the splash screen. Plain HTML/CSS/JS at the repo root, same zero-dependency contract as the game. | M | 1.1, 1.2 | ⬜ |

---

## Story plot points (art + the roll each one demands)

These are the beats of the shipped arc. Each one has a painted asset in `images/` and uses it on the roadmap page.

| Beat | Node(s) | Art asset | The roll it demands |
|------|---------|-----------|---------------------|
| 1. The cart at dusk | `arrival` — Hallowmere Gate | `images/beat-gate.png` | WITS d20 vs DC 12 |
| 2. The Gutted Goose | `inn`, `hearth` | `images/beat-inn.png` | — (shop + rest) |
| 3. Hearth & Nail | `hearth` (shop) | `images/beat-shop.png` | — (gold only) |
| 4. The Square | `mayor` | `images/beat-square.png` | WITS d20 vs DC 13 |
| 5. The Churchyard | `churchyard` → `fight_ghoul` → `after_ghoul` | `images/beat-churchyard.png` | SPIRIT d20 vs DC 14 · WITS d20 vs DC 15 · then the ghoul |
| 6. The Marsh Road | `marsh`, `pox` → `fight_wight` → `after_wight` | `images/beat-marsh.png` | WITS d20 vs DC 13, then the wight |
| 7. Castle Gate & Foyer | `gate`, `foyer` | `images/beat-castle.png` | WITS d20 vs DC 14 · MIGHT d20 vs DC 16 (or the ledge) |
| 8. The Throne Room | `ledger`, `throne` → `fight_count` | `images/beat-throne.png` | WITS d20 vs DC 12 · SPIRIT d20 vs DC 13/11 · WITS d20 vs DC 15/16, then Count Merlin (AC 14) |

Four endings resolve here — The Stake, The Correction, The Board, Flight — plus `death` (An Epitaph). **All branches resolve; no loose threads.**

---

## Top 4 ideas (from Grok Bot's *Ideas Guy*)

_Ranked by the bot, in its own words. Source: Grok Bot → **Ideas Guy**, 2026-09-26 12:56 AM ET. The bot's own framing: ranked by how likely each one is to make a player share it._

**1. The Count's Epitaph Card (M).** Every ending, deaths included, produces a shareable image card. It shows the character, the ending title, a few run stats (nat 20s, nat 1s, gold wasted), and one custom line from the Count, like "Died to a ghoul. A GHOUL. Not a wizard." Add a single "Copy / Save image" button with the URL on the card. You already have a separate death text for each cause, so the funniest lines are written; this gets them out of the browser tab and in front of new players.

**2. Fates Ledger with hints from the Count (S).** Add an endings screen that shows which endings you've found and which are still locked. For each locked one, the Count gives a snide, slightly useful hint ("There is an ending where you live and I am improved. You won't find it."). Store it in its own save slot so "New Game" doesn't wipe it. With a 10–15 minute game and several endings, this is the cheapest way to turn one playthrough into three.

**3. He Remembers You (M).** Carry a little memory between runs: the last character you played, how you died, and which ending you got. The Count and Clarence bring it up ("You again. Last time you fled. Clarence logged it."). Players who replay get something new, and it's the kind of surprise people screenshot.

**4. Call Him a Wizard (S–M).** Add optional dialogue choices where you deliberately call him Merlin the wizard. A hidden counter tracks how many times you do it. Each jab has a real cost or benefit: he gets flustered and his next telegraphed move is weaker, or he gets furious and hits harder. Enough jabs unlock a secret ending or a special epitaph. This turns the game's best joke into a risk the player chooses, and it gives people a strategy to argue about ("I called him a wizard 6 times and lived").

---

## v2.0 — MERLIN becomes the ORONATH engine ⬜

The product brief: turn the shipped arc into a **reusable, data-driven dice-narrative engine**, with *The Last Signal of Oronath* as the first arc it proves itself on. Mechanics are real logic, never prompted behaviour. Arcs are **pre-generated in full before gameplay**, validated against a schema, and every character arc resolves.

**Standing decision (reversible, recorded not escalated):** the client stays a zero-dependency static app and keeps working from `file://`; anything that needs a secret key (LLM arc pre-generation) is an *optional* server, and a pre-generated arc ships bundled so the game plays offline with no server present. Netlify keeps hosting the client because the site is already there; if the arc-builder server becomes real it follows the Node/Express-on-Heroku pattern of Lock's other apps. Flag before changing this.

| # | Item | Deliverables | Size | Depends on | Status |
|---|------|--------------|------|-----------|--------|
| 2.1 | **Core dice engine** | `dice.js`: d20 / d10 / 2d6 as standalone, testable functions; difficulty tiers (Easy 8+, Medium 11+, Hard 14+, Very Hard 16+); crit rules (lowest roll = major complication, not a plain failure; max roll = bonus/advantage); advantage and per-character "advantage due to build"; zero UI and zero LLM coupling. Table-driven self-test against known cases. | M | — | ⬜ |
| 2.2 | **Arc schema + validator** | Data shape `arc → chapters(3–5) → choices(2–4) → consequences`; a validator that rejects an arc with a dangling branch, an unresolved character thread, a missing success/failure consequence, or a chapter count outside 3–5. Arcs are pre-generated and validated *before* play. | M | — | ⬜ |
| 2.3 | **Character system** | Stats/traits tied to arcs; traits modify roll difficulty and can grant advantage ("advantage due to build"); per-character arc threads that the validator requires to resolve by the final chapter. | S | 2.1, 2.2 | ⬜ |
| 2.4 | **Gameplay loop / UI** | Chapter state, choices, roll results and dice faces rendered to the player; progress through the arc; per-chapter objective display. Failure always opens a new branch — never a retry of the same roll. | M | 2.1–2.3 | ⬜ |
| 2.5 | **Persistence** | Save/resume an in-progress run (extends the existing `localStorage` save with an arc-run envelope and a version field for migration). | S | 2.4 | ⬜ |
| 2.6 | **Arc pre-generation** | Optional Node/Express endpoint that hands the schema contract to an LLM and returns a whole validated arc before gameplay starts; bundled fallback arc so no key and no network are required to play. | L | 2.2 | ⬜ |
| 2.7 | **Deployment** | Client stays on Netlify (zero build); if 2.6 lands, the arc-builder server deploys to Heroku per the house pattern. Deploy verified against the live URL each time, not just by a green CLI exit. | S | 2.6 | ⬜ |
| 2.8 | **First arc: The Last Signal of Oronath** | Chapters 1–4 (The Signal Tree · The Echo Field · The Axe Lock · The Signal Core); John (memory/identity), Joel (legacy, the carved axe), Rafe (speed, alien origin, return-home); the three pre-written end states. Written as data, validated by 2.2, played through 2.4. | L | 2.1–2.4 | ⬜ |

**Mechanics that must be real logic, not prompt text** (from the brief): difficulty scaling, crit outcomes, and "every meaningful action requires a roll; failure creates a new consequence, never a retry".

---

## Escalations, defaults and open questions

| Date | Item | Decision | Note |
|------|------|----------|------|
| 2026-09-26 | Where the Oronath engine lives | **Inside this repo** — MERLIN becomes the v2 engine and Oronath becomes its first arc (owner's call) | Recorded rather than escalated |
| 2026-09-26 | Client architecture in v2 | Static, zero-dependency client + optional arc-builder server | Reversible; see v2.0 note |

---

## Changelog

- **2026-09-26** — Pass 4: Epitaph Card, Fates Ledger, He Remembers You, Call Him a Wizard (roadmap 1.3–1.6).
- **2026-09-26** — Roadmap created. v1.0 recorded as shipped; v1.1 (dice you can see, character portraits, Ideas Guy's top 4, visual roadmap page) and v2.0 (the Oronath engine) opened.
