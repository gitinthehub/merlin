#!/usr/bin/env node
/* MERLIN / Oronath — local arc pre-generation. Node built-ins only. Not loaded by the browser. */
"use strict";

var fs = require("fs");
var path = require("path");
var https = require("https");
var Arc = require("../arc.js");
var Cast = require("../characters.js");

var MAX_PROVIDER_CALLS = 3;

var DEFAULT_SPEC =
  "The Last Signal of Oronath. Characters: John (stealth, night vision, endurance; arc: memory/identity), " +
  "Joel (strength, an axe with unknown carvings; arc: legacy), Rafe (speed, sniper, alien origin; arc: return-home). " +
  "Four chapters: The Signal Tree (retrieve a pulsing crystal from an 80-foot dead tree with glowing blue veins), " +
  "The Echo Field (illusions built from memory; John's past is triggered; navigating truth vs illusion), " +
  "The Axe Lock (Joel's axe carvings match a hidden vault; decode and align; failure triggers guardians), " +
  "The Signal Core (an alien device tied to Rafe's origin; final choice: destroy it, activate it, or use it as a portal). " +
  "All character arcs must resolve by the end. Tone: cinematic, vivid, specific, visual; clear cause → effect → consequence.";

var SYSTEM_PROMPT =
  "You generate complete MERLIN/Oronath story arcs as a single JSON object with no markdown fences and no commentary.\n" +
  "Schema:\n" +
  "- id (string), version (number, use 1), title (string)\n" +
  '- characters: either the strings "john", "joel", "rafe", or full character objects with id/name/threadId/traits\n' +
  "- threads: array of { id, characterId, label }\n" +
  "- chapters: length 3–5; each has id, title, setting, objective, choices (length 2–4)\n" +
  "- each choice: id, label, actor (john|joel|rafe), roll, consequences\n" +
  "- roll.die is d20|d10|2d6; d20 uses tier easy|medium|hard|veryHard (DCs 8/11/14/16); " +
  "d10 and 2d6 use numeric dc; tags are trait ids from the cast\n" +
  "- consequences.success and consequences.failure are required; complication and bonus are optional\n" +
  "- each consequence: { text, next, resolves } where next is a chapter or ending id (never the current chapter)\n" +
  "- endings: array of { id, title, text, resolves }\n" +
  "Rules the validator enforces: chapter-count, choice-count, missing-setting, missing-objective, missing-roll, " +
  "bad-tier, missing-dc, missing-success, missing-failure, self-next, dangling-next, missing-thread, " +
  "thread-mismatch, unknown-character, cycle, unreachable, unresolved-thread.\n" +
  "Cast: John john traits stealth, night-vision, endurance thread john-memory (memory/identity); " +
  "Joel joel traits strength, carved-axe thread joel-legacy (legacy); " +
  "Rafe rafe traits speed, sniper, alien-origin thread rafe-return (return-home).\n" +
  "chapters[0] is the start. Every chapter and ending must be reachable. No cycles. " +
  "Every thread must resolve on every path via consequence.resolves or ending.resolves. " +
  "Tone: cinematic, vivid, specific, visual; cause then effect then consequence; no vague resolutions.";

function formatErrors(errors) {
  var lines = [];
  var i;
  for (i = 0; i < (errors || []).length; i++) {
    var e = errors[i];
    lines.push(
      (e.rule || "?") + "\t" + (e.path || "") + "\t" + (e.message || "")
    );
  }
  return lines.join("\n");
}

function characterIndex(characters) {
  var map = {};
  var i;
  for (i = 0; i < (characters || []).length; i++) {
    if (characters[i] && characters[i].id) map[characters[i].id] = characters[i];
  }
  return map;
}

function expandCharacters(arc) {
  if (!arc || typeof arc !== "object") return arc;
  var out = JSON.parse(JSON.stringify(arc));
  var chars = out.characters || [];
  var expanded = [];
  var i;
  for (i = 0; i < chars.length; i++) {
    var c = chars[i];
    if (typeof c === "string") {
      expanded.push(Cast.pregen(c));
    } else if (c && typeof c === "object") {
      expanded.push(c);
    }
  }
  out.characters = expanded;
  return out;
}

