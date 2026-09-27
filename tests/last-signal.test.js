/* Oronath — shipped Last Signal arc. Node-only. */
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
    "oronath-last-signal-" + process.pid + "-" + name
  );
}

var srcJson = path.join(__dirname, "..", "arcs", "last-signal.json");
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

assert(arc.id === "last-signal", "id last-signal");
assert(arc.chapters && arc.chapters.length === 4, "four chapters");
assert(arc.chapters[0].title === "The Signal Tree", "ch1 title");
assert(arc.chapters[1].title === "The Echo Field", "ch2 title");
assert(arc.chapters[2].title === "The Axe Lock", "ch3 title");
assert(arc.chapters[3].title === "The Signal Core", "ch4 title");

assert(
  arc.characters &&
    arc.characters[0] &&
    typeof arc.characters[0] === "object" &&
    arc.characters[0].traits &&
    arc.characters[0].traits.length,
  "characters expanded with traits"
);

var ci;
var ch;
for (ci = 0; ci < arc.chapters.length; ci++) {
  var chapter = arc.chapters[ci];
  var choices = chapter.choices || [];
  for (ch = 0; ch < choices.length; ch++) {
    var choice = choices[ch];
    var cons = choice.consequences || {};
    assert(cons.success, "success present " + choice.id);
    assert(cons.failure, "failure present " + choice.id);
    assert(cons.complication, "complication present " + choice.id);
    assert(cons.bonus, "bonus present " + choice.id);
    assert(
      cons.success.text && cons.failure.text && cons.complication.text && cons.bonus.text,
      "consequence text non-blank " + choice.id
    );
    assert(
      cons.success.next && cons.failure.next && cons.complication.next && cons.bonus.next,
      "consequence next present " + choice.id
    );
    assert(
      cons.complication.next !== cons.failure.next,
      "complication.next !== failure.next for " + choice.id
    );
    var keys = ["success", "failure", "complication", "bonus"];
    var ki;
    for (ki = 0; ki < keys.length; ki++) {
      var node = cons[keys[ki]];
      assert(node.next !== chapter.id, "no self-next " + choice.id + "." + keys[ki]);
    }
  }
}

var endingIds = {};
var ei;
for (ei = 0; ei < (arc.endings || []).length; ei++) {
  var ending = arc.endings[ei];
  endingIds[ending.id] = ending;
  assert(
    ending.resolves &&
      ending.resolves.indexOf("john-memory") !== -1 &&
      ending.resolves.indexOf("joel-legacy") !== -1 &&
      ending.resolves.indexOf("rafe-return") !== -1,
    "ending " + ending.id + " resolves all three threads"
  );
}

var core = arc.chapters[3];
var byId = {};
for (ch = 0; ch < core.choices.length; ch++) {
  byId[core.choices[ch].id] = core.choices[ch];
}
assert(byId.destroy, "destroy choice");
assert(byId.activate, "activate choice");
assert(byId.portal, "portal choice");
assert(byId.destroy.consequences.success.next === "end-destroy", "destroy → end-destroy");
assert(byId.activate.consequences.success.next === "end-activate", "activate → end-activate");
assert(byId.portal.consequences.success.next === "end-portal", "portal → end-portal");
assert(
  byId.destroy.consequences.success.next !== byId.activate.consequences.success.next &&
    byId.activate.consequences.success.next !== byId.portal.consequences.success.next &&
    byId.destroy.consequences.success.next !== byId.portal.consequences.success.next,
  "three distinct final endings"
);

var lock = arc.chapters[2];
for (ch = 0; ch < lock.choices.length; ch++) {
  var lc = lock.choices[ch];
  assert(
    lc.consequences.failure.next === "signal-core",
    "lock failure → signal-core (" + lc.id + ")"
  );
  assert(
    lc.consequences.complication.next === "end-sealed",
    "lock complication → end-sealed (" + lc.id + ")"
  );
}

var MIN_FAILURE_FORKS = 10;
var forkCount = 0;
var choiceById = {};
for (ci = 0; ci < arc.chapters.length; ci++) {
  var chapFork = arc.chapters[ci];
  for (ch = 0; ch < (chapFork.choices || []).length; ch++) {
    var cf = chapFork.choices[ch];
    choiceById[cf.id] = cf;
    var ccons = cf.consequences || {};
    if (
      ccons.success &&
      ccons.failure &&
      ccons.failure.next !== ccons.success.next
    ) {
      forkCount += 1;
    }
  }
}
assert(
  forkCount >= MIN_FAILURE_FORKS,
  "failure forks >= " + MIN_FAILURE_FORKS + ", got " + forkCount
);

function assertFork(id, successNext, failureNext) {
  var c = choiceById[id];
  assert(c, "choice present " + id);
  if (!c) return;
  assert(
    c.consequences.success.next === successNext,
    id + " success → " + successNext
  );
  assert(
    c.consequences.failure.next === failureNext,
    id + " failure → " + failureNext
  );
}

