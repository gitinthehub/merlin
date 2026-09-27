/* Oronath — shipped Pale Hand arc. Node-only. */
"use strict";

var fs = require("fs");
var path = require("path");
var os = require("os");
var Arc = require("../arc.js");
var Build = require("../tools/build-arc.js");
var Dice = require("../dice.js");
var Cast = require("../characters.js");
var Loop = require("../loop.js");

var fails = 0;

function assert(cond, msg) {
  if (!cond) {
    fails += 1;
    console.error("FAIL: " + msg);
  }
}

function tmpPath(name) {
  return path.join(
    os.tmpdir(),
    "oronath-pale-hand-" + process.pid + "-" + name
  );
}

var srcJson = path.join(__dirname, "..", "arcs", "pale-hand.json");
var committedPath = path.join(__dirname, "..", "arcs", "pale-hand.js");
var outJs = tmpPath("bundle.js");

try {
  if (fs.existsSync(outJs)) fs.unlinkSync(outJs);
} catch (e) {
  /* ignore */
}

var result = Build.bundleFromFile(srcJson, outJs);
assert(result.written, "keyless bundle writes");
assert(fs.existsSync(outJs), "artefact exists");

delete require.cache[require.resolve(outJs)];
var arc = require(outJs);
var v = Arc.validateArc(arc);
assert(v.ok, "validateArc ok");
assert(v.errors.length === 0, "validateArc errors === 0, got " + v.errors.length);

var committedBytes = fs.readFileSync(committedPath, "utf8");
var builtBytes = fs.readFileSync(outJs, "utf8");
assert(committedBytes === builtBytes, "committed pale-hand.js matches fresh bundle");

assert(arc.id === "pale-hand", "id pale-hand");
assert(arc.chapters && arc.chapters.length === 5, "five chapters");

var chapterExpect = [
  ["lantern-quarter", "The Lantern Quarter"],
  ["crosshaven", "Crosshaven Market"],
  ["toll-bridge", "The Toll Bridge"],
  ["thornwood", "The Thornwood Ambush"],
  ["the-ford", "The Hand at the Ford"]
];
var ci;
for (ci = 0; ci < chapterExpect.length; ci++) {
  assert(arc.chapters[ci].id === chapterExpect[ci][0], "chapter id " + chapterExpect[ci][0]);
  assert(
    arc.chapters[ci].title === chapterExpect[ci][1],
    "chapter title " + chapterExpect[ci][1]
  );
}

var endingExpect = [
  ["end-hand-turns", "The Hand Turns"],
  ["end-hand-falls", "The Hand Falls"],
  ["end-hand-vanishes", "The Hand Vanishes"],
  ["end-bargain", "The Courier's Bargain"],
  ["end-captured", "Captured"]
];
assert(arc.endings && arc.endings.length === 5, "five endings");
var ei;
for (ei = 0; ei < endingExpect.length; ei++) {
  assert(arc.endings[ei].id === endingExpect[ei][0], "ending id " + endingExpect[ei][0]);
  assert(
    arc.endings[ei].title === endingExpect[ei][1],
    "ending title " + endingExpect[ei][1]
  );
  assert(
    arc.endings[ei].resolves &&
      arc.endings[ei].resolves.indexOf("jin-ledger") !== -1 &&
      arc.endings[ei].resolves.indexOf("wren-band") !== -1 &&
      arc.endings[ei].resolves.indexOf("thorne-resistance") !== -1,
    "ending " + arc.endings[ei].id + " resolves all three threads"
  );
}

var choiceExpect = [
  ["jin-rooftops", "Take the rooftops and go over the city wall"],
  ["jin-sewers", "Take the sewers out to the river grate"],
  ["jin-bluff-gate", "Bluff the gate guards as a drunk dockworker"],
  ["jin-watch-patrols", "Watch the patrols from Vera's window and find the seam"],
  ["jin-bram-main", "Haggle Bram for rope and a potion, then take the main road"],
  ["jin-bram-wood", "Buy the climbing rope and take the Thornwood Pass"],
  ["jin-fortune", "Pay the toothless fortune-teller, then ride the main road"],
  ["jin-no-stop", "Take the pass without stopping for anyone"],
  ["jin-bribe", "Put silver in the sergeant's hand"],
  ["jin-checkpoint-bluff", "Bluff the sergeant with a dockworker's accent"],
  ["jin-under-bridge", "Climb under the bridge on the beams"],
  ["jin-fight-checkpoint", "Draw the short sword"],
  ["jin-still", "Stay still, count the archers, and watch"],
  ["jin-talk", "Talk: tell them what the Ledger holds"],
  ["jin-fight-band", "Fight them"],
  ["jin-smoke-bomb", "Smoke bomb and ride"],
  ["jin-fight-hand", "Draw the short sword and go at him in the fog"],
  ["jin-show-ledger", "Show him the Millbrook page and tell him about his mother"],
  ["jin-offer-ledger", "Offer the Ledger in exchange for Thorne's life"],
  ["jin-smoke-thorne", "Smoke bomb, then drag Thorne out of the tent"]
];