function checkActors(arc) {
  var errors = [];
  var byChar = characterIndex(arc.characters);
  var chapters = arc.chapters || [];
  var ci;
  for (ci = 0; ci < chapters.length; ci++) {
    var chapter = chapters[ci];
    if (!chapter) continue;
    var choices = chapter.choices || [];
    var ch;
    for (ch = 0; ch < choices.length; ch++) {
      var choice = choices[ch];
      if (!choice) continue;
      if (!choice.actor || !byChar[choice.actor]) {
        errors.push({
          rule: "unknown-actor",
          path: "chapters[" + ci + "].choices[" + ch + "].actor",
          message:
            "actor '" +
            (choice.actor == null ? "" : String(choice.actor)) +
            "' is not on arc.characters"
        });
      }
    }
  }
  return errors;
}

function validateExpanded(arc) {
  var result = Arc.validateArc(arc);
  var actorErrors = checkActors(arc);
  var errors = (result.errors || []).concat(actorErrors);
  return { ok: errors.length === 0, errors: errors };
}

function renderBundle(arc) {
  var body = JSON.stringify(arc, null, 2);
  return (
    "/* Generated by tools/build-arc.js. Validated by OronathArc.validateArc before write. */\n" +
    "(function (root, factory) {\n" +
    "  var api = factory();\n" +
    '  if (typeof module === "object" && module.exports) module.exports = api;\n' +
    "  if (root) root.OronathArcBundle = api;\n" +
    '})(typeof window !== "undefined" ? window : globalThis, function () {\n' +
    '  "use strict";\n' +
    "  return " +
    body +
    ";\n" +
    "});\n"
  );
}

function commitArc(arc, outPath) {
  var expanded = expandCharacters(arc);
  var validated = validateExpanded(expanded);
  if (!validated.ok) {
    return { written: false, errors: validated.errors, arc: expanded };
  }
  var abs = path.resolve(outPath);
  var dir = path.dirname(abs);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  var tmp = abs + ".tmp";
  var source = renderBundle(expanded);
  fs.writeFileSync(tmp, source, "utf8");
  fs.renameSync(tmp, abs);
  try {
    delete require.cache[require.resolve(abs)];
  } catch (e) {
    /* first write — fine */
  }
  var loaded = require(abs);
  var again = validateExpanded(loaded);
  if (!again.ok) {
    try {
      fs.unlinkSync(abs);
    } catch (e2) {
      /* ignore */
    }
    return { written: false, errors: again.errors, arc: expanded };
  }
  return { written: true, errors: [], arc: expanded, path: abs };
}

function bundleFromFile(fromPath, outPath) {
  var absFrom = path.resolve(fromPath);
  var raw;
  try {
    raw = fs.readFileSync(absFrom, "utf8");
  } catch (err) {
    return {
      written: false,
      fatal: "build-arc: cannot read arc file: " + absFrom,
      errors: []
    };
  }
  var arc;
  try {
    arc = JSON.parse(raw);
  } catch (err) {
    return {
      written: false,
      fatal: "build-arc: cannot read arc file: " + absFrom + " (not JSON)",
      errors: []
    };
  }
  return commitArc(arc, outPath);
}

function stripFence(text) {
  var s = String(text || "").replace(/^\s+|\s+$/g, "");
  var m = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m) return m[1].replace(/^\s+|\s+$/g, "");
  return s;
}

function parseArcJson(text) {
  return JSON.parse(stripFence(text));
}

function defaultHttpsRequest(opts, body, cb) {
  var req = https.request(
    {
      hostname: opts.hostname,
      path: opts.path,
      method: "POST",
      headers: opts.headers
    },
    function (res) {
      var chunks = [];
      res.on("data", function (c) {
        chunks.push(c);
      });
      res.on("end", function () {
        var buf = Buffer.concat(chunks).toString("utf8");
        cb(null, { status: res.statusCode, body: buf });
      });
    }
  );
  req.on("error", function (err) {
    cb(err);
  });
  req.write(body);
  req.end();
}

function providerConfig(name) {
  if (name === "grok") {
    return {
      name: "grok",
      envKey: "XAI_API_KEY",
      hostname: "api.x.ai",
      path: "/v1/chat/completions",
      defaultModel: "grok-4",
      jsonObject: false
    };
  }
  if (name === "openai") {
    return {
      name: "openai",
      envKey: "OPENAI_API_KEY",
      hostname: "api.openai.com",
      path: "/v1/chat/completions",
      defaultModel: "gpt-4.1",
      jsonObject: true
    };
  }
  return null;
}

