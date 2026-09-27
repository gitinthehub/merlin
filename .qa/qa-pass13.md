# QA pass 13 — the MERLIN bot's re-check, and its triage

**Reviewer:** the independent bot `MERLIN` in Grok Bot.app (the same bot as pass 4
and pass 12 — no new bot was created).
**Requested:** 2026-09-27 09:01 EDT by the owner's agent, asking it to re-run its
four exact strings and the regression sweep now that the pass-12 fix had actually
shipped.
**Replied:** 2026-09-27 09:09 EDT (the reply is complete and stable across three
polls, four screenshots attached).

**Build under review:** `8c61bbd`, live as Netlify deploy
`6ab880034869860007dec874` (`state: ready`, `commit_ref` = `8c61bbd`, created
2026-09-27T02:31:31Z). The bot confirmed the served `data.js` and `engine.js` were
`8c61bbd` by matching file contents — the deploy had no `commit_ref` in its own UI
and the served test file does not name the commit.

**Where the bot's words are:** `.qa/qa-pass13-raw-ax.txt` holds the review as the
git of the accessibility tree delivered it — one text block per line with its
on-screen x/y. The copy below is a **reading copy, edited**: Grok Bot splits long
emphasised spans and inline strings across separate elements, so fragments are
rejoined and inline emphasis is lost (a fragment that reads `state.daily.attempts += 1`
on its own line is part of item 1's sentence). Wording is not otherwise changed;
when the two disagree, the raw dump wins.

---

## What the bot reported

> The share-line fix is live, and your #269 strings match byte for byte on screen
> and on the clipboard. The squares, the attempt count and the three guest-book
> causes all work. The one defect is that a checkpoint restore adds an attempt,
> which contradicts what you said it should do. Only [eight items follow]

**1. BUILD: stop counting a checkpoint restore as an attempt.**
Repro on #269 with a fresh profile: play to the throne room and die. Choose "Back
to the castle gate" and play on to The Board. You get `state.daily.attempts += 1`:
`MERLIN #269 🧛 Vellum · 🎲 🟩🟩🟥🟥🟩 · Ending: The Board · Attempt 2 · https://merlin-dnd.netlify.app`
(a screenshot of that screen is attached to the review).

**2. BUILD: update the test along with item 1.** `tests/engine.test.js` currently
expects "two gate restores make attempt 3", so it locks the bug in. Then Title,
"Replay today's curse", and die in the churchyard — that shows "· Attempt 3 ·"
after only two real plays.

**3. DEFER: a daily run that was in progress when this deploy went out renders
numbers and squares mixed together.** A save that's all numbers still shows the
old list correctly, but a run started under the old format and finished under the
new one gives:
`MERLIN #269 🧛 Vellum · 🎲 10 · 🟥 · 🟩 · 🟥 · 🟩 · Ending: An Epitaph · Vellum, nun. Mauled to death in the churchyard. Owed 12 gold. · https://merlin-dnd.netlify.app`
This matches your description of old saves. It only affects runs that were in
flight today, so I'd leave it unless you'd rather render any mixed log as all
numbers.

**4. DEFER: runs abandoned before an ending don't count.** The count is only
written when you reach an ending, so quitting to Title and restarting doesn't
raise it. That's probably fine, but it's worth deciding on purpose, because a
player could reset quietly and still share "Attempt 1."

**5. DEFER: The Stake may be unreachable on #269 with Vellum.** In real play I
couldn't reach your four-square Stake example. I also ran an offline simulation of
that day's seed, with about 11,000 runs across 36 opening routes using random
combat moves, and none of them won. Only The Board was reachable. Random moves
aren't proof, but a daily with no win is worth checking, because a player who
can't win is less likely to finish or share.

**6. DEFER: the two churchyard-check deaths share one guest-book entry and one
scene line.** The sneak death ("You trip on a root…") and the plot death both end
on "The spade is honest work…" under "The Long Way Round."

**7. DEFER: at 360px the on-screen squares wrap mid-run**, splitting into
`🎲 🟩` / `🟩🟥` on two lines.

**8. REJECT: the on-screen and clipboard lines still differ.** I'm noting it as a
fact only, since it's your call.

**Everything else came back clean:**

- On #269, the first death, the second attempt ("· Attempt 2 ·") and the third
  attempt all match your strings. The count resets on the next UTC day.
- The squares check out across 7 real runs. There was one square per roll with
  nothing unmarked, and every color matched the on-screen result. That covered
  checks landing exactly on the DC, a natural 1, a natural-20 mesmer save, hits
  and misses, and fleeing both ways. An empty log still shows `—`.
- Live #270 renders solid squares, for example
  `MERLIN #270 🧛 Bram · 🎲 🟩🟩🟩🟥🟥🟩🟩 · Ending: The Stake · https://merlin-dnd.netlify.app`.
- The non-daily line is unchanged:
  `Vellum, nun. Mauled to death in the churchyard. Owed 9 gold. · https://merlin-dnd.netlify.app`.
- The guest book now lists The Village Gate, The Square and The Long Way Round.
  Each of those deaths records correctly and shows its own scene line, and the
  other 11 causes still do too.
- All 14 tombstones are unchanged from pass 12.
- "Replay today's curse" works.
- The game, `roadmap.html` and `oronath.html` have no console errors and no
  sideways scroll at 360, 375 or 1280px.

This closes the pass-12 verdict: its top three items were reported against a
deploy that was still in flight, and the bot itself now confirms all three
byte-for-byte against the shipped build.

---

## Triage

A review is input, not instruction. Every item gets a call, including the ones
dropped. Each claim was re-checked against the shipped code or the live site
before anything changed.

| # | Bot's call | Our call | Reason |
|---|-----------|----------|--------|
| 1 | BUILD | **BUILD** | Verified in the source: `restoreGate()` advanced `state.daily.attempts`, and the death screen's restore button is its only caller (`ui.js`). The standing decision is that a restore is the same attempt, so the code was wrong, not the decision. Fixed, and the exact repro now keeps attempt 1. |
| 2 | BUILD | **BUILD** | The same fix. `tests/engine.test.js` asserted "two gate restores make attempt 3" — a test that locked the bug in. Replaced with a test that pins both halves of the rule (two restores leave a first attempt at attempt 1; a restore on attempt 2 stays attempt 2). |
| 3 | DEFER | **DEFER** | It is the deliberate old-save behaviour (marked rolls square up, unmarked show the face, joined with " · ") and only an attempt that straddled a deploy can produce it — a window that closed on 2026-09-26. Rendering any mixed log as all numbers would regress that interleave. |
| 4 | DEFER | **DEFER** | Real, but it is a design question about when an attempt begins, and it pulls against the decision in item 1: counting an abandoned start would make quitting a new attempt. Needs the owner's call; no code change. |
| 5 | DEFER | **DEFER** | A difficulty note about one historical seed (#269, 2026-09-26). The daily rotates and that day is past; not a code defect. Worth a separate look at whether a daily can be unwinnable. |
| 6 | DEFER | **DEFER** | The guest book records per death *cause*, not per branch, and both deaths are the churchyard cause by design, sharing its one scene variant. Splitting them would mean re-keying the record on the branch — a design change, not a defect. |
| 7 | DEFER | **DEFER** | Confirmed as a narrow-screen cosmetic: the dice run can wrap between glyphs at 360px. Fixable in `style.css`, but it is a cosmetic change to a surface that has had its own phone pass; flagged for the owner's call rather than folded into a defect fix. |
| 8 | REJECT | **REJECT** | Deliberate: the on-screen line carries the tombstone, the clipboard line is the share text. The owner had already ruled it a decision, not a defect. |

### What shipped

`engine.js` and `tests/engine.test.js`, plus a changelog line in `ROADMAP.md`
(changelog only, so `roadmap.js` does not move). Commit `5c95057`.

Evidence:

- the reviewer's repro driven through the shipped engine in Node: pre-fix the
  restored run renders `… · Attempt 2 · …`, post-fix the same run renders no
  count and `state.daily.attempts` stays 1;
- the new assertions run against the previous `engine.js` fail 3 times, so they
  bite;
- all eight suites pass;
- `dice.js`, `arc.js`, `characters.js`, `loop.js`, `persist.js`, `sample-arc.js`,
  `oronath.*`, `arcs/`, `tools/` and the other seven test files are byte-identical
  (`git diff --stat` empty);
- the deployed `data.js` and `engine.js` hash-match the working tree.

### Footnote, not from the review

The commit message on `8c61bbd` says the new assertions "fail 17 times" against
the previous files. Re-measured while preparing this pass: the committed suite
reports 16 failures and then aborts on the first missing guest-book row (the
`eq(row.found, …)` has no null guard), and 30 when the loop is allowed to finish.
The "17" is imprecise; the claim that the assertions bite is sound. History is not
being rewritten for it — noted here so the record is straight.
