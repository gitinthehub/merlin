# QA PASS 4 — MERLIN, live (independent review)

**Reviewer:** the MERLIN QA bot in Grok Bot, a separate reviewer from the agent that
built this. **Surface:** https://merlin-dnd.netlify.app/ , `/roadmap.html` ,
`/oronath.html`. **Verdict: not shippable yet** — chiefly because the Daily Curse
becomes unreachable once a save exists (ranked change 1).

Presentation note: this text was lifted from the app's accessibility tree, which
splits emphasised spans into separate nodes. Fragments have been rejoined in reading
order; **no wording has been changed or paraphrased.** The verbatim tree dump is kept
beside this file as `qa-pass4-raw-ax.txt`.

---

Pass 4 is done, and my verdict is that it's **not shippable yet**. After your first
run there's no way back to the splash screen, so the Daily Curse becomes unreachable
for anyone who returns the next day. Most of the other problems are wrong or
inaccurate text in the lines people would screenshot. All seven new features work,
but the tombstone and the Count's review break in specific cases.

## Ranked changes

### 1. Add a way back to the splash screen.

**What:** add a "Title" or "Daily Curse" button to the top bar and the ending
screen. **Why:** once a save exists, the page resumes on load and New Game goes
straight to hero select. A player returning tomorrow can't find the Daily Curse, so
your headline feature goes unplayed. **Where:** `index.html`, in the top bar and the
ending actions. **Repro:** Begin, pick any hero, then reload. The only controls are
Guest Book, New Game and Pack. Daily Curse, Continue, "Replay today's curse" and the
Oronath and roadmap links only come back if you clear localStorage. **Cost:** S.

### 2. Make the tombstone name the place you actually died.

**What:** give the gate, marsh, foyer, ledger and churchyard-search deaths their own
cause and location. **Why:** the tombstone is the line people screenshot. When it
names a room they never reached, it looks like a bug, and the joke doesn't land.
**Where:** the death ending, the epitaph card and the guest book entry. **Repro:**
reach the gate with 3 HP or less, choose "Invent a correction", and fail the roll.
The game says "Pip, clerk. Corrected to death in the throne room." and logs "The
Throne" in the guest book. Right before that, Clarence says "You'll live. Probably.
Enter." The same thing happens with the marsh "I don't see anyone" failure, the foyer
steal failure, a natural 1 on the churchyard search, and a natural 1 on the ledger. A
tunnel death also reads "in the castle gate" where it should say "at the castle
gate." **Cost:** S.

### 3. Fix the Count's review on the four-jab run.

**What:** make the count word match the actual number, and stop the "where you
thought I couldn't hear" clause from repeating. **Why:** jabbing at every chance is
the funniest route, and right now it produces a card that contradicts itself.
**Where:** the review text on the ending and epitaph card. **Repro:** choose "He's a
wizard, then". At the churchyard, sneak past, then choose "Call him a wizard. Nobody's
here.", then "He is Merlin the wizard", then "I'm going in", then "You are Merlin the
wizard". The review says "three times" and lists four places, and the same card says
"Called him a wizard 4". Jabbing at the village gate plus the marsh gives "…at the
village gate, where you thought I couldn't hear and in the marsh, where you thought I
couldn't hear." **Cost:** S.

### 4. Show the roll that killed you and clear old dice.

**What:** reset the die panel on every scene, and show the fatal exchange before the
epitaph appears. **Why:** players feel cheated when a death shows a roll from ten
scenes earlier, sometimes styled as a green success, and they never see the hit that
ended the run. **Where:** the die panel, and the transition from combat to death.
**Repro:** in a Bram run, the churchyard roll "2 vs DC 9" was still showing in the
throne room and on his death screen. When Vellum died, the screen showed the
pre-combat "17 vs DC 11" as a success. The game never shows a line like "Count Merlin
hits for 5." **Cost:** S to M.

### 5. Put the tombstone line on the page and give every ending something to share.

