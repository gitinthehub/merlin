/* Oronath build-arc pipeline — Node-only tests. */
"use strict";

var fs = require("fs");
var path = require("path");
var os = require("os");
var child_process = require("child_process");
var Arc = require("../arc.js");
var Build = require("../tools/build-arc.js");

var fails = 0;
var pending = 0;

function assert(cond, msg) {
  if (!cond) {
    fails += 1;
    console.error("FAIL: " + msg);
  }
}

function hasRule(errors, rule) {
  var i;
  for (i = 0; i < (errors || []).length; i++) {
    if (errors[i].rule === rule) return true;
  }
  return false;
}

function tmpPath(name) {
  return path.join(
    os.tmpdir(),
    "oronath-build-arc-" + process.pid + "-" + name
  );
}

function finish() {
  if (pending > 0) return;
  if (fails === 0) {
    console.log("build-arc ok");
  } else {
    console.error("build-arc FAILED (" + fails + ")");
    process.exitCode = 1;
  }
}

function track(p) {
  pending += 1;
  return Promise.resolve(p).then(
    function () {
      pending -= 1;
      finish();
    },
    function (err) {
      fails += 1;
      console.error("FAIL: unhandled " + err);
      pending -= 1;
      finish();
    }
  );
}

var fixtures = path.join(__dirname, "fixtures");
var validJson = path.join(fixtures, "valid-arc.json");
var invalidJson = path.join(fixtures, "invalid-arc.json");

// --- Schema conformance of keyless artefact ---
(function () {
  var out = tmpPath("valid.js");
  try {
    if (fs.existsSync(out)) fs.unlinkSync(out);
  } catch (e) {
    /* ignore */
  }
  var result = Build.bundleFromFile(validJson, out);
  assert(result.written, "valid fixture should write");
  assert(fs.existsSync(out), "artefact file exists");
  delete require.cache[require.resolve(out)];
  var arc = require(out);
  var v = Arc.validateArc(arc);
  assert(v.ok, "bundled arc validates");
  assert(arc.id === "fixture-valid", "id preserved");
  assert(
    arc.characters &&
      arc.characters[0] &&
      typeof arc.characters[0] === "object" &&
      arc.characters[0].id === "john" &&
      arc.characters[0].traits &&
      arc.characters[0].traits.length,
    "characters expanded to objects with traits"
  );
  var src = fs.readFileSync(out, "utf8");
  assert(src.indexOf("OronathArcBundle") !== -1, "assigns OronathArcBundle");
  assert(src.indexOf("import ") === -1, "no import");
  assert(src.indexOf("export ") === -1, "no export");
  try {
    fs.unlinkSync(out);
  } catch (e2) {
    /* ignore */
  }
})();

// --- Refusal: invalid fixture ---
(function () {
  var out = tmpPath("refuse.js");
  var sentinel = "SENTINEL-DO-NOT-TOUCH";
  fs.writeFileSync(out, sentinel, "utf8");
  var result = Build.bundleFromFile(invalidJson, out);
  assert(!result.written, "invalid fixture must not write");
  assert(hasRule(result.errors, "chapter-count"), "reports chapter-count");
  var kept = fs.readFileSync(out, "utf8");
  assert(kept === sentinel, "existing out file left untouched");
  var formatted = Build.formatErrors(result.errors);
  assert(formatted.indexOf("chapter-count") !== -1, "format includes rule");
  assert(formatted.indexOf("chapters") !== -1, "format includes path");
  try {
    fs.unlinkSync(out);
  } catch (e) {
    /* ignore */
  }
})();

// --- Refusal: missing failure consequence (in-memory) ---
(function () {
  var arc = JSON.parse(fs.readFileSync(validJson, "utf8"));
  delete arc.chapters[0].choices[0].consequences.failure;
  var out = tmpPath("nofail.js");
  var result = Build.commitArc(arc, out);
  assert(!result.written, "missing failure must not write");
  assert(hasRule(result.errors, "missing-failure"), "reports missing-failure");
  assert(!fs.existsSync(out), "no artefact created");
})();

// --- Keyless CLI with keys unset ---
(function () {
  var out = tmpPath("cli-valid.js");
  try {
    if (fs.existsSync(out)) fs.unlinkSync(out);
  } catch (e) {
    /* ignore */
  }
  var script = path.join(__dirname, "..", "tools", "build-arc.js");
  var env = Object.assign({}, process.env);
  delete env.XAI_API_KEY;
  delete env.OPENAI_API_KEY;
  var r = child_process.spawnSync(
    process.execPath,
    [script, "--from", validJson, "--out", out],
    { env: env, encoding: "utf8" }
  );
  assert(r.status === 0, "keyless CLI exit 0, got " + r.status);
  assert(fs.existsSync(out), "keyless CLI wrote file");
  try {
    fs.unlinkSync(out);
  } catch (e2) {
    /* ignore */
  }

  var out2 = tmpPath("cli-missing-key.js");
  var r2 = child_process.spawnSync(
    process.execPath,
    [script, "--provider", "grok", "--out", out2],
    { env: env, encoding: "utf8" }
  );
  assert(r2.status === 2, "missing key exit 2, got " + r2.status);
  assert(
    String(r2.stderr || "").indexOf("missing") !== -1,
    "missing key message"
  );
  assert(!fs.existsSync(out2), "missing key writes nothing");
})();

