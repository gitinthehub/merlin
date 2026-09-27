# Pass 14 review — triage

Source: `.qa/qa-pass14.md` (the MERLIN bot's reply, 6:00 PM ET, against deploy `481c95c`).
A review is input, not instruction. Every item is decided below as BUILD, REJECT or DEFER with a
reason; the plan for pass 15 implements the BUILD list only.

## BUILD

**B1 — Same-story Begin replaces an in-progress run without a word.** (review A1, cost S)
`replaceWarning()` in `oronath-ui.js` returns `""` when the saved run belongs to the story being
begun, so the card that owns the save is the one card with no warning. Warn on the card *and* on the
title screen whenever a mid-run save belongs to this arc, in plain words with the chapter it holds.
Also make the footer's **New Run** a two-step button (first press arms it: "Press again to start
over"), because it clears the save with no confirmation either.

**B2 — The ford offers the Millbrook page on roads where Jin never read it.** (review A2, cost M)
The owner's prompt has the ford's show-the-page choice at DC 11 *with* the clue and DC 17 *without*;
the engine has no flag-driven DC, so the pass-14 arc used one number and the choice text claims Jin
read the page. Data-only fix: split the ford into `the-ford` (the roads that learned the page) and a
blind variant reached from the roads that did not — the bridge failures and the Thornwood roads that
never hear Wren's remark. The blind variant's option must not claim Jin read anything, and its roll
must be the with-no-clue number. Both variants keep every ending reachable and every thread
resolvable, because that is what `validateArc` walks.

**B3 — Every ending narrates Wren's band, whatever the player did.** (review A3, cost M)
Prose fix only: an ending's deserters sentence must be true whether or not Wren ever joined (and the
Courier's Bargain's "promise the book no longer keeps" must not presuppose the Talk success). The
status line stays as the engine defines it — the graph walk requires every path to settle every
thread, and changing that is engine work, not story work.

**B4 — The card lists three characters, but only Jin rolls.** (review A4, cost S)
Derive the picker's cast line from the actors that actually take choices in the arc, so the card
describes the play it opens. The Last Signal's line must still read John, Joel, Rafe.

**B5 — The chapter counter jumps.** (review A5, cost S)
`Chapter N of M` uses the arc's ordinal, so the Thornwood route reads 2 then 4. Number the kicker by
the player's own path (`run.history.length + 1`, which `loop.js` already tracks) and drop the `of M`,
because a branch road legitimately skips a chapter.

**B6 — A finished run takes over the page.** (review A6, cost S)
A `resolved` save must not auto-resume. Land on the picker; the card that owns it shows the ending it
reached and offers Begin rather than Resume, and the other card stops warning about a finished run.

**B7 — The Ledger reads closed before the ford, whose objective still promises it.** (review A5,
cost S) Relabel the `jin-ledger` thread so its mid-run closure is truthful — it closes when Jin
learns the Millbrook page — and align the bridge and Thornwood prose that resolves it. The Ledger's
own fate is settled by the ending.

**B8 — Options that no longer exist are still offered.** (review A5, cost S)
The Thornwood's failed fight takes the smoke bomb and the bridge's failed climb loses one, and the
ford then offers a smoke bomb anyway. Change what those failures cost so every choice offered later
is still legal; the engine has no inventory to check.

**B9 — "What waits at the camp is already over" then an ending that says Thorne lives.** (review B,
cost S) Fix the Thornwood complication's text.

**B10 — "Wren leads five Ash Guard deserters" against "Four archers, and the fifth is Wren."**
(review B, cost S) Make the two agree.

**B11 — The pitch names Aldric before the story introduces him.** (review B, cost S)
Say the Pale Hand.

**B12 — Absolute links break under `file://`.** (review B, cost S)
`index.html` links to `/oronath` and `/roadmap`; `roadmap.html` links to `/` and `/oronath`. The
owner opens these from disk, so make them relative. The new link added in pass 14 is the one to fix
first.

**B13 — The hosting badge covers part of Resume at 360px.** (review B, cost S)
Give the picker's action row bottom room at narrow widths; the badge is Netlify's, not ours.

## REJECT

**R1 — Make the shop's items, silver and the extra bomb actually matter.** (review A5/B)
The engine has no inventory and no purse; the shop is scene-setting. Giving it mechanics is engine
work and a different pass. Recorded as a known gap instead.

**R2 — Make Ending E easier to reach through the Ledger offer.** (review B)
The owner's prompt calls that offer an automatic success, so its complication being almost unseen is
faithful, not a defect.

**R3 — Serve a build ID.** (review header)
A static site with no build step has nowhere to carry one. The QA record names the deploy commit
instead.

**R4 — The served tests fail / `tests/oronath-ui.test.js` is a 404.** (review B)
The tests are Node scripts run from the repo root; they cannot run from a browser fetch by design,
and nothing served references `oronath-ui.test.js` — `tests/harness.html` loads only files that
exist. Nothing to fix.

## DEFER

**D1 — The Last Signal's "team-climb" label names three characters but only Joel rolls.**
Pre-existing, and a one-line label fix that belongs in a Last Signal pass rather than this one.

**D2 — Nothing checks that a choice's prose matches the branch it lands on.** (review B, in spirit)
A real idea, but it is a test-authoring pass of its own: the assertions would have to read prose.
Recorded here so it is not lost.
