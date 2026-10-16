/* The Nickel Coast arc — Node-only. */
"use strict";

var fs = require("fs");
var path = require("path");
var Arc = require("../arc.js");
var Build = require("../tools/build-arc.js");
var Dice = require("../dice.js");
var Loop = require("../loop.js");

var fails = 0;
var root = path.join(__dirname, "..");
var headMode = !!process.env.MERLIN_HEAD;

function assert(cond, msg) {
  if (!cond) {
    fails += 1;
    console.error("FAIL: " + msg);
  }
}

var jsonPath = headMode
  ? path.join(process.env.MERLIN_HEAD, "arcs", "nickel-coast.json")
  : path.join(root, "arcs", "nickel-coast.json");
var jsPath = headMode
  ? path.join(process.env.MERLIN_HEAD, "arcs", "nickel-coast.js")
  : path.join(root, "arcs", "nickel-coast.js");

assert(fs.existsSync(jsonPath), "arcs/nickel-coast.json exists");
assert(fs.existsSync(jsPath), "arcs/nickel-coast.js exists");

if (!fs.existsSync(jsonPath) || !fs.existsSync(jsPath)) {
  if (fails === 0) {
    console.log("nickel-coast ok");
  } else {
    console.error("nickel-coast FAILED (" + fails + ")");
    process.exitCode = 1;
  }
  process.exit(process.exitCode || 0);
}

var arc = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
var v = Arc.validateArc(arc);
assert(v.ok, "validateArc ok");
assert(v.errors.length === 0, "validateArc errors length 0");

assert(arc.id === "nickel-coast", "id nickel-coast");
assert(arc.title === "The Nickel Coast", "title The Nickel Coast");
assert(arc.chapters && arc.chapters.length === 6, "six chapters");
assert(arc.endings && arc.endings.length === 3, "three endings");
assert(arc.characters && arc.characters.length === 3, "three characters");
assert(arc.threads && arc.threads.length === 3, "three threads");

var threadIds = arc.threads.map(function (t) {
  return t.id;
});
var ei;
for (ei = 0; ei < arc.endings.length; ei++) {
  var end = arc.endings[ei];
  for (var ti = 0; ti < threadIds.length; ti++) {
    assert(
      end.resolves.indexOf(threadIds[ti]) !== -1,
      "ending " + end.id + " resolves " + threadIds[ti]
    );
  }
}

var choiceCount = 0;
var ci;
var ch;
var choices;
var declared = {};
for (ci = 0; ci < arc.chapters.length; ci++) {
  choices = arc.chapters[ci].choices || [];
  assert(
    choices.length >= 2 && choices.length <= 4,
    "chapter " + arc.chapters[ci].id + " has 2-4 choices"
  );
  choiceCount += choices.length;
  for (ch = 0; ch < choices.length; ch++) {
    var c = choices[ch];
    var cons = c.consequences;
    declared[c.id] = {
      "success": cons.success.next,
      "failure": cons.failure.next
    };
    assert(!!cons.success.text, "success text present for " + c.id);
    assert(!!cons.failure.text, "failure text present for " + c.id);
    if (cons.complication && cons.failure) {
      assert(
        cons.complication.next !== cons.failure.next,
        "no complication next equals its failure next for " + c.id
      );
    }
  }
}
assert(choiceCount === 19, "nineteen choices");

var tmpOut = path.join(require("os").tmpdir(), "nickel-coast-build-" + process.pid + ".js");
var built = Build.bundleFromFile(jsonPath, tmpOut);
assert(built.written, "fresh bundle writes");
var builtBytes = fs.readFileSync(tmpOut, "utf8");
var committedBytes = fs.readFileSync(jsPath, "utf8");
assert(builtBytes === committedBytes, "fresh bundle matches committed nickel-coast.js");
try {
  fs.unlinkSync(tmpOut);
} catch (e) {
  /* ignore */
}

delete require.cache[require.resolve(jsPath)];
global.OronathArcBundles = {};
global.OronathArcBundle = undefined;
require(jsPath);
assert(global.OronathArcBundles["nickel-coast"], "bundle on map");
assert(
  global.OronathArcBundle && global.OronathArcBundle.id === "nickel-coast",
  "require of the bundle sets OronathArcBundles[\"nickel-coast\"] and OronathArcBundle.id nickel-coast"
);

var Stories = require("../stories.js");
var entry = Stories.get("nickel-coast");
assert(
  entry && entry.cast.join(", ") === "Dez, Vale, Rook",
  "Stories.list cast for nickel-coast is Dez, Vale, Rook"
);
assert(entry && entry.chapterCount === 6, "Stories.list chapterCount is 6");

var deny = ["Atari", "Nintendo", "Pac-Man", "Donkey Kong", "Galaga", "Sega"];
var blob = (fs.readFileSync(jsonPath, "utf8") + builtBytes).toLowerCase();
var di;
for (di = 0; di < deny.length; di++) {
  assert(blob.indexOf(deny[di].toLowerCase()) === -1, "denylist absent " + deny[di]);
}

var bundle = global.OronathArcBundles["nickel-coast"];
// The engine reads a minimum face as `complication` and a maximum face as
// `bonus`, so plain success/failure needs faces off both ends, not 20s and 1s.
var successDice = function () {
  return Dice.sequence([15, 15, 15]);
};
var failureDice = function () {
  return Dice.sequence([2, 2, 2]);
};
var critDice = function () {
  return Dice.sequence([1, 1, 1]);
};
var maxDice = function () {
  return Dice.sequence([20, 20, 20]);
};