// --- Provider stub: retry feeds errors, then succeeds ---
track(
  (function () {
    var valid = JSON.parse(fs.readFileSync(validJson, "utf8"));
    var bad = JSON.parse(JSON.stringify(valid));
    bad.chapters[0].choices[0].consequences.success.next = "no-such-node";
    var bodies = [];
    var call = 0;
    function request(opts, body, cb) {
      bodies.push(body);
      call += 1;
      var content = call === 1 ? bad : valid;
      cb(null, {
        status: 200,
        body: JSON.stringify({
          choices: [{ message: { content: JSON.stringify(content) } }]
        })
      });
    }
    var out = tmpPath("provider-retry.js");
    try {
      if (fs.existsSync(out)) fs.unlinkSync(out);
    } catch (e) {
      /* ignore */
    }
    return Build.bundleFromProvider({
      provider: "grok",
      apiKey: "test-key",
      outPath: out,
      request: request
    }).then(function (result) {
      assert(result.written, "provider retry should write");
      assert(call === 2, "two provider calls");
      assert(
        bodies[1].indexOf("dangling-next") !== -1,
        "second request includes dangling-next"
      );
      assert(fs.existsSync(out), "provider wrote artefact");
      try {
        fs.unlinkSync(out);
      } catch (e2) {
        /* ignore */
      }
    });
  })()
);

// --- Provider stub: always invalid, no write after 3 calls ---
track(
  (function () {
    var valid = JSON.parse(fs.readFileSync(validJson, "utf8"));
    var bad = JSON.parse(JSON.stringify(valid));
    bad.chapters[0].choices[0].consequences.success.next = "no-such-node";
    var call = 0;
    function request(opts, body, cb) {
      call += 1;
      cb(null, {
        status: 200,
        body: JSON.stringify({
          choices: [{ message: { content: JSON.stringify(bad) } }]
        })
      });
    }
    var out = tmpPath("provider-fail.js");
    try {
      if (fs.existsSync(out)) fs.unlinkSync(out);
    } catch (e) {
      /* ignore */
    }
    return Build.bundleFromProvider({
      provider: "grok",
      apiKey: "test-key",
      outPath: out,
      request: request
    }).then(function (result) {
      assert(!result.written, "always-invalid must not write");
      assert(call === 3, "three provider calls, got " + call);
      assert(!fs.existsSync(out), "no artefact after exhausted retries");
    });
  })()
);

// --- Provider stub: non-JSON then valid ---
track(
  (function () {
    var valid = JSON.parse(fs.readFileSync(validJson, "utf8"));
    var call = 0;
    function request(opts, body, cb) {
      call += 1;
      var content =
        call === 1 ? "not json at all" : JSON.stringify(valid);
      cb(null, {
        status: 200,
        body: JSON.stringify({
          choices: [{ message: { content: content } }]
        })
      });
    }
    var out = tmpPath("provider-parse.js");
    try {
      if (fs.existsSync(out)) fs.unlinkSync(out);
    } catch (e) {
      /* ignore */
    }
    return Build.bundleFromProvider({
      provider: "grok",
      apiKey: "test-key",
      outPath: out,
      request: request
    }).then(function (result) {
      assert(result.written, "non-JSON then valid should write");
      assert(call === 2, "parse retry used two calls");
      assert(fs.existsSync(out), "parse-retry wrote artefact");
      try {
        fs.unlinkSync(out);
      } catch (e2) {
        /* ignore */
      }
    });
  })()
);

// --- Provider stub: 401, no retry, no write ---
track(
  (function () {
    var call = 0;
    function request(opts, body, cb) {
      call += 1;
      cb(null, { status: 401, body: "unauthorized" });
    }
    var out = tmpPath("provider-401.js");
    try {
      if (fs.existsSync(out)) fs.unlinkSync(out);
    } catch (e) {
      /* ignore */
    }
    return Build.bundleFromProvider({
      provider: "openai",
      apiKey: "bad-key",
      outPath: out,
      request: request
    }).then(function (result) {
      assert(!result.written, "401 must not write");
      assert(call === 1, "401 does not retry");
      assert(
        String(result.fatal || "").indexOf("rejected the key") !== -1,
        "401 message"
      );
      assert(!fs.existsSync(out), "401 writes nothing");
    });
  })()
);

finish();
