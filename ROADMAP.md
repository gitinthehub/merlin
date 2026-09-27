# MERLIN — Product Roadmap

**Live:** https://merlin-dnd.netlify.app · **Repo:** github.com/gitinthehub/merlin · **Host:** Netlify (static — publish dir `.`, no build command)

A short gothic horror-comedy dice adventure for the browser. Three pregens, one cursed village, a vampire Count who will correct you before he bites you. One night, ~10–15 minutes, four endings.

This file is the **source of truth**. Every push that completes or changes a roadmap item updates this file in the same commit.

**`roadmap.html` and `roadmap.js` mirror this file** — `roadmap.js` carries its own copy of the milestone list and the plot-point cards. Any change to an item's status or name here MUST be made there too, in the same commit. The two have drifted apart twice; a public page that contradicts the roadmap it mirrors is worse than no page.

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

## v1.1 — Make the night land ✅

The polish pass: the dice have to *look* like dice, the heroes have to have faces, and the four best ideas from Grok Bot's Ideas Guy go in.

| # | Item | Size | Depends on | Status |
|---|------|------|-----------|--------|
| 1.1 | **A die you can see.** Replace the text-only roll chip with a real rendered polyhedral die (d20 / d10 / 2d6) that tumbles and lands showing the face that was actually rolled — d20 with the rolled number upright on the top face, advantage showing both dice with the kept one highlighted, nat 20 / nat 1 called out on the die itself. Respects `prefers-reduced-motion` (static face, no tumble). Pure CSS/SVG — no image assets, no new dependency. | M | — | ✅ |
| 1.2 | **Character portraits.** A painted portrait for each pregen on the select screen and in the character sheet, so the player knows who they are picking. Art in `images/char-*.png`, wired as `<img>` with the existing glyph as the fallback if a file is missing. **All 11 painted assets are now in `images/` (3 portraits + 8 plot-point beats)**; the extraction left the pointer glyph and app chrome in the crops, which were cleaned in place. Portraits still render small at 40px — enlarging them is item 1.12. | S | art | ✅ |
| 1.3 | **The Count's Epitaph Card** — every ending (deaths included) produces a shareable image card: character, ending title, run stats (nat 20s, nat 1s, gold wasted), one custom line from the Count, and the site URL, with one "Copy / Save image" button. | M | — | ✅ |
| 1.4 | **Fates Ledger with the Count's hints** — an endings screen showing which endings you have found and which are still locked, with a snide but useful Count hint for each locked one; stored in its own save slot so New Game does not wipe it. | S | — | ✅ |
| 1.5 | **He Remembers You** — carry a little memory between runs (last character, how you died, which ending) and have the Count and Clarence bring it up. | M | 1.4 | ✅ |
| 1.6 | **Call Him a Wizard** — optional dialogue choices that make you deliberately call him a wizard, with a hidden counter: each jab makes him flustered (next telegraphed move weaker) or furious (hits harder), and enough jabs unlock a secret ending or special epitaph. Four jab sites, in story order: the village gate, **the marsh** (said quietly, to nobody, and filed by the Toll-Wight), the castle gate, and the throne room to his face. | S–M | — | ✅ |
| 1.7 | **Visual roadmap page.** `roadmap.html` — every plot point below as a card with its art, the check it demands, and a live dice animation for that check; every roadmap phase as a milestone chip with an animated die badge. Linked from the splash screen. Plain HTML/CSS/JS at the repo root, same zero-dependency contract as the game. | M | 1.1, 1.2 | ✅ |
| 1.8 | **The Daily Curse.** A date-seeded run: same hero, same dice for everyone that day, with the seed shown and the run reproducible from it; at the end a Wordle-style share line (`MERLIN #N 🧛 Pip · 🎲 20 · 7 · 2 · 17 · Ending: The Correction`) plus one line from the Count. Reuses the pass-4 share plumbing. | M | 1.3 | ✅ |
| 1.9 | **The Count reviews your visit.** A per-run review written in the Count's voice from that run's own flags ("Paid the toll. Did not tip the bat. Called me the other thing once, in the marsh, where you thought I couldn't hear. Two stars."), shown on every ending and on the share card. Additive to 1.5, which only carries memory *between* runs. | M | 1.3, 1.5 | ✅ |
| 1.10 | **Tombstone line, as specified.** The card's death line must say **what killed them and where** and **gold owed** ("Pip, clerk. Lectured to death in the throne room. Owed 3 gold."), not the current stat-box wording. | S | 1.3 | ✅ |
| 1.11 | **Oswald's guest book + the castle-gate checkpoint.** Reframe the Fates Ledger as Oswald's guest book (blank lines for unfound entries, Oswald's voice, the secret entries), and add a checkpoint at the castle gate so a death costs a minute instead of the whole run. | S–M | 1.4 | ✅ |
| 1.12 | **Portraits must be prominent.** The painted portraits are currently 40px thumbnails, too small to answer "what does this character look like". On the character-select screen each hero's portrait must be a real card image (full-width of the card, ~160–240px tall on desktop, ~96–120px on mobile) with the name, role, stats and voice line under it; in the character sheet head it should read clearly at ~72px. Text must not wrap into a ragged single column at 800px. | S | 1.2 | ✅ |

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
| 7. Castle Gate & Foyer | `gate`, `foyer` | `images/beat-castle.png` | WITS d20 vs DC 14 · MIGHT d20 vs DC 16 (tunnel the wall) |
| 8. The Throne Room | `ledger`, `throne` → `fight_count` | `images/beat-throne.png` | WITS d20 vs DC 12 · SPIRIT d20 vs DC 13/11 · WITS d20 vs DC 15/16, then Count Merlin (AC 14) |

Four endings resolve here — The Stake, The Correction, The Board, Flight — plus `death` (An Epitaph). **All branches resolve; no loose threads.**

---

## Top 4 ideas (the owner's list — authoritative)

_Source: Grok Bot, the **MERLIN PASS 3** room (Sol / Site QA Bot), reposted by the owner 2026-09-26. Ranked by how likely each one is to make a player share it._

**1. Shareable tombstones (S–M).** When you die, the game draws a tombstone image with the epitaph, the hero, **what killed them and where** ("Pip, clerk. Lectured to death in the throne room. Owed 3 gold."), plus the site URL. The four epitaphs are the best writing in the game, and right now the funniest moment of a run vanishes when you click New Game.

**2. The Daily Curse (M).** Once a day, everyone plays the same **seeded** run with the same hero and the same dice. At the end you get a Wordle-style share line such as `MERLIN #41 🧛 Pip · 🎲 20 · 7 · 2 · 17 · Ending: The Correction`, plus one line from the Count. Because everyone gets the same dice, players have something to compare ("how did you survive the wight on a 2?").

**3. The Guest Book (S–M).** A collection page styled as **Oswald's guest book**, holding all 4 endings, every epitaph and a couple of secret entries. Unfound ones show as blank lines with a hint in Oswald's voice ("A guest who was polite to the bat. We have not had one."). The game already branches in real ways (Pip's ledger, the withdraw route that caps the Count at 20 HP, the letter-opener stake) but nothing tells players those branches exist. **Pair it with a checkpoint at the castle gate so a death costs a minute instead of the whole run.**

**4. The Count reviews your visit (M).** Whichever ending you reach, Count Merlin writes a short **review of that run** in his voice, built from what you actually did: *"Paid the toll. Did not tip the bat. Called me the other thing once, in the marsh, where you thought I couldn't hear. Two stars."* It uses flags the game already tracks, so every run ends on a punchline written about you — and that's the screenshot people send with "the vampire roasted me".

_Owner's own build order: start with the tombstones; then the guest book and the Count's review together, because both run on the same record of what the player did._

### How the shipped pass-4 work maps onto the owner's four

| Owner's idea | Already shipped (pass 4, live) | The real gap |
|---|---|---|
| 1. Shareable tombstones | **Mostly.** The Epitaph Card fires on every ending *and* every death, shows the hero, the ending title, run stats (nat 20s, nat 1s), a Count line and the URL, with a working Copy / Save image button | The tombstone **line** is not the requested shape: it must say **what killed them and where** and **gold owed** ("Pip, clerk. Lectured to death in the throne room. Owed 3 gold."), not "Gold wasted" |
| 2. The Daily Curse | **Nothing** | The whole idea: a date-seeded run (same hero, same dice for everyone) plus the Wordle-style share line and the Count's one-liner |
| 3. The Guest Book | **Mostly.** The Fates Ledger already lists found vs locked with a Count hint per locked ending and lives in its own save slot so New Game cannot wipe it | Reframe as **Oswald's guest book** (blank lines, Oswald's voice, secret entries), and add the **castle-gate checkpoint** |
| 4. The Count reviews your visit | **Partly.** He Remembers You carries the last character / death / ending into the next run and the Count and Clarence bring it up | The **per-run review** built from this run's own flags ("Paid the toll. Did not tip the bat… Two stars.") — a punchline about what you just did |

---

## Secondary source — Grok Bot's *Ideas Guy* (same direction, independent wording)

_Asked directly for "top 4 ideas for MERLIN" on 2026-09-26 12:56 AM ET; its four largely parallel the owner's list above, which is why pass 4 shipped what it did. Recorded for completeness._

**1. The Count's Epitaph Card (M)** — a shareable card per ending incl. deaths: character, ending title, run stats, a custom Count line, the URL, one Copy / Save button. **Shipped as pass 4, item 1.3.**
**2. Fates Ledger with hints from the Count (S)** — found vs locked endings with a snide hint per locked one, its own save slot. **Shipped as pass 4, item 1.4.**
**3. He Remembers You (M)** — cross-run memory (last character, how you died, ending) that the Count and Clarence bring up. **Shipped as pass 4, item 1.5.**
**4. Call Him a Wizard (S–M)** — optional jabs with a hidden counter, real cost/benefit, and a secret ending. **Shipped as pass 4, item 1.6.**

---

## v2.0 — MERLIN becomes the ORONATH engine ✅

The product brief: turn the shipped arc into a **reusable, data-driven dice-narrative engine**, with *The Last Signal of Oronath* as the first arc it proves itself on. Mechanics are real logic, never prompted behaviour. Arcs are **pre-generated in full before gameplay**, validated against a schema, and every character arc resolves.

**Standing decision (reversible, recorded not escalated):** the client stays a zero-dependency static app and keeps working from `file://`; arc pre-generation runs as a **local Node script** (`tools/build-arc.js`) that reads an API key from the environment (or accepts a hand-authored JSON file with no key), validates through the 2.2 schema, and writes a plain IIFE the static page loads. No server, no Heroku, no runtime network from the client. Netlify keeps hosting the site (publish dir `.`, no build). Flag before changing this.

| # | Item | Deliverables | Size | Depends on | Status |
|---|------|--------------|------|-----------|--------|
| 2.1 | **Core dice engine** | `dice.js`: d20 / d10 / 2d6 as standalone, testable functions; difficulty tiers (Easy 8+, Medium 11+, Hard 14+, Very Hard 16+); crit rules (lowest roll = major complication, not a plain failure; max roll = bonus/advantage); advantage and per-character "advantage due to build"; zero UI and zero LLM coupling. Table-driven self-test against known cases. | M | — | ✅ |
| 2.2 | **Arc schema + validator** | Data shape `arc → chapters(3–5) → choices(2–4) → consequences`; a validator that rejects an arc with a dangling branch, an unresolved character thread, a missing success/failure consequence, or a chapter count outside 3–5. Arcs are pre-generated and validated *before* play. | M | — | ✅ |
| 2.3 | **Character system** | Stats/traits tied to arcs; traits modify roll difficulty and can grant advantage ("advantage due to build"); per-character arc threads that the validator requires to resolve by the final chapter. | S | 2.1, 2.2 | ✅ |
| 2.4 | **Gameplay loop / UI** | Chapter state, choices, roll results and dice faces rendered to the player; progress through the arc; per-chapter objective display. Failure always opens a new branch — never a retry of the same roll. | M | 2.1–2.3 | ✅ |
| 2.5 | **Persistence** | Save/resume an in-progress run (extends the existing `localStorage` save with an arc-run envelope and a version field for migration). | S | 2.4 | ✅ |
| 2.6 | **Arc pre-generation** | Local Node script `tools/build-arc.js` (built-ins only): `--provider grok|openai` with key from env, or keyless `--from <arc.json>`; always validates via 2.2 before write; emits an IIFE assigning `window.OronathArcBundle` for `oronath.html`. | L | 2.2 | ✅ |
| 2.7 | **Deployment** | Client stays on Netlify (publish `.`, no build). New arcs: generate/bundle locally, commit the `.js`, push — no build step. Deploy verified against the live URL, not just a green CLI exit. | S | 2.6 | ✅ |
| 2.8 | **First arc: The Last Signal of Oronath** | Chapters 1–4 (The Signal Tree · The Echo Field · The Axe Lock · The Signal Core); John (memory/identity), Joel (legacy, the carved axe), Rafe (speed, alien origin, return-home); the three pre-written end states, and failure endings a success road does not enter. Written as data, validated by 2.2, played through 2.4. | L | 2.1–2.4 | ✅ |

**Mechanics that must be real logic, not prompt text** (from the brief): difficulty scaling, crit outcomes, and "every meaningful action requires a roll; failure creates a new consequence, never a retry".

---

## v2.1 — A second story ✅

A second validated arc, and a picker so `oronath.html` is no longer one hard-wired bundle. One save slot remains (`oronath.save.v1`). A resumable run still opens straight into its chapter.

| # | Item | Deliverables | Size | Depends on | Status |
|---|------|--------------|------|-----------|--------|
| 2.9 | **Second arc: The Pale Hand** | `arcs/pale-hand.json` and the keyless bundle `arcs/pale-hand.js`. Five chapters, five endings, Jin / Wren / Thorne. `validateArc` clean. | L | 2.1–2.8 | ✅ |
| 2.10 | **Story picker** | `stories.js` lists every registered bundle. `oronath.html` asks which story when two or more are loaded, and still assigns `window.OronathArcBundle`. | M | 2.9 | ✅ |
| 2.11 | **Tests and docs** | `tests/pale-hand.test.js`, `tests/stories.test.js`, plus this file and `roadmap.js` in the same commit. | S | 2.9, 2.10 | ✅ |

### The Pale Hand

| Beat | Chapter | The roll it demands |
|------|---------|---------------------|
| 1. The Lantern Quarter | `lantern-quarter` | d20 hard clumsy-hands eff 15; medium sharp-mind eff 9; medium steady-voice eff 11; medium sharp-mind eff 9 |
| 2. Crosshaven Market | `crosshaven` | medium steady-voice eff 11; hard sharp-mind eff 12; medium sharp-mind eff 9; medium clumsy-hands eff 12 |
| 3. The Toll Bridge | `toll-bridge` | easy steady-voice eff 8; hard steady-voice eff 14; hard clumsy-hands eff 15; veryHard fighting eff 15. Success and bonus close the Ledger. |
| 4. The Thornwood Ambush | `thornwood` | medium sharp-mind eff 9; hard steady-voice eff 14 (closes the deserters and the Ledger); veryHard fighting eff 15; easy clumsy-hands eff 9 |
| 5. The Hand at the Ford | `the-ford` | veryHard fighting eff 15; medium steady-voice eff 11; easy steady-voice eff 8; medium clumsy-hands eff 12. Then one of the five endings. |

Five endings — The Hand Turns, The Hand Falls, The Hand Vanishes, The Courier's Bargain, Captured. **Every path resolves the Ledger, the deserters, and the resistance.**

---

## Escalations, defaults and open questions

| Date | Item | Decision | Note |
|------|------|----------|------|
| 2026-09-26 | Where the Oronath engine lives | **Inside this repo** — MERLIN becomes the v2 engine and Oronath becomes its first arc (owner's call) | Recorded rather than escalated |
| 2026-09-26 | Client architecture in v2 | Static, zero-dependency client + optional arc-builder server | Reversible; see v2.0 note |
| 2026-09-26 | Arc pre-generation host | **Local Node script** (`tools/build-arc.js`), not Express/Heroku; keyless `--from` path for hand/agent-authored arcs | Replaces earlier optional-server sketch; see v2.0 standing decision |

---

## Changelog

- **2026-09-27** — Pass 14: The Pale Hand is the second arc, and `oronath.html` lets the player choose a story before the splash. One save slot remains. A resumable run still opens straight into its chapter.
- **2026-09-27** — Follow-up, from the QA pass-13 review (`.qa/qa-pass13.md`): "Back to the castle gate" was counting as a new attempt, so a daily death after a restore shared "· Attempt 2 ·" even though a restore is the same attempt. `restoreGate()` advanced `state.daily.attempts`; it now keeps the count as recorded (normalising a checkpoint written before the counter existed), and the test pins both halves of the rule — two restores leave a first attempt at attempt 1, and a restore on attempt 2 stays attempt 2.
- **2026-09-26** — Pass 12: a Daily Curse death no longer loses its identity. `shareLine()` returned the tombstone line before it reached the daily branch, so a daily death was byte-identical to a non-daily one; the daily line now comes first and the tombstone follows the ending title. The dice in a daily share line are the checks themselves — a green square for a pass, a red one for a fail — and a second play on the same day says "Attempt N" before the URL. A save from before this change still renders its old number list, and a non-daily run's line is unchanged.
- **2026-09-26** — Follow-up, from the QA pass-12 review: the three death causes added for 1.10 were only half-wired — they had tombstones but no guest-book entry, no book title or hint, no epitaph and no death scene, so those deaths recorded nothing and fell back to the generic line. The cause list had been copied into four places; it now derives from the tombstone map, and a test fails if a new cause misses any of them.
- **2026-09-26** — Pass 11, from an independent QA review (`.qa/qa-pass4.md`): a Title button returns to the splash so the Daily Curse stays reachable once a save exists; tombstones name the place you actually died, including the five causes that used to read as a throne-room death plus the three the QA did not list; the Count's review counts every jab once and stops repeating its overheard clause; stale dice are cleared and the killing blow is shown; a death line and a share link on every ending; the portrait and shop-frame pass for phones.
- **2026-09-26** — Pass 10: a failed check in The Last Signal of Oronath now ends on a road the success check does not take (roadmap 2.8).
- **2026-09-26** — Follow-up: marsh jab site added to 1.6, so the Count's review names the place the spec example asks for ("in the marsh, where you thought I couldn't hear") instead of defaulting to the village gate.
- **2026-09-26** — Pass 9: The Last Signal of Oronath shipped as the default Oronath arc (roadmap 2.8); v2.0 complete.
- **2026-09-26** — Pass 8: local arc pre-generation (provider call plus keyless file) and static Netlify deploy of the bundled script (roadmap 2.6–2.7).
- **2026-09-26** — Pass 7: gameplay loop and persistence for the built-in sample arc (roadmap 2.4–2.5).
- **2026-09-26** — Pass 6: Oronath engine core — `dice.js`, arc schema + validator, character system with John/Joel/Rafe pregens, zero-dependency Node/browser tests (roadmap 2.1–2.3).
- **2026-09-26** — Pass 4B: Daily Curse, Count's visit review, tombstone line, Oswald's guest book + castle-gate checkpoint, prominent portraits (roadmap 1.8–1.12).
- **2026-09-26** — Pass 5: die you can see, character portraits, visual roadmap page (roadmap 1.1, 1.2, 1.7).
- **2026-09-26** — Pass 4: Epitaph Card, Fates Ledger, He Remembers You, Call Him a Wizard (roadmap 1.3–1.6).
- **2026-09-26** — Roadmap created. v1.0 recorded as shipped; v1.1 (dice you can see, character portraits, Ideas Guy's top 4, visual roadmap page) and v2.0 (the Oronath engine) opened.
