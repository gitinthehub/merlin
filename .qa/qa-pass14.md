# MERLIN review — The Pale Hand + the story picker (pass 14)

**Reviewer:** the MERLIN bot in Grok Bot. **Brief:** `qa-pass14-brief.txt`, submitted 5:49 PM ET.
**Reply:** 6:00 PM ET, against deploy `481c95c`. **Raw dump:** `qa-pass14-raw-ax.txt` (same directory).

**How this file was produced:** the message list is virtualised, so this is an extraction from the
accessibility tree in document order with inline fragments (item numbers, code spans) rejoined. It is
a *reading copy*, not a transcript: no wording was changed, nothing was summarised, and where a line
was rejoined it reads as one paragraph where the thread rendered several. The reply ended with three
screenshots (counted as `+3` in the pane), which the dump does not contain.

---

I wouldn't ship this build yet. The dice mechanics are solid. All 33 choice buttons across both stories show the difficulty the roll actually needs, there are no console errors, and all five Pale Han… Alva Watchdog ALVA looks healthy. The health check just returned OK. The last poll was at 1:30 PM ET, 23 minutes ago, which is on schedule for the 30-minute cycle. The app has been up for about 70 hours 49 minutes… MERLIN — a short gothic horror-comedy browser adventure, live at https:/ TOP 4 IDEAS FOR MERLIN 1|# QA Bot Brief — MERLIN — PASS 3 (story clarity + UI/usability review) Here's the list again. These are my top 4 ideas for MERLIN, ranked by how likely each one is to make a player share it. Site QA Bot The MERLIN pass 3 review is posted in its room, and it starts with a problem: the live site is byte-for-byte the same build I tested in pass 2. None of the input-flow fixes have deployed yet. That's … # QA Bot Brief — BURN sunburn calculator — PASS 2 > This is your **secon Sol, BURN pass 4. Tested live Fri Sep 25, 9:08–9:31 PM ET. Build confirmed: the page loads assets/index-87278f71.js and no other script. /burn logged no console errors. # QA Bot Brief — MERLIN (dice-and-drama adventure) — PASS 2 Sol, this is Sol, MERLIN pass 2. The verdict is FIX-FIRST and taste goes up to 8/10 (it was 7). # QA Bot Brief — MERLIN (dice-and-drama adventure) — PASS 1 Sol, this is Sol, MERLIN pass 1. Played live at desktop and 375 px (Sep 25, about 4:55 PM ET). All six required paths are covered. The Pip route reached end_clause ("The Correction"). Deaths came from the wight (… Ideas Guy It's set up. Starting Monday, you'll get a fresh batch of 3 to 5 ideas at 8:45 AM ET every weekday. Most of them will be about making your products more fun, with at most one each about making them f… Job Search Bot Morning, Lock. I found 7 picks today, but hardly anything was posted in the last 7 days, so I widened the window to about 3 weeks. None showed any sign of being closed. I couldn't confirm any of them… Persephone If that was “anyway” — here’s a tight prep pack for Friday’s call with Vivian (30 min, noon ET). dr eggbot rule's written at ~/.cursor/rules/pstack-models.mdc — budget large (xhigh), every role inherit-parent. applies to new sessions; re-run setup anytime to change it. Critiquito: Design Critique Want any of these connected so critiques can land where your team works? Cooper Want me to install Slack so I can DM you those briefings? Account Research Desk Any of these worth connecting for account work? Stalk Bot Which connectors should I install for research? Tradbot Want Slack too, for school or caretaker threads? Overheard Want either optional connector? YouTube Playlist Creator You’re signed out of Google on my computer. YouTube is back to showing Sign in. MERLIN MERLIN

I wouldn't ship this build yet. The dice mechanics are solid. All 33 choice buttons across both stories show the difficulty the roll actually needs, there are no console errors, and all five Pale Hand endings are reachable. The problems are that the picker can silently wipe a run, and The Pale Hand's text often contradicts what the player just did. I couldn't confirm the build ID, because 481c95c doesn't appear in any served file. I played 26 full runs of The Pale Hand and 8 of The Last Signal at 1280 and 375px, including runs opened from file://.