function extractContent(parsed) {
  if (!parsed || !parsed.choices || !parsed.choices[0]) return null;
  var msg = parsed.choices[0].message;
  if (!msg) return null;
  return msg.content;
}

function callRequest(requestFn, opts, body) {
  return new Promise(function (resolve) {
    var settled = false;
    function finish(err, result) {
      if (settled) return;
      settled = true;
      resolve({ err: err || null, result: result || null });
    }
    try {
      requestFn(opts, body, finish);
    } catch (e) {
      finish(e);
    }
    // Sync stubs call finish before returning; async https will finish later.
  });
}

function bundleFromProvider(opts, callback) {
  opts = opts || {};
  var providerName = opts.provider || "grok";
  var cfg = providerConfig(providerName);
  if (!cfg) {
    var unknown = {
      written: false,
      fatal: "build-arc: unknown provider '" + providerName + "'",
      errors: []
    };
    if (callback) {
      callback(null, unknown);
      return unknown;
    }
    return unknown;
  }
  var key = opts.apiKey;
  if (key == null) key = process.env[cfg.envKey];
  if (!key) {
    var missing = {
      written: false,
      exitCode: 2,
      fatal:
        "build-arc: missing " +
        cfg.envKey +
        ". Export it in the shell, or run with --from <arc.json> to validate and bundle a file with no key.",
      errors: []
    };
    if (callback) {
      callback(null, missing);
      return missing;
    }
    return missing;
  }

  var model = opts.model || process.env.ORONATH_ARC_MODEL || cfg.defaultModel;
  var spec = opts.spec != null ? opts.spec : DEFAULT_SPEC;
  var outPath = opts.outPath;
  var requestFn = opts.request || defaultHttpsRequest;
  var messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: spec }
  ];
  var calls = 0;
  var lastErrors = [];
  var sawNonJson = false;
  var retriedHttp = false;

  function done(result) {
    if (callback) callback(null, result);
    return result;
  }

  function step() {
    if (calls >= MAX_PROVIDER_CALLS) {
      return Promise.resolve(
        done({
          written: false,
          errors: lastErrors,
          fatal:
            "build-arc: validation failed after " +
            MAX_PROVIDER_CALLS +
            " provider calls"
        })
      );
    }
    calls += 1;
    var payload = {
      model: model,
      temperature: 0.4,
      messages: messages
    };
    if (cfg.jsonObject) {
      payload.response_format = { type: "json_object" };
    }
    var body = JSON.stringify(payload);
    var headers = {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    };
    return callRequest(
      requestFn,
      { hostname: cfg.hostname, path: cfg.path, headers: headers },
      body
    ).then(function (resWrap) {
      if (resWrap.err) {
        return done({
          written: false,
          fatal: "build-arc: provider request failed: " + resWrap.err.message,
          errors: lastErrors
        });
      }
      var result = resWrap.result;
      if (result.status === 401 || result.status === 403) {
        return done({
          written: false,
          fatal: "build-arc: provider rejected the key",
          errors: []
        });
      }
      if (
        (result.status === 429 ||
          (result.status >= 500 && result.status <= 599)) &&
        !retriedHttp &&
        calls < MAX_PROVIDER_CALLS
      ) {
        retriedHttp = true;
        return step();
      }
      if (result.status < 200 || result.status >= 300) {
        return done({
          written: false,
          fatal:
            "build-arc: provider HTTP " +
            result.status +
            " " +
            String(result.body || "").slice(0, 200),
          errors: []
        });
      }

      var envelope;
      try {
        envelope = JSON.parse(result.body);
      } catch (e) {
        return done({
          written: false,
          fatal:
            "build-arc: malformed JSON from provider " +
            String(result.body || "").slice(0, 200),
          errors: []
        });
      }
      var content = extractContent(envelope);
      var arc;
      try {
        arc = parseArcJson(content);
      } catch (e2) {
        if (!sawNonJson && calls < MAX_PROVIDER_CALLS) {
          sawNonJson = true;
          messages.push({ role: "assistant", content: content || "" });
          messages.push({
            role: "user",
            content:
              "Your previous reply was not JSON. Reply with one JSON object only."
          });
          return step();
        }
        return done({
          written: false,
          fatal:
            "build-arc: malformed JSON from provider " +
            String(content || "").slice(0, 200),
          errors: []
        });
      }

      var committed = commitArc(arc, outPath);
      if (committed.written) return done(committed);
      lastErrors = committed.errors || [];
      if (calls < MAX_PROVIDER_CALLS) {
        messages.push({ role: "assistant", content: content || "" });
        messages.push({
          role: "user",
          content:
            "The arc failed validation. Fix every error. Return the full arc JSON only.\n" +
            formatErrors(lastErrors)
        });
        return step();
      }
      return done({
        written: false,
        errors: lastErrors,
        fatal:
          "build-arc: validation failed after " +
          MAX_PROVIDER_CALLS +
          " provider calls"
      });
    });
  }

  return step();
}