**What:** show the tombstone line in large text on the page, and add a copyable share
line with the site link to every ending. **Why:** right now the tombstone only
appears inside the card image, where it's about 8px tall on a phone. Endings outside
the Daily Curse have no share text at all, and the daily line has no link. **Where:**
the ending actions on `index.html`. **Cost:** S.

### 6. Make the daily share line honest about retries.

**What:** add one green or red square per check, a retry count, and the link. **Why:**
the checkpoint replays the same dice and you can replay as often as you like, so "one
run a day" isn't really true. The share line only reflects the last attempt, and
squares read faster than a list of numbers. **Where:** the Daily Curse share line.
**Cost:** S.

### 7. Fix portraits and images on phones.

**What:** anchor the hero-select crop to the top of the image, keep a small portrait
visible during play under 800px wide, convert the portrait PNGs to small WebP or JPEG
files, and make the roadmap's shop frame taller. **Why:** at 360px the select screen
cuts through heads (Vellum's face is the worst case). The new portraits disappear
once play starts on narrow screens, and each PNG is about 1.4 to 1.5 MB. On the
roadmap at 1280px, the new shop art is cropped to a 140px strip that loses the
candle, the moon and the caped figure. **Where:** the select cards and in-game sheet
on `index.html`, the files in `images/`, and card 3 on `roadmap.html`. **Cost:** S to
M.

### 8. Show the real DC on Oronath's choices.

**What:** make the button show the DC the roll is actually checked against. **Why:**
a button that says "2d6 · DC 9 · mod -2" but rolls against DC 7 misleads players, and
"mod -2" reads like a penalty. Also, 5 of 14 random runs ended after only one or two
rolls, so a found-endings list like Oswald's guest book would give people a reason to
replay. **Where:** the choice buttons and the resolution screen on `oronath.html`.
**Cost:** S.

## Other defects

The ranked list covers most of what's broken. These are the rest:

- In the foyer, the steal critical failure contradicts itself. Oswald says "Take it.
  He will notice." and the next line says "The candlestick stays." This happens
  because the critical-failure lines are added after the regular failure lines.
- If you roll a natural 1 while fleeing and die from the flee damage while the mesmer
  attack is signaled, the tombstone says "Stilled to death," but mesmer does no
  damage.
- Roadmap card 7 mentions "(or the ledge)", but the game has no ledge. The option is
  "Tunnel the wall".
- "Gold wasted" counts the toll and every shop purchase, even though the review
  praises you for paying the toll.
- Taking the marsh jab route skips the toll entirely, and the review never mentions
  the toll on that route.
- Restoring from the checkpoint gives you back the HP you had when you reached the
  gate. If you arrived nearly dead, you can die over and over.
- Nothing scrolls sideways on any page at 360, 375 or 1280px, and there were no
  console errors.

## What I verified.

All six v1 endings still work. Saves survive a reload mid-scene, mid-combat and
mid-Oronath. The Daily seed gives the same hero and dice across browser profiles and
after a checkpoint restore. The Oronath fork is real: failures lead to four endings
that successes never reach. I mostly played normally. I forced dice or edited saves
only to reach the rare death branches, but every wrong-tombstone case uses a check
the game really offers. For example, a normal Bram run reached the churchyard search
at 2 HP.

## What I couldn't check.

I didn't test on a real phone, with touch input, or with the iOS clipboard. I also
didn't see a live day rollover, which happens at 8 PM ET according to the source. I
couldn't open the notes from passes 1 to 3, so I can't tell you which of their
findings are fixed now. If you paste those lists in, I'll check each one against the
live site. The Netlify badge also covers content on narrow screens, but that comes
from Netlify's hosting, not your code.

I left out the share-line screen and clipboard mismatch, as you asked.

## Attached evidence (images the reviewer posted)

- A death at the gate labeled as a throne-room death
- The review says three times while the card says 4
- plus four more screenshots
