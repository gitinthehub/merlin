/* MERLIN / Oronath — core dice engine. Pure logic. No DOM, no LLM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OronathDice = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var TIERS = { easy: 8, medium: 11, hard: 14, veryHard: 16 };
  var LIMITS = {
    d20: { min: 1, max: 20 },
    d10: { min: 1, max: 10 },
    "2d6": { min: 2, max: 12 }
  };

  function dcFor(tier) {
    if (!Object.prototype.hasOwnProperty.call(TIERS, tier)) {
      throw new Error("unknown tier: " + tier);
    }
    return TIERS[tier];
  }

  function d10Value(face) {
    if (face === 0 || face === "0" || face === "00" || face === 10) return 10;
    return Number(face);
  }

  function mulberryNext(stateA) {
    var a = (stateA + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return { a: a >>> 0, u: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  }

  function makeSeeded(startA) {
    var stateA = startA >>> 0;
    return {
      int: function (lo, hi) {
        var step = mulberryNext(stateA);
        stateA = step.a;
        return lo + Math.floor(step.u * (hi - lo + 1));
      },
      exportState: function () {
        return { a: stateA >>> 0 };
      }
    };
  }

  function createRng(seed) {
    return makeSeeded(seed >>> 0);
  }

  function rngFromState(state) {
    if (!state || state.a == null) {
      throw new Error("rngFromState requires { a: number }");
    }
    return makeSeeded(state.a >>> 0);
  }

  function sequence(faces) {
    var list = faces.slice();
    var i = 0;
    return {
      int: function (lo, hi) {
        if (i >= list.length) {
          throw new Error("sequence exhausted");
        }
        var v = list[i++];
        if (v < lo || v > hi) {
          throw new Error(
            "sequence value " + v + " outside [" + lo + ", " + hi + "]"
          );
        }
        return v;
      },
      exportState: function () {
        return { i: i };
      }
    };
  }

  function defaultInt(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  function resolveInt(opts) {
    var rng = opts && opts.rng;
    if (rng == null) return defaultInt;
    if (typeof rng === "number") return createRng(rng).int;
    if (typeof rng === "function") return rng;
    if (typeof rng === "object") {
      if (typeof rng.int === "function") return rng.int.bind(rng);
      if (rng.a != null) return rngFromState(rng).int;
    }
    throw new Error("invalid rng");
  }

  function effectiveDc(base, modifier) {
    if (base == null) return null;
    var m = modifier == null ? 0 : modifier;
    return Math.max(1, base + m);
  }

  function deriveBranch(die, kept, dc) {
    var lim = LIMITS[die];
    var complication = kept === lim.min;
    var bonus = !complication && kept === lim.max;
    var success = null;
    var branch;

    if (complication) {
      success = false;
      branch = "complication";
    } else if (bonus) {
      success = true;
      branch = "bonus";
    } else if (dc == null) {
      branch = "result";
    } else if (kept >= dc) {
      success = true;
      branch = "success";
    } else {
      success = false;
      branch = "failure";
    }

    return {
      success: success,
      complication: complication,
      bonus: bonus,
      branch: branch
    };
  }

  function makeResult(parts) {
    var derived = deriveBranch(parts.die, parts.kept, parts.dc);
    return {
      die: parts.die,
      faces: parts.faces,
      labels: parts.labels,
      kept: parts.kept,
      advantage: !!parts.advantage,
      pools: parts.pools != null ? parts.pools : null,
      tier: parts.tier != null ? parts.tier : null,
      baseDc: parts.baseDc != null ? parts.baseDc : null,
      dc: parts.dc != null ? parts.dc : null,
      modifier: parts.modifier == null ? 0 : parts.modifier,
      success: derived.success,
      complication: derived.complication,
      bonus: derived.bonus,
      branch: derived.branch,
      retry: false
    };
  }

  function rollD20(opts) {
    opts = opts || {};
    var int = resolveInt(opts);
    var advantage = !!opts.advantage;
    var modifier = opts.modifier == null ? 0 : opts.modifier;
    var tier = opts.tier;
    var baseDc = tier != null ? dcFor(tier) : null;
    var dc = effectiveDc(baseDc, modifier);

    var a = int(1, 20);
    var faces;
    var kept;
    if (advantage) {
      var b = int(1, 20);
      faces = [a, b];
      kept = Math.max(a, b);
    } else {
      faces = [a];
      kept = a;
    }

    return makeResult({
      die: "d20",
      faces: faces,
      labels: faces.map(String),
      kept: kept,
      advantage: advantage,
      pools: null,
      tier: tier != null ? tier : null,
      baseDc: baseDc,
      dc: dc,
      modifier: modifier
    });
  }

  function rollD10(opts) {
    opts = opts || {};
    var int = resolveInt(opts);
    var advantage = !!opts.advantage;
    var modifier = opts.modifier == null ? 0 : opts.modifier;
    var baseDc = opts.dc != null ? opts.dc : null;
    var dc = effectiveDc(baseDc, modifier);

    function one() {
      var face = int(0, 9);
      return {
        face: face,
        value: d10Value(face),
        label: face === 0 ? "00" : String(face)
      };
    }

    var first = one();
    var faces;
    var labels;
    var kept;
    if (advantage) {
      var second = one();
      faces = [first.face, second.face];
      labels = [first.label, second.label];
      kept = Math.max(first.value, second.value);
    } else {
      faces = [first.face];
      labels = [first.label];
      kept = first.value;
    }

    return makeResult({
      die: "d10",
      faces: faces,
      labels: labels,
      kept: kept,
      advantage: advantage,
      pools: null,
      tier: null,
      baseDc: baseDc,
      dc: dc,
      modifier: modifier
    });
  }

  function roll2d6(opts) {
    opts = opts || {};
    var int = resolveInt(opts);
    var advantage = !!opts.advantage;
    var modifier = opts.modifier == null ? 0 : opts.modifier;
    var baseDc = opts.dc != null ? opts.dc : null;
    var dc = effectiveDc(baseDc, modifier);

    function pair() {
      var a = int(1, 6);
      var b = int(1, 6);
      return { faces: [a, b], sum: a + b };
    }

    var first = pair();
    var faces;
    var labels;
    var kept;
    var pools;
    if (advantage) {
      var second = pair();
      faces = first.faces.concat(second.faces);
      labels = faces.map(String);
      kept = second.sum > first.sum ? second.sum : first.sum;
      pools = [first, second];
    } else {
      faces = first.faces;
      labels = faces.map(String);
      kept = first.sum;
      pools = null;
    }

    return makeResult({
      die: "2d6",
      faces: faces,
      labels: labels,
      kept: kept,
      advantage: advantage,
      pools: pools,
      tier: null,
      baseDc: baseDc,
      dc: dc,
      modifier: modifier
    });
  }

  function roll(opts) {
    opts = opts || {};
    if (opts.die === "d20") return rollD20(opts);
    if (opts.die === "d10") return rollD10(opts);
    if (opts.die === "2d6") return roll2d6(opts);
    throw new Error("unknown die: " + opts.die);
  }

  return {
    TIERS: TIERS,
    LIMITS: LIMITS,
    dcFor: dcFor,
    d10Value: d10Value,
    createRng: createRng,
    rngFromState: rngFromState,
    sequence: sequence,
    rollD20: rollD20,
    rollD10: rollD10,
    roll2d6: roll2d6,
    roll: roll
  };
});