// ---- the two crit roads, which are real branches in this arc
var runCrit = Loop.createRun(bundle, { characters: bundle.characters, seed: 3 });
Loop.choose(runCrit, "dez-open-the-back", { rng: critDice() });
Loop.continueRun(runCrit);
assert(runCrit.outcome === null, "crit walk left the outcome phase");
assert(runCrit.nodeId === "back-office", "a minimum face takes dez-open-the-back's complication road");
assert(
  declared["dez-open-the-back"]["failure"] !== "back-office",
  "that complication road is not the failure road"
);

var runMax = Loop.createRun(bundle, { characters: bundle.characters, seed: 3 });
Loop.choose(runMax, "dez-open-the-back", { rng: maxDice() });
Loop.continueRun(runMax);
assert(runMax.nodeId === "high-score", "a maximum face takes dez-open-the-back's bonus road");

// ---- all-success walk: penny-floor -> high-score -> closing-time -> end-closed
var runWin = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
assert(runWin.nodeId === "penny-floor", "run starts at penny-floor");
Loop.choose(runWin, "dez-open-the-back", { rng: successDice() });
Loop.continueRun(runWin);
assert(
  runWin.nodeId === declared["dez-open-the-back"]["success"],
  "success of dez-open-the-back routes to its declared next (" + runWin.nodeId + ")"
);
assert(runWin.nodeId === "high-score", "success walk reaches high-score");
Loop.choose(runWin, "dez-pull-the-board", { rng: successDice() });
Loop.continueRun(runWin);
assert(runWin.nodeId === "closing-time", "success walk reaches closing-time");
Loop.choose(runWin, "dez-cut-the-breaker", { rng: successDice() });
Loop.continueRun(runWin);
assert(runWin.nodeId === "end-closed", "success walk reaches end-closed");

// ---- all-failure walk: penny-floor -> midway -> high-score -> closing-time -> end-tide
var runFail = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runFail, "dez-open-the-back", { rng: failureDice() });
Loop.continueRun(runFail);
assert(
  runFail.nodeId === declared["dez-open-the-back"]["failure"],
  "failure of dez-open-the-back routes to its declared next (" + runFail.nodeId + ")"
);
assert(runFail.nodeId === "midway", "failure walk reaches midway");
Loop.choose(runFail, "dez-cut-across-the-lot", { rng: failureDice() });
Loop.continueRun(runFail);
assert(runFail.nodeId === "high-score", "failure walk reaches high-score");
Loop.choose(runFail, "dez-pull-the-board", { rng: failureDice() });
Loop.continueRun(runFail);
assert(runFail.nodeId === "closing-time", "failure walk reaches closing-time");
Loop.choose(runFail, "dez-cut-the-breaker", { rng: failureDice() });
Loop.continueRun(runFail);
assert(runFail.nodeId === "end-tide", "failure walk reaches end-tide");

// ---- Vale's and Rook's roads route where they claim to
var runVale = Loop.createRun(bundle, { characters: bundle.characters, seed: 11 });
Loop.choose(runVale, "vale-read-the-register", { rng: successDice() });
Loop.continueRun(runVale);
assert(runVale.nodeId === "back-office", "vale-read-the-register success reaches back-office");
Loop.choose(runVale, "vale-pull-the-card", { rng: successDice() });
Loop.continueRun(runVale);
assert(runVale.nodeId === "room-eleven", "vale-pull-the-card success reaches room-eleven");
Loop.choose(runVale, "vale-sign-the-line", { rng: successDice() });
Loop.continueRun(runVale);
assert(runVale.nodeId === "closing-time", "vale-sign-the-line success reaches closing-time");

var runRook = Loop.createRun(bundle, { characters: bundle.characters, seed: 13 });
Loop.choose(runRook, "rook-feed-the-cabinet", { rng: successDice() });
Loop.continueRun(runRook);
assert(runRook.nodeId === "midway", "rook-feed-the-cabinet success reaches midway");
Loop.choose(runRook, "rook-walk-the-railing", { rng: successDice() });
Loop.continueRun(runRook);
assert(runRook.nodeId === "room-eleven", "rook-walk-the-railing success reaches room-eleven");
Loop.choose(runRook, "rook-take-the-bed", { rng: successDice() });
Loop.continueRun(runRook);
assert(runRook.nodeId === "high-score", "rook-take-the-bed success reaches high-score");
Loop.choose(runRook, "rook-play-one-more", { rng: successDice() });
Loop.continueRun(runRook);
assert(runRook.nodeId === "closing-time", "rook-play-one-more success reaches closing-time");
Loop.choose(runRook, "rook-pay-for-another-week", { rng: successDice() });
Loop.continueRun(runRook);
assert(runRook.nodeId === "end-open", "rook-pay-for-another-week success reaches end-open");

// A run handed no cast cannot resolve this arc's actors.
var badRun = Loop.createRun(bundle, { seed: 7 });
var actorFail = false;
try {
  Loop.choose(badRun, "dez-open-the-back", { rng: Dice.sequence([10]) });
} catch (e) {
  actorFail = true;
}
assert(actorFail, "createRun without characters throws unknown actor on dez-open-the-back");

if (fails === 0) {
  console.log("nickel-coast ok");
} else {
  console.error("nickel-coast FAILED (" + fails + ")");
  process.exitCode = 1;
}