var choiceById = {};
var choiceOrder = [];
var ch;
for (ci = 0; ci < arc.chapters.length; ci++) {
  var chapter = arc.chapters[ci];
  var choices = chapter.choices || [];
  for (ch = 0; ch < choices.length; ch++) {
    choiceById[choices[ch].id] = choices[ch];
    choiceById[choices[ch].id]._chapterId = chapter.id;
    choiceOrder.push(choices[ch]);
  }
}
assert(choiceOrder.length === 20, "twenty choices");
for (ci = 0; ci < choiceExpect.length; ci++) {
  assert(choiceOrder[ci].id === choiceExpect[ci][0], "choice id " + choiceExpect[ci][0]);
  assert(
    choiceOrder[ci].label === choiceExpect[ci][1],
    "choice label " + choiceExpect[ci][0]
  );
  assert(choiceOrder[ci].actor === "jin", "actor jin " + choiceExpect[ci][0]);
}

var bridgeNotice = "Millbrook: clearance in thirty days. By order of Corvane.";
var marginNote = "The Hand's mother still lives there. Do NOT inform him.";
var wrenLine =
  "The Hand came through yesterday. Didn't touch us. Asked about Millbrook, of all places.";
var tollIds = [
  "jin-bribe",
  "jin-checkpoint-bluff",
  "jin-under-bridge",
  "jin-fight-checkpoint"
];

for (ci = 0; ci < choiceOrder.length; ci++) {
  var choice = choiceOrder[ci];
  var cons = choice.consequences || {};
  var chapterId = choice._chapterId;
  assert(cons.success, "success present " + choice.id);
  assert(cons.failure, "failure present " + choice.id);
  assert(cons.complication, "complication present " + choice.id);
  assert(cons.bonus, "bonus present " + choice.id);
  assert(
    cons.success &&
      cons.failure &&
      cons.complication &&
      cons.bonus &&
      cons.success.text &&
      cons.failure.text &&
      cons.complication.text &&
      cons.bonus.text,
    "consequence text non-blank " + choice.id
  );
  assert(
    cons.success &&
      cons.failure &&
      cons.complication &&
      cons.bonus &&
      cons.success.next &&
      cons.failure.next &&
      cons.complication.next &&
      cons.bonus.next,
    "consequence next present " + choice.id
  );
  if (cons.complication && cons.failure) {
    assert(
      cons.complication.next !== cons.failure.next,
      "complication.next !== failure.next for " + choice.id
    );
  }
  var keys = ["success", "failure", "complication", "bonus"];
  var ki;
  for (ki = 0; ki < keys.length; ki++) {
    var node = cons[keys[ki]];
    if (!node) continue;
    assert(node.next !== chapterId, "no self-next " + choice.id + "." + keys[ki]);
  }
}

for (ci = 0; ci < tollIds.length; ci++) {
  var toll = choiceById[tollIds[ci]];
  assert(
    toll.consequences.success.resolves.indexOf("jin-ledger") !== -1,
    tollIds[ci] + " success closes jin-ledger"
  );
  assert(
    toll.consequences.bonus.resolves.indexOf("jin-ledger") !== -1,
    tollIds[ci] + " bonus closes jin-ledger"
  );
  assert(
    toll.consequences.success.text.indexOf(bridgeNotice) !== -1 &&
      toll.consequences.success.text.indexOf(marginNote) !== -1,
    tollIds[ci] + " success has bridge lines"
  );
  assert(
    toll.consequences.bonus.text.indexOf(bridgeNotice) !== -1 &&
      toll.consequences.bonus.text.indexOf(marginNote) !== -1,
    tollIds[ci] + " bonus has bridge lines"
  );
}

