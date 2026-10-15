# Pass 16 review — triage

Source: `.qa/qa-pass16.md` (the MERLIN bot's reply, 11:48 ET, against the `516cfa3` deploy), with the
raw accessibility dump in `.qa/qa-pass16-raw-ax.txt`. A review is input, not instruction. Every item
is decided below, and **every premise was checked against the source and, where it mattered,
reproduced in a real browser**.

## Accepted — built in the pass-16 follow-up fix (committed locally, held for the next push window)

**B1 — item 1: opening a story hash without `/begin` deletes another story's saved run. CONFIRMED.**
Mechanism, from the source: `persist.js` `load()` calls `reject()` → `clear()`, which removes
`oronath.save.v1`, whenever `blob.arcId !== arc.id` (`persist.js:86-89,118`). Pass 16's new hash boot
reaches it: `boot()` → `bootSingle(entry.arc)` → `Persist.load(entry.arc)`. Reproduced in Chromium
with a seeded mid-run Last Signal save:

| url | stored run |
|---|---|
| `#cinder-mile` | **DELETED** |
| `#pale-hand` | **DELETED** |
| `#last-signal` | unchanged |
| `#<id>/begin` | unchanged |
| `#bogus`, no hash | unchanged |

`persist.js`'s clear-on-mismatch is pre-existing and frozen; **Pass 16 is what made it reachable**,
because before the hash boot `Persist.load` was only ever handed the arc that owned the blob. The fix
therefore belongs in `oronath-ui.js`: peek with `saveStatus()`/`savedArc()` and never hand
`Persist.load` a mismatched arc.

**B2 — item 2: Begin on the title replaces a run in one click. CONFIRMED as behaviour.** The pass-15
plan deliberately left the title Begin at one click, and the warning does appear — but the footer's
New Run already arms twice, so the title screen is the inconsistent surface. Built.

**B3 — item 3: reloading mid-run lands on a title whose only button replaces the run. CONFIRMED.**
`front.js` sends Begin to `#<id>/begin` and that hash stays in the address bar, so a reload returns to
the title with no Resume. Built.

The three land in one change: the hash boot stops handing `Persist.load` a mismatched arc, and the
title screen gains Resume whenever a matching run is in progress and arms its Begin twice when it
would replace one. The reviewer's own tests verdict supports the narrowness — 40 honest runs, 7 forced
branches, actor/die/DC always matched, no console errors, no network calls from `file://`.

## Rejected

**R1 — item 4, the card's chapter count as a defect.** REJECT. The cards count the arc's chapters,
exactly as The Pale Hand's card already does, and a branch road legitimately skips a chapter. The
number is not a promise about one run. Kept as a copy question for the owner (D1), not a bug.

**R2 — item 6's "every ending closes all three threads" as a defect.** REJECT. `validateArc` requires
every thread settled on *every* path into *every* ending, and the honest-prose hedge ("whether you met
him or not") is the mandated fix for that constraint, recorded in the project skill. Changing it is
engine work, not story work.

**R3 — the DEFECTS bullet "`tests/front.test.js` returns a 404".** REJECT. No such file exists and
nothing references it. Verified live: `/tests/front-door.test.js` → **200**,
`/tests/cinder-mile.test.js` → **200**. The reviewer asked for a filename that was never shipped. Its
substantive half — that no test opens a story hash while another story's run is saved — is accepted,
and it is exactly B1's regression test.

## Deferred

**D1 — item 4: chapter counts on the front-door cards.** A copy decision for the owner: "5 chapters"
describes the arc, not the run. One line in `front.js` if he wants "up to 5 chapters".

**D2 — item 5: rolls that "pay off backwards".** Partly CONFIRMED, with one correction to the
reviewer: `nim-climb-dark`'s **bonus** goes to `end-static` while its plain success goes to `end-hour`,
so that bullet stands; but `nim-climb-mast`'s bonus matches its success. Confirmed on the other two:
`nim-cut-cable` and `nim-count-the-plate` complication → `end-hour` against success → `end-static`,
and `nim-walk-off`'s complication → `end-hour`. Story-data pass, with D3.

**D3 — item 6: Cinder Mile text and graph contradictions.** Confirmed as story-data work: the
Uncranked objective promises a walk-off none of its four choices offers; the crank bonus's text
contradicts the next chapter's "the housing is empty"; and the ending targets in D2. One data-only
pass, no engine change.

**D4 — item 7: the door does not surface an in-progress castle run.** Confirmed and benign: the
reviewer verified `merlin.save.v1` stays byte-identical through `/`, `/oronath.html` and
`/roadmap.html`, and `castle.html` resumes the run. The gap is that the door shows only the small
castle link. Owner's call whether the door should read the v1 save.

**D5 — item 8: Pell and Maro act once each, and two traits are never rolled.** Confirmed from the arc:
Nim acts in 12 of the 14 choices, Pell in one, Maro in one, and `Solder`/`Long Memory` are never
rolled. Story pass (2.14 refinement).

## Verdict on the reviewer's "hold"

Right about item 1, and item 1 is the only thing that warranted it: a save-destroying regression the
new hash boot introduced, now fixed locally. Items 2–8 are story data, copy, or an owner decision.
The pass shipped as ROADMAP 2.12–2.17 is otherwise sound — the dice, the routing, the deprecations and
the castle night all held up under 40 runs.
