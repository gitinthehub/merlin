/* Front door — Node-only. MERLIN_HEAD points at HEAD copies for bite proof. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var fails = 0;
var root = path.join(__dirname, "..");
var headRoot = process.env.MERLIN_HEAD || root;

function assert(cond, msg) {
  if (!cond) {
    fails += 1;
    console.error("FAIL: " + msg);
  }
}

function read(rel) {
  return fs.readFileSync(path.join(headRoot, rel), "utf8");
}

function loadScript(sandbox, rel) {
  var file = rel;
  if (process.env.MERLIN_HEAD && (rel === "stories.js" || rel === "oronath-ui.js")) {
    file = rel;
  } else if (!process.env.MERLIN_HEAD || rel === "stories.js" || rel === "oronath-ui.js") {
    /* stories/oronath-ui from head when MERLIN_HEAD set via read path below */
  }
  var src;
  if (
    process.env.MERLIN_HEAD &&
    (rel === "stories.js" || rel === "oronath-ui.js")
  ) {
    src = read(rel);
  } else {
    src = fs.readFileSync(path.join(root, rel), "utf8");
  }
  vm.runInNewContext(src, sandbox, { filename: rel });
}

function makeNode(tag) {
  return {
    tagName: tag,
    className: "",
    id: "",
    href: "",
    textContent: "",
    children: [],
    parentNode: null,
    appendChild: function (child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild: function (child) {
      var at = this.children.indexOf(child);
      if (at !== -1) this.children.splice(at, 1);
      child.parentNode = null;
      return child;
    },
    addEventListener: function () {}
  };
}

function bootOronathWithHash(hash, prep) {
  var store = { _m: {}, getItem: function (k) { return this._m[k] || null; }, setItem: function (k, v) { this._m[k] = String(v); }, removeItem: function (k) { delete this._m[k]; } };
  var app = makeNode("div");
  app.id = "app";
  var document = {
    getElementById: function (id) {
      return id === "app" ? app : null;
    },
    createElement: function (tag) {
      return makeNode(tag);
    }
  };
  var sandbox = {
    console: console,
    localStorage: store,
    document: document,
    location: { hash: hash }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  var files = [
    "dice.js",
    "arc.js",
    "characters.js",
    "sample-arc.js",
    "arcs/last-signal.js",
    "arcs/pale-hand.js",
    "arcs/cinder-mile.js",
    "loop.js",
    "persist.js"
  ];
  var i;
  for (i = 0; i < files.length; i++) {
    vm.runInNewContext(fs.readFileSync(path.join(root, files[i]), "utf8"), sandbox, {
      filename: files[i]
    });
  }
  if (prep) prep(sandbox, store);
  loadScript(sandbox, "stories.js");
  loadScript(sandbox, "oronath-ui.js");
  return { app: app, store: store, sandbox: sandbox };
}

function textOf(node) {
  if (!node) return "";
  var s = node.textContent || "";
  var i;
  for (i = 0; i < node.children.length; i++) s += textOf(node.children[i]);
  return s;
}

/* stories.js door catalog */
var Stories;
(function () {
  global.OronathArcBundles = {};
  global.OronathArcBundle = undefined;
  require(path.join(root, "arcs/last-signal.js"));
  require(path.join(root, "arcs/pale-hand.js"));
  require(path.join(root, "arcs/cinder-mile.js"));
  require(path.join(root, "arcs/nickel-coast.js"));
  if (process.env.MERLIN_HEAD) {
    vm.runInNewContext(read("stories.js"), global, { filename: "stories.js" });
    Stories = global.OronathStories;
  } else {
    Stories = require(path.join(root, "stories.js"));
  }
})();

assert(typeof Stories.door === "function", "Stories.door is a function");
var door = typeof Stories.door === "function" ? Stories.door() : [];
assert(door.length === 3, "door has 3 rows");
assert(door[0] && door[0].id === "cinder-mile", "door[0] id cinder-mile");
assert(door[1] && door[1].id === "pale-hand", "door[1] id pale-hand");
assert(door[2] && door[2].id === "nickel-coast", "door[2] id nickel-coast");
assert(door[2] && door[2].playable, "door[2] playable");
assert(door[2] && !door[2].awaiting, "no awaiting row remains on the door");
assert(door[2] && door[2].title === "The Nickel Coast", "door[2] title The Nickel Coast");

var doorIds = { "cinder-mile": true, "pale-hand": true, "nickel-coast": true };
var reg = global.OronathArcBundles || {};
assert(reg["last-signal"], "last-signal is registered");
assert(!doorIds["last-signal"], "last-signal is registered and not a door row");

var di;
for (di = 0; di < door.length; di++) {
  if (!door[di].playable || door[di].awaiting) continue;
  var row = door[di];
  assert(reg[row.id], "playable door row on OronathArcBundles " + row.id);
  assert(row.cast && row.cast.length > 0, "playable door row cast " + row.id);
  assert(row.arc, "playable door row bundle " + row.id);
}

var indexHtml = process.env.MERLIN_HEAD ? read("index.html") : fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(indexHtml.indexOf('id="btn-start"') === -1, "index.html has no id=\"btn-start\"");
assert(indexHtml.indexOf('id="door"') !== -1, "index.html mounts #door");
assert(indexHtml.indexOf("engine.js") === -1, "index.html does not load engine.js");

var castleHtml = fs.readFileSync(path.join(root, "castle.html"), "utf8");
assert(castleHtml.indexOf('id="btn-start"') !== -1, "castle.html contains id=\"btn-start\"");
assert(castleHtml.indexOf('href="index.html"') !== -1, "castle.html links to index.html");

var oronathUi = process.env.MERLIN_HEAD
  ? read("oronath-ui.js")
  : fs.readFileSync(path.join(root, "oronath-ui.js"), "utf8");
assert(oronathUi.indexOf("location.hash") !== -1, "oronath-ui.js reads location.hash");

var hashBoot = bootOronathWithHash("#pale-hand/begin", function (sandbox, store) {
  var Loop = sandbox.OronathLoop;
  var Persist = sandbox.OronathPersist;
  var Dice = sandbox.OronathDice;
  var arc = sandbox.OronathArcBundles["pale-hand"];
  var run = Loop.createRun(arc, { characters: arc.characters, seed: 1 });
  Loop.choose(run, "jin-sewers", { rng: Dice.sequence([10]) });
  Loop.continueRun(run);
  Persist.save(run, store);
});
assert(
  textOf(hashBoot.app).indexOf("Beginning again replaces it.") !== -1,
  "hash #pale-hand/begin shows Beginning again replaces it."
);
var parked = JSON.parse(hashBoot.store.getItem("oronath.save.v1"));
assert(parked && parked.nodeId === "crosshaven", "stored nodeId stays crosshaven");

var roadmapMd = process.env.MERLIN_HEAD
  ? read("ROADMAP.md")
  : fs.readFileSync(path.join(root, "ROADMAP.md"), "utf8");
var roadmapJs = process.env.MERLIN_HEAD
  ? read("roadmap.js")
  : fs.readFileSync(path.join(root, "roadmap.js"), "utf8");
assert(roadmapMd.indexOf("2.12") !== -1, "ROADMAP.md contains 2.12");
assert(roadmapJs.indexOf("2.12") !== -1, "roadmap.js contains id 2.12");
assert(
  roadmapMd.indexOf("in progress") !== -1 && roadmapMd.indexOf("2.12") !== -1,
  "both mark 2.12 in progress"
);
assert(
  roadmapJs.indexOf('"in progress"') !== -1 && roadmapJs.indexOf('"2.12"') !== -1,
  "both mark 2.12 in progress"
);

var readme = process.env.MERLIN_HEAD
  ? read("README.md")
  : fs.readFileSync(path.join(root, "README.md"), "utf8");
assert(readme.indexOf("castle.html") !== -1, "README names castle.html");

if (fails === 0) {
  console.log("front-door ok");
} else {
  console.error("front-door FAILED (" + fails + ")");
  process.exitCode = 1;
}