var talk = choiceById["jin-talk"];
assert(talk.consequences.success.resolves.indexOf("wren-band") !== -1, "talk success wren-band");
assert(talk.consequences.success.resolves.indexOf("jin-ledger") !== -1, "talk success jin-ledger");
assert(talk.consequences.bonus.resolves.indexOf("wren-band") !== -1, "talk bonus wren-band");
assert(talk.consequences.bonus.resolves.indexOf("jin-ledger") !== -1, "talk bonus jin-ledger");
assert(
  talk.consequences.failure.resolves.indexOf("wren-band") === -1 &&
    talk.consequences.failure.resolves.indexOf("jin-ledger") === -1,
  "talk failure closes neither"
);
assert(
  talk.consequences.complication.resolves.indexOf("wren-band") === -1 &&
    talk.consequences.complication.resolves.indexOf("jin-ledger") === -1,
  "talk complication closes neither"
);
assert(talk.consequences.success.text.indexOf(wrenLine) !== -1, "talk success Wren line");
assert(talk.consequences.bonus.text.indexOf(wrenLine) !== -1, "talk bonus Wren line");

var show = choiceById["jin-show-ledger"];
assert(show.consequences.success.next === "end-hand-turns", "show success → end-hand-turns");
assert(show.consequences.bonus.next === "end-hand-turns", "show bonus → end-hand-turns");
assert(show.consequences.failure.next === "end-hand-vanishes", "show failure → end-hand-vanishes");
assert(
  show.consequences.complication.next === "end-captured",
  "show complication → end-captured"
);

function resolvesLedger(node) {
  return node && node.resolves && node.resolves.indexOf("jin-ledger") !== -1;
}
assert(!resolvesLedger(choiceById["jin-fortune"].consequences.success), "fortune does not close ledger");
assert(
  !resolvesLedger(choiceById["jin-watch-patrols"].consequences.success),
  "watch does not close ledger"
);

var jin = null;
for (ci = 0; ci < arc.characters.length; ci++) {
  if (arc.characters[ci].id === "jin") jin = arc.characters[ci];
}
assert(jin && jin.name === "Jin", "jin on the arc");

function effOf(id) {
  var choice = choiceById[id];
  var check = Cast.resolveCheck(jin, choice.roll);
  return {
    check: check,
    dc: Dice.effectiveDc(check.dc, check.modifier)
  };
}

var roofs = effOf("jin-rooftops");
assert(roofs.check.die === "d20", "jin-rooftops die");
assert(roofs.check.tier === "hard", "jin-rooftops tier");
assert(roofs.check.tags[0] === "clumsy-hands", "jin-rooftops tag");
assert(roofs.check.modifier === 1, "jin-rooftops modifier");
assert(roofs.check.advantage === false, "jin-rooftops no advantage");
assert(roofs.dc === 15, "jin-rooftops eff 15");

var sewers = effOf("jin-sewers");
assert(sewers.check.die === "d20", "jin-sewers die");
assert(sewers.check.tier === "medium", "jin-sewers tier");
assert(sewers.check.tags[0] === "sharp-mind", "jin-sewers tag");
assert(sewers.check.modifier === -2, "jin-sewers modifier");
assert(sewers.check.advantage === false, "jin-sewers no advantage");
assert(sewers.dc === 9, "jin-sewers eff 9");

var bribe = effOf("jin-bribe");
assert(bribe.check.die === "d20", "jin-bribe die");
assert(bribe.check.tier === "easy", "jin-bribe tier");
assert(bribe.check.tags[0] === "steady-voice", "jin-bribe tag");
assert(bribe.check.modifier === 0, "jin-bribe modifier");
assert(bribe.check.advantage === true, "jin-bribe advantage");
assert(bribe.dc === 8, "jin-bribe eff 8");

var fightHand = effOf("jin-fight-hand");
assert(fightHand.check.die === "d20", "jin-fight-hand die");
assert(fightHand.check.tier === "veryHard", "jin-fight-hand tier");
assert(fightHand.check.tags[0] === "fighting", "jin-fight-hand tag");
assert(fightHand.check.modifier === -1, "jin-fight-hand modifier");
assert(fightHand.check.advantage === false, "jin-fight-hand no advantage");
assert(fightHand.dc === 15, "jin-fight-hand eff 15");

var chapterIdSet = {};
var endingIdSet = {};
for (ci = 0; ci < arc.chapters.length; ci++) {
  chapterIdSet[arc.chapters[ci].id] = true;
}
for (ei = 0; ei < arc.endings.length; ei++) {
  endingIdSet[arc.endings[ei].id] = true;
}

