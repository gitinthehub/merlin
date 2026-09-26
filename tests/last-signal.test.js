/* Oronath — shipped Last Signal arc. Node-only. */
"use strict";

var fs = require("fs");
var path = require("path");
var os = require("os");
var Arc = require("../arc.js");
var Build = require("../tools/build-arc.js");

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