function printUsage() {
  process.stderr.write(
    "Usage:\n" +
      "  node tools/build-arc.js --from <arc.json> --out <file.js>\n" +
      "  node tools/build-arc.js --provider grok|openai [--spec <brief.txt>] [--model <name>] --out <file.js>\n"
  );
}

function parseArgs(argv) {
  var out = {
    from: null,
    out: null,
    provider: null,
    specPath: null,
    model: null
  };
  var i;
  for (i = 2; i < argv.length; i++) {
    var a = argv[i];
    if (a === "--from") {
      out.from = argv[++i];
    } else if (a === "--out") {
      out.out = argv[++i];
    } else if (a === "--provider") {
      out.provider = argv[++i];
    } else if (a === "--spec") {
      out.specPath = argv[++i];
    } else if (a === "--model") {
      out.model = argv[++i];
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    } else {
      out.unknown = a;
    }
  }
  return out;
}

function resultToExit(result) {
  if (result.fatal) {
    process.stderr.write(result.fatal + "\n");
    if (result.errors && result.errors.length) {
      process.stderr.write(formatErrors(result.errors) + "\n");
    }
    return result.exitCode != null ? result.exitCode : 1;
  }
  if (!result.written) {
    process.stderr.write("build-arc: validation failed; artefact not written\n");
    process.stderr.write(formatErrors(result.errors) + "\n");
    return 1;
  }
  process.stdout.write("build-arc: wrote " + result.path + "\n");
  return 0;
}

function main(argv) {
  var args = parseArgs(argv || process.argv);
  if (args.help) {
    printUsage();
    return 0;
  }
  if (args.unknown) {
    process.stderr.write("build-arc: unknown argument " + args.unknown + "\n");
    printUsage();
    return 2;
  }
  if (!args.out) {
    process.stderr.write("build-arc: --out is required\n");
    printUsage();
    return 2;
  }
  if (args.from && args.provider) {
    process.stderr.write(
      "build-arc: use either --from or --provider, not both\n"
    );
    return 2;
  }
  if (!args.from && !args.provider) {
    process.stderr.write(
      "build-arc: need --from <arc.json> or --provider grok|openai\n"
    );
    printUsage();
    return 2;
  }

  if (args.from) {
    return resultToExit(bundleFromFile(args.from, args.out));
  }

  var spec = DEFAULT_SPEC;
  if (args.specPath) {
    try {
      spec = fs.readFileSync(path.resolve(args.specPath), "utf8");
    } catch (err) {
      process.stderr.write(
        "build-arc: cannot read spec file: " + args.specPath + "\n"
      );
      return 1;
    }
  }
  var maybe = bundleFromProvider({
    provider: args.provider,
    outPath: args.out,
    spec: spec,
    model: args.model
  });
  // Missing key / unknown provider returns a plain object; live HTTP returns a Promise.
  if (maybe && typeof maybe.then === "function") {
    maybe.then(function (result) {
      var code = resultToExit(result);
      if (code !== 0) process.exitCode = code;
    });
    return 0;
  }
  return resultToExit(maybe);
}

var api = {
  expandCharacters: expandCharacters,
  validateExpanded: validateExpanded,
  formatErrors: formatErrors,
  renderBundle: renderBundle,
  commitArc: commitArc,
  bundleFromFile: bundleFromFile,
  bundleFromProvider: bundleFromProvider,
  parseArcJson: parseArcJson,
  SYSTEM_PROMPT: SYSTEM_PROMPT,
  DEFAULT_SPEC: DEFAULT_SPEC,
  main: main
};

module.exports = api;

if (require.main === module) {
  var code = main(process.argv);
  if (code !== 0) process.exitCode = code;
}