var visitedFromStart = {};
var walkQueue = [arc.chapters[0].id];
visitedFromStart[arc.chapters[0].id] = true;
while (walkQueue.length) {
  var wid = walkQueue.shift();
  var wchap = null;
  for (ci = 0; ci < arc.chapters.length; ci++) {
    if (arc.chapters[ci].id === wid) {
      wchap = arc.chapters[ci];
      break;
    }
  }
  if (!wchap) continue;
  for (ch = 0; ch < (wchap.choices || []).length; ch++) {
    var wcons = wchap.choices[ch].consequences || {};
    var wkeys = ["success", "failure", "complication", "bonus"];
    var wki;
    for (wki = 0; wki < wkeys.length; wki++) {
      var wn = wcons[wkeys[wki]];
      if (!wn || !wn.next) continue;
      assert(
        chapterIdSet[wn.next] || endingIdSet[wn.next],
        "next is chapter or ending: " + wn.next
      );
      if (chapterIdSet[wn.next] && !visitedFromStart[wn.next]) {
        visitedFromStart[wn.next] = true;
        walkQueue.push(wn.next);
      }
      if (endingIdSet[wn.next]) visitedFromStart[wn.next] = true;
    }
  }
}
for (ci = 0; ci < arc.chapters.length; ci++) {
  assert(
    visitedFromStart[arc.chapters[ci].id],
    "chapter reachable from start: " + arc.chapters[ci].id
  );
}
for (ei = 0; ei < arc.endings.length; ei++) {
  assert(
    visitedFromStart[arc.endings[ei].id],
    "ending reachable from start: " + arc.endings[ei].id
  );
}

var canFinish = {};
function markFinish(nodeId, stack) {
  if (endingIdSet[nodeId]) {
    canFinish[nodeId] = true;
    return true;
  }
  if (!chapterIdSet[nodeId]) return false;
  if (Object.prototype.hasOwnProperty.call(canFinish, nodeId)) {
    return canFinish[nodeId];
  }
  if (stack[nodeId]) {
    canFinish[nodeId] = false;
    return false;
  }
  stack[nodeId] = true;
  var mchap = null;
  for (ci = 0; ci < arc.chapters.length; ci++) {
    if (arc.chapters[ci].id === nodeId) {
      mchap = arc.chapters[ci];
      break;
    }
  }
  var ok = false;
  if (mchap) {
    for (ch = 0; ch < (mchap.choices || []).length; ch++) {
      var mcons = mchap.choices[ch].consequences || {};
      var mkeys = ["success", "failure", "complication", "bonus"];
      var mki;
      for (mki = 0; mki < mkeys.length; mki++) {
        var mn = mcons[mkeys[mki]];
        if (!mn || !mn.next) continue;
        if (markFinish(mn.next, stack)) ok = true;
      }
    }
  }
  delete stack[nodeId];
  canFinish[nodeId] = ok;
  return ok;
}
for (ci = 0; ci < arc.chapters.length; ci++) {
  assert(
    markFinish(arc.chapters[ci].id, {}),
    "chapter can reach an ending: " + arc.chapters[ci].id
  );
}

function hasCycle(nodeId, pathSet) {
  if (endingIdSet[nodeId]) return false;
  if (!chapterIdSet[nodeId]) return false;
  if (pathSet[nodeId]) return true;
  pathSet[nodeId] = true;
  var cchap = null;
  for (ci = 0; ci < arc.chapters.length; ci++) {
    if (arc.chapters[ci].id === nodeId) {
      cchap = arc.chapters[ci];
      break;
    }
  }
  if (cchap) {
    for (ch = 0; ch < (cchap.choices || []).length; ch++) {
      var ccons = cchap.choices[ch].consequences || {};
      var ckeys = ["success", "failure", "complication", "bonus"];
      var cki;
      for (cki = 0; cki < ckeys.length; cki++) {
        var cn = ccons[ckeys[cki]];
        if (!cn || !cn.next) continue;
        if (hasCycle(cn.next, pathSet)) return true;
      }
    }
  }
  delete pathSet[nodeId];
  return false;
}
assert(!hasCycle(arc.chapters[0].id, {}), "no cycle from start");

var verbatim = [
  "You're faster than a letter and dumber than a coward. Perfect. Go.",
  "Horse. Weapon. Walk away.",
  "Courier. You carry something that belongs to the Magistrate. Set it down and walk away. I don't kill people who aren't on my list.",
  wrenLine,
  "The Hand will know these. He trained me.",
  bridgeNotice,
  marginNote,
  "She's still there. My mother.",
  "You nearly had it, courier.",
  "We'll get it back."
];
var src = fs.readFileSync(outJs, "utf8");
for (ci = 0; ci < verbatim.length; ci++) {
  assert(src.indexOf(verbatim[ci]) !== -1, "verbatim present: " + verbatim[ci].slice(0, 24));
}
assert(src.indexOf("OronathArcBundle") !== -1, "assigns OronathArcBundle");
assert(src.indexOf("OronathArcBundles") !== -1, "assigns OronathArcBundles");
assert(src.indexOf("import ") === -1, "no import");
assert(src.indexOf("export ") === -1, "no export");
assert(src.indexOf("XAI_API_KEY") === -1, "no XAI_API_KEY");
assert(src.indexOf("OPENAI_API_KEY") === -1, "no OPENAI_API_KEY");
assert(src.indexOf("Bearer") === -1, "no Bearer");