### A. Top 6 issues for a first-time player
1. Beginning the same story again wipes an in-progress run with no warning. (Cost: S) Where: the picker card that shows both "Begin" and "Resume — Chapter N". Repro: Begin The Pale Hand, then Begin again, and reach Chapter 2. Tap Stories, then tap Begin on the same card (the red primary button). The title screen shows no warning, and the next Begin puts you on "Chapter 1 of 5" with the save overwritten. Why it matters: the most prominent button on the card deletes your progress. The other story's card warns you, but this one doesn't, because the replace warning returns empty when the saved run belongs to the same story. "New Run" in the footer also clears the save with no confirmation.
2. The ford offers "Show him the Millbrook page and tell him about his mother" even when Jin never read the page, and that choice wins The Hand Turns. (Cost: M) Where: Chapter 5, The Hand at the Ford. Repro: The Lantern Quarter, then the fortune-teller at Crosshaven, then "Climb under the bridge on the beams" at the Toll Bridge and fail. The failure text says "You are across, and you did not read the post." The ford still offers Show, and success says "You show him the Millbrook page and say what the margin forbids." Any route through the Thornwood also skips the Toll Bridge, which is the only place the note gets read, and still wins with Show. Why it matters: the best ending depends on something the game just told the player Jin doesn't know. A fix that stays within the story data and needs no engine change is to split the ford into two versions, one where Jin read the page and one where she didn't.
3. Every ending narrates Wren's band and marks the deserters closed, whatever the player did. (Cost: M) Where: every Pale Hand ending screen. Repro: take the Toll Bridge route, which never enters the Thornwood. The ending still says "Wren's band comes down out of the Thornwood and takes the resistance's side," and the screen shows "the deserters — closed" and "Every character thread is closed." Other examples:
- After the deserters themselves "bind your hands with your own reins," the ending says "Wren's band cannot pull you out."
- The Courier's Bargain mentions "a promise the book no longer keeps," but no promise is made unless the Talk choice succeeded. Why it matters: the last screen, the one players remember, contradicts what they just played.
4. The picker card lists three characters, but only Jin ever acts. (Cost: S to change the label, L to write choices for the others) Where: the picker card reads "5 chapters · Jin, Wren, Thorne", and the title screen describes Wren and Thorne. Repro: all 20 choices are labelled "Jin · d20 · …", and Wren's and Thorne's traits are never rolled. Why it matters: in The Last Signal all three characters act, so this card sets up party play and then doesn't deliver it.
5. Continuity slips read as bugs. (Cost: S)
- The smoke bomb is taken ("they take the smoke bomb off your belt" after a failed "Fight them") or lost to the river at the bridge, but the ford still offers "Smoke bomb, then drag Thorne out of the tent."
- The Ledger thread shows "closed" before the ford, even though the ford's objective is "Get Thorne and the Ledger out of the ford alive" and you can still offer the Ledger away there.
- The chapter counter jumps, for example from "Chapter 1 of 5" to "Chapter 3 of 5", and some runs end at chapter 3 or 4 of 5. The branching is intended, but the counter makes it look like chapters were skipped.
6. A finished run takes over the page. (Cost: S) Repro: finish a Pale Hand run, then reopen or reload oronath.html . You land on the old "RESOLUTION / Captured" screen instead of the picker. That card then offers "Resume," and the other card warns "Your run in The Pale Hand is saved — beginning this story will replace it." Why it matters: a story the player already finished is treated as a run that needs protecting.

### B. Defects

### Broken:
- Links between pages break under file://, which goes against your standing constraint. index.html links to href='/oronath' and href='/roadmap' , and roadmap.html links to href='/' and href='/oronath' . From file://, "Play an Oronath story" opens file:///oronath , which is a browser error page. This predates this build, and the in-story "Back to MERLIN" link works because it's relative. Using relative links like oronath.html fixes it (S).
- The served tests pale-hand.test.js and last-signal.test.js fail with "Cannot find module '../tools/build-arc.js'" unless you also fetch tools/build-arc.js and arcs/*.json . Those files are served but no page uses them. tests/oronath-ui.test.js returns a 404.
- Every button did something: Continue, Stories, All stories, New Run, Resume, Begin and Back to MERLIN.

### Picker and save states:
- There are three problems, all covered above: same-story Begin wipes the run silently, New Run doesn't confirm, and a finished run still counts as saved.
-

### Everything else holds up:
- Starting the other story warns before replacing, and "All stories" keeps the save.
- Reloading mid-run resumes the right story, including on a result screen.
- Saves from before the picker still load.
- The v1 game and Oronath use separate save keys, and neither touches the other.

Story text that contradicts the game (besides items 2, 3 and 5 above):
- In the Thornwood, the failed "Fight them" says "What waits at the camp is already over." The ending is then The Hand Vanishes, which says "Thorne lives." The smoke-bomb complication ("The Hand has already been to the ford and gone") leads to the same ending.
- The Thornwood setting says "Wren leads five Ash Guard deserters," but the "Stay still…" success says "Four archers, and the fifth is Wren."
- Items like the potion, rope, silver and the extra smoke bomb from a bonus never affect anything later. "Twenty silver goes into the black water" costs nothing.
- The title pitch says "…before Aldric does," but Aldric isn't introduced as the Pale Hand until the ford.
- In The Last Signal, the "team-climb" label names all three characters, but only Joel rolls. This predates this build.

Stated difficulty versus the actual roll: no mismatches. I checked all 33 buttons against the source and every played equation.

Endings that leave out a thread they closed: none. The problem goes the other way, since endings narrate threads the player never touched (item 3).

Unreachable endings or dead ends: none. One oddity is that a complication on a choice rolled with advantage needs two 1s (a 1 in 400 chance), so, for example, "Offer the Ledger" leading to Captured is almost never seen.

Phone width: nothing is cut off or unstyled at 360 or 375px on the picker, title, chapter, result and ending screens. The footer buttons are a little small at 38px tall, and Netlify's "Powered by Netlify" badge covers part of Resume on the picker at 360px (that badge comes from hosting, not your code).

Regression: none found. The v1 game and daily share line are unchanged, and the #269 death line still matches byte for byte. The last pass's attempt bug is fixed: I confirmed through the engine that a checkpoint restore no longer counts as an attempt, though I didn't reach it by playing to a death. The Last Signal played to four endings with no changes. The roadmap is fine at both widths and shows the new v2.1 milestone. Opened from file://, both stories play and resume, and every request stays local.

### C. Verdict:

Not shippable as it stands. Fixing the silent same-story wipe and the three Pale Hand contradictions (the Millbrook page, Wren in every ending, and the cast list) would change my mind. All of those are small or medium fixes to text and story data that stay within your constraints.

I tested in Chromium only, not on a real phone, Safari or Firefox.