assertFork("joel-climbs", "echo-field", "end-answered");
assertFork("john-climbs", "echo-field", "end-answered");
assertFork("rafe-shoots", "echo-field", "end-answered");
assertFork("team-climb", "echo-field", "end-answered");
assertFork("john-names-it", "axe-lock", "end-bearing");
assertFork("joel-cuts", "axe-lock", "end-bearing");
assertFork("rafe-horizon", "axe-lock", "end-bearing");
assertFork("destroy", "end-destroy", "end-watched");
assertFork("activate", "end-activate", "end-torn");
assertFork("portal", "end-portal", "end-shore");

var tree = arc.chapters[0];
var treeById = {};
for (ch = 0; ch < tree.choices.length; ch++) {
  treeById[tree.choices[ch].id] = tree.choices[ch];
}
assert(treeById["joel-climbs"].roll.die === "2d6", "joel-climbs die 2d6");
assert(treeById["joel-climbs"].roll.dc === 9, "joel-climbs dc 9");
var joel = Cast.pregen("joel");
var joelCheck = Cast.resolveCheck(joel, treeById["joel-climbs"].roll);
assert(joelCheck.modifier === -2, "joel strength mod -2");
assert(
  Dice.effectiveDc(joelCheck.dc, joelCheck.modifier) === 7,
  "joel-climbs effective DC 7"
);
var joelRun = Loop.createRun(arc, { seed: 1 });
Loop.choose(joelRun, "joel-climbs", { rng: Dice.sequence([3, 4, 1, 2]) });
assert(joelRun.outcome.result.dc === 7, "joel-climbs rolled vs DC 7");
var joelView = Loop.view(joelRun);
assert(
  joelView.outcome.equation.indexOf("vs DC 7") !== -1,
  "joel equation vs DC 7"
);
assert(treeById["john-climbs"].roll.die === "d20", "john-climbs die d20");
assert(
  treeById["john-climbs"].roll.tier === "medium",
  "john-climbs tier medium"
);
assert(treeById["rafe-shoots"].roll.die === "d10", "rafe-shoots die d10");
assert(treeById["rafe-shoots"].roll.dc === 8, "rafe-shoots dc 8");
assert(treeById["team-climb"].roll.die === "2d6", "team-climb die 2d6");
assert(treeById["team-climb"].roll.dc === 7, "team-climb dc 7");

var chapterIdSet = {};
var endingIdSet = {};
for (ci = 0; ci < arc.chapters.length; ci++) {
  if (arc.chapters[ci] && arc.chapters[ci].id) {
    chapterIdSet[arc.chapters[ci].id] = true;
  }
}
for (ei = 0; ei < (arc.endings || []).length; ei++) {
  if (arc.endings[ei] && arc.endings[ei].id) {
    endingIdSet[arc.endings[ei].id] = true;
  }
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
        "next is chapter or ending: " + wn.next + " from " + wchap.choices[ch].id
      );
      if (chapterIdSet[wn.next] && !visitedFromStart[wn.next]) {
        visitedFromStart[wn.next] = true;
        walkQueue.push(wn.next);
      }
      if (endingIdSet[wn.next]) {
        visitedFromStart[wn.next] = true;
      }
    }
  }
}
for (ci = 0; ci < arc.chapters.length; ci++) {
  assert(
    visitedFromStart[arc.chapters[ci].id],
    "chapter reachable from start: " + arc.chapters[ci].id
  );
}
for (ei = 0; ei < (arc.endings || []).length; ei++) {
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

var src = fs.readFileSync(outJs, "utf8");
assert(src.indexOf("OronathArcBundle") !== -1, "assigns OronathArcBundle");
assert(src.indexOf("import ") === -1, "no import");
assert(src.indexOf("export ") === -1, "no export");
assert(src.indexOf("XAI_API_KEY") === -1, "no XAI_API_KEY");
assert(src.indexOf("OPENAI_API_KEY") === -1, "no OPENAI_API_KEY");
assert(src.indexOf("Bearer") === -1, "no Bearer");

var raw = JSON.parse(fs.readFileSync(srcJson, "utf8"));
var expanded = Build.expandCharacters(raw);
var v2 = Arc.validateArc(expanded);
assert(v2.ok && v2.errors.length === 0, "source JSON also validates after expand");

var committedPath = path.join(__dirname, "..", "arcs", "last-signal.js");
var committedBytes = fs.readFileSync(committedPath, "utf8");
var builtBytes = fs.readFileSync(outJs, "utf8");
assert(
  committedBytes === builtBytes,
  "committed last-signal.js matches fresh bundle"
);

try {
  fs.unlinkSync(outJs);
} catch (e2) {
  /* ignore */
}

if (fails === 0) {
  console.log("last-signal ok");
} else {
  console.error("last-signal FAILED (" + fails + ")");
  process.exitCode = 1;
}