delete require.cache[require.resolve(committedPath)];
require(committedPath);
assert(
  global.OronathArcBundles &&
    global.OronathArcBundles["pale-hand"] &&
    global.OronathArcBundles["pale-hand"].id === "pale-hand",
  "committed bundle registers pale-hand"
);

var raw = JSON.parse(fs.readFileSync(srcJson, "utf8"));
assert(raw.characters && raw.characters[0] && raw.characters[0].id === "jin", "source jin");
assert(typeof raw.characters[0] === "object", "source characters are objects");
assert(raw.characters[0].traits && raw.characters[0].traits.length, "source jin has traits");
var expanded = Build.expandCharacters(raw);
assert(expanded.characters[0].id === "jin", "expand keeps jin");
assert(expanded.characters[0].name === "Jin", "expand keeps Jin");
assert(expanded.characters[1].id === "wren", "expand keeps wren");
assert(expanded.characters[2].id === "thorne", "expand keeps thorne");
assert(expanded.characters[0].id !== "john", "expand does not swap in john");
var v2 = Arc.validateArc(expanded);
assert(v2.ok && v2.errors.length === 0, "source JSON also validates after expand");

var bareThrew = false;
var bareMsg = "";
try {
  var bare = Loop.createRun(arc, { seed: 1 });
  Loop.choose(bare, "jin-sewers", { rng: Dice.sequence([10]) });
} catch (err) {
  bareThrew = true;
  bareMsg = err && err.message ? err.message : String(err);
}
assert(
  bareThrew && bareMsg.indexOf("unknown actor: jin") !== -1,
  "createRun without characters throws unknown actor: jin"
);

var skip = Loop.createRun(arc, { characters: arc.characters, seed: 1 });
Loop.choose(skip, "jin-rooftops", { rng: Dice.sequence([1]) });
assert(skip.outcome.branch === "complication", "rooftops nat 1 is complication");
Loop.continueRun(skip);
assert(skip.nodeId === "toll-bridge", "nat 1 skips the market");
assert(skip.phase === "choose", "toll-bridge is choose");

var run = Loop.createRun(arc, { characters: arc.characters, seed: 1 });
Loop.choose(run, "jin-sewers", { rng: Dice.sequence([10]) });
assert(run.outcome.branch === "success", "sewers success");
Loop.continueRun(run);
assert(run.nodeId === "crosshaven" && run.phase === "choose", "sewers → crosshaven");
Loop.choose(run, "jin-no-stop", { rng: Dice.sequence([12]) });
assert(run.outcome.branch === "success", "no-stop success");
Loop.continueRun(run);
assert(run.nodeId === "thornwood" && run.phase === "choose", "no-stop → thornwood");
Loop.choose(run, "jin-talk", { rng: Dice.sequence([15, 3]) });
assert(run.outcome.branch === "success", "talk success");
assert(run.resolvedThreads.indexOf("wren-band") !== -1, "talk closed wren-band");
assert(run.resolvedThreads.indexOf("jin-ledger") !== -1, "talk closed jin-ledger");
assert(
  run.resolvedThreads.indexOf("thorne-resistance") === -1,
  "thorne-resistance still open before the ending"
);
Loop.continueRun(run);
assert(run.nodeId === "the-ford" && run.phase === "choose", "talk → the-ford");
Loop.choose(run, "jin-show-ledger", { rng: Dice.sequence([12, 4]) });
assert(run.outcome.branch === "success", "show-ledger success");
Loop.continueRun(run);
assert(run.nodeId === "end-hand-turns", "played run ends on end-hand-turns");
assert(run.phase === "resolved", "played run phase resolved");
assert(Loop.openThreads(run).length === 0, "played run open threads 0");

try {
  fs.unlinkSync(outJs);
} catch (e2) {
  /* ignore */
}

if (fails === 0) {
  console.log("pale-hand ok");
} else {
  console.error("pale-hand FAILED (" + fails + ")");
  process.exitCode = 1;
}
