/* MERLIN — pure engine. No DOM. */
(function () {
  "use strict";

  var D = null;
  var state = null;
  var pendingCombat = null;
  var lastRoll = null;
  var pendingLevelUps = 0;
  var levelPickQueue = [];

  function emptyStats() {
    return { nat20: 0, nat1: 0, goldWasted: 0 };
  }

  function ensureStats() {
    if (!state) return emptyStats();
    if (!state.stats) state.stats = emptyStats();
    if (state.stats.nat20 == null) state.stats.nat20 = 0;
    if (state.stats.nat1 == null) state.stats.nat1 = 0;
    if (state.stats.goldWasted == null) state.stats.goldWasted = 0;
    return state.stats;
  }

  function noteCrit(roll) {
    if (!roll || !state) return;
    var s = ensureStats();
    if (roll.critSuccess) s.nat20 += 1;
    if (roll.critFail) s.nat1 += 1;
  }

  function noteGoldLost(before, after) {
    if (!state) return;
    var lost = before - after;
    if (lost > 0) ensureStats().goldWasted += lost;
  }

  function emptyFound() {
    return {
      end_stake: false,
      end_clause: false,
      end_board: false,
      end_fled: false,
      death: false,
      end_wizard: false
    };
  }

  function emptyFates() {
    return { v: 1, found: emptyFound(), memory: null };
  }

  function readFates() {
    try {
      var raw = localStorage.getItem(data().fatesKey);
      if (!raw) return emptyFates();
      var blob = JSON.parse(raw);
      if (!blob || blob.v !== 1) return emptyFates();
      var found = emptyFound();
      if (blob.found) {
        var keys = Object.keys(found);
        for (var i = 0; i < keys.length; i++) {
          if (blob.found[keys[i]]) found[keys[i]] = true;
        }
      }
      return {
        v: 1,
        found: found,
        memory: blob.memory || null
      };
    } catch (err) {
      return emptyFates();
    }
  }

  function writeFates(blob) {
    try {
      localStorage.setItem(data().fatesKey, JSON.stringify(blob));
    } catch (err) {
      /* ignore quota / private mode */
    }
  }

  function recordFate(endingId) {
    if (!state || !endingId) return;
    var fates = readFates();
    if (fates.found[endingId] !== undefined) fates.found[endingId] = true;
    fates.memory = {
      characterId: state.characterId,
      endingId: endingId,
      deathCause: endingId === "death" ? state.deathCause : null,
      wizardJabs: state.wizardJabs || 0
    };
    writeFates(fates);
  }

  function fillMemory(template, memory) {
    if (!template || !memory) return "";
    var char = data().characters[memory.characterId];
    var name = char ? char.name : "a stranger";
    return String(template).split("{name}").join(name);
  }

  function memoryTemplate(bucket, memory) {
    if (!bucket || !memory) return null;
    if (memory.endingId === "death") {
      var deaths = bucket.death || {};
      return (
        deaths[memory.deathCause] ||
        deaths.default ||
        null
      );
    }
    return bucket[memory.endingId] || null;
  }

  function appendMemory(out) {
    if (!out || (out.id !== "gate" && out.id !== "throne")) return out;
    var fates = readFates();
    if (!fates.memory || !fates.memory.endingId) return out;
    var who = out.id === "gate" ? "clarence" : "count";
    var speaker = out.id === "gate" ? "Clarence" : "Count Merlin";
    var bucket = data().memoryLines && data().memoryLines[who];
    var tmpl = memoryTemplate(bucket, fates.memory);
    if (!tmpl) return out;
    out.lines = (out.lines || []).slice();
    out.lines.push({
      speaker: speaker,
      text: fillMemory(tmpl, fates.memory)
    });
    return out;
  }

  function epitaphLine(nodeId, deathCauseOverride) {
    var epi = data().epitaphs || {};
    if (nodeId === "death") {
      var deaths = epi.death || {};
      var cause =
        deathCauseOverride != null
          ? deathCauseOverride
          : state && state.deathCause;
      return deaths[cause] || deaths.default || "The night kept you.";
    }
    return epi[nodeId] || "";
  }

  function fatesView() {
    var fates = readFates();
    var order = data().fateOrder || [];
    var hints = data().fateHints || {};
    var rows = [];
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var found = !!(fates.found && fates.found[id]);
      var node = data().nodes[id];
      var deathCause =
        id === "death" && fates.memory ? fates.memory.deathCause : null;
      rows.push({
        id: id,
        title: found && node ? node.title : "Locked",
        found: found,
        hint: found ? null : hints[id] || "",
        line: found ? epitaphLine(id, deathCause) : null
      });
    }
    var mem = fates.memory;
    var memView = null;
    if (mem && mem.characterId) {
      var c = data().characters[mem.characterId];
      memView = {
        characterId: mem.characterId,
        characterName: c ? c.name : "a stranger",
        endingId: mem.endingId,
        deathCause: mem.deathCause || null,
        wizardJabs: mem.wizardJabs || 0
      };
    }
    return { rows: rows, memory: memView };
  }

  function applyWizardMood(enc, move) {
    if (!state || !state.combat || state.combat.encounter !== "count") {
      return { damageDelta: 0, saveDcDelta: 0 };
    }
    var mood = state.wizardNext;
    if (!mood) return { damageDelta: 0, saveDcDelta: 0 };
    var deltas = data().wizardMoodDelta || { fluster: -2, fury: 2 };
    var delta = mood === "fury" ? deltas.fury : deltas.fluster;
    state.wizardNext = null;
    if (mood === "fury") {
      combatLog("He is furious. The blow comes in harder.");
    } else {
      combatLog("He stumbles on the word. The blow comes in weaker.");
    }
    if (move && move.save) {
      return { damageDelta: 0, saveDcDelta: delta };
    }
    return { damageDelta: delta, saveDcDelta: 0 };
  }

  function applyWizardUnlock(opt, result) {
    if (!opt || !opt.wizardUnlock || !state) return;
    var need = data().wizardUnlockAt || 3;
    if ((state.wizardJabs || 0) >= need) {
      result.next = "end_wizard";
      state.wizardNext = null;
    }
  }

  function data() {
    return D || (D = window.MERLIN);
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function rollDie(sides) {
    return 1 + Math.floor(Math.random() * sides);
  }

  function rollD20(advantage) {
    var a = rollDie(20);
    if (!advantage) {
      return {
        kept: a,
        dice: [a],
        critFail: a === 1,
        critSuccess: a === 20
      };
    }
    var b = rollDie(20);
    var kept = Math.max(a, b);
    return {
      kept: kept,
      dice: [a, b],
      critSuccess: kept === 20,
      critFail: a === 1 && b === 1
    };
  }

  function rollPool(sides, count) {
    var faces = [];
    var sum = 0;
    var n = count || 1;
    for (var i = 0; i < n; i++) {
      var f = rollDie(sides);
      faces.push(f);
      sum += f;
    }
    return { faces: faces, sum: sum };
  }

  function packCheck(roll, stat, mod, total, dc) {
    var dropped = null;
    if (roll.dice && roll.dice.length === 2) {
      dropped = roll.dice[0] === roll.kept ? roll.dice[1] : roll.dice[0];
    }
    return {
      kind: "d20",
      dice: (roll.dice || [roll.kept]).slice(),
      kept: roll.kept,
      dropped: dropped,
      total: total,
      stat: stat || null,
      mod: mod == null ? 0 : mod,
      dc: dc == null ? null : dc,
      critSuccess: !!roll.critSuccess,
      critFail: !!roll.critFail
    };
  }

  function packPool(kind, pool) {
    return {
      kind: kind,
      dice: pool.faces.slice(),
      kept: null,
      dropped: null,
      total: pool.sum,
      stat: null,
      mod: 0,
      dc: null,
      critSuccess: false,
      critFail: false
    };
  }

  function formatRoll(roll, stat, mod, total, dc, vsLabel) {
    var name = String(stat).toUpperCase();
    var vs = vsLabel || "DC";
    var body;
    if (roll.dice.length === 2) {
      body =
        "d20 rolled " +
        roll.dice[0] +
        " and " +
        roll.dice[1] +
        ", kept " +
        roll.kept +
        " + " +
        name +
        " " +
        mod +
        " = " +
        total +
        " vs " +
        vs +
        " " +
        dc;
    } else {
      body =
        "d20 rolled " +
        roll.kept +
        " + " +
        name +
        " " +
        mod +
        " = " +
        total +
        " vs " +
        vs +
        " " +
        dc;
    }
    if (roll.critSuccess) body += " · CRITICAL SUCCESS";
    if (roll.critFail) body += " · CRITICAL FAIL";
    return body;
  }

  function maxHp(s) {
    s = s || state;
    var m = s.baseMaxHp;
    if (s.equipped && s.equipped.armor === "jack") m += 6;
    return m;
  }

  function armorReduction(s) {
    s = s || state;
    if (s.equipped && s.equipped.armor === "jack") return 1;
    return 0;
  }

  function weaponBonus(encounterId) {
    var id = state.equipped && state.equipped.weapon;
    if (!id) return 0;
    var item = data().items[id];
    if (!item) return 0;
    var b = item.bonus || 0;
    if (encounterId === "count" && item.vampireBonus) b += item.vampireBonus;
    return b;
  }

  function invCount(id) {
    return (state.inventory && state.inventory[id]) || 0;
  }

  function addItem(id, n) {
    n = n == null ? 1 : n;
    if (!state.inventory) state.inventory = {};
    state.inventory[id] = (state.inventory[id] || 0) + n;
    if (state.inventory[id] <= 0) delete state.inventory[id];
  }

  function removeItem(id, n) {
    n = n == null ? 1 : n;
    addItem(id, -n);
  }

  function clampGold() {
    if (state.gold < 0) state.gold = 0;
  }

  function applyDamage(amount) {
    var red = armorReduction();
    var dmg = Math.max(0, amount - red);
    state.hp -= dmg;
    if (state.hp < 0) state.hp = 0;
    return dmg;
  }

  function applyHeal(amount) {
    var m = maxHp();
    state.hp = Math.min(m, state.hp + amount);
  }

  function checkLevelUps() {
    var thresholds = data().xpThresholds;
    while (state.level < 3) {
      var need = thresholds[state.level];
      if (state.xp >= need) {
        state.level += 1;
        pendingLevelUps += 1;
        levelPickQueue.push(true);
      } else break;
    }
  }

  function applyXp(amount) {
    if (!amount) return;
    state.xp += amount;
    checkLevelUps();
  }

  function applyLevelPick(stat) {
    if (pendingLevelUps <= 0) return false;
    if (stat !== "might" && stat !== "wits" && stat !== "spirit") return false;
    state[stat] += 1;
    state.baseMaxHp += 4;
    applyHeal(4);
    pendingLevelUps -= 1;
    levelPickQueue.shift();
    save();
    return true;
  }

  function matchCond(cond) {
    if (!cond) return true;
    if (cond.all) {
      for (var i = 0; i < cond.all.length; i++) {
        if (!matchCond(cond.all[i])) return false;
      }
      return true;
    }
    if (cond.anyFlag) {
      for (var j = 0; j < cond.anyFlag.length; j++) {
        if (state.flags[cond.anyFlag[j]]) return true;
      }
      return false;
    }
    if (cond.flag) return !!state.flags[cond.flag];
    if (cond.notFlag) return !state.flags[cond.notFlag];
    if (cond.character) return state.characterId === cond.character;
    if (cond.notCharacter) return state.characterId !== cond.notCharacter;
    if (cond.minGold != null) return state.gold >= cond.minGold;
    if (cond.item) return invCount(cond.item) > 0;
    if (cond.deathCause) return state.deathCause === cond.deathCause;
    if (cond.equippedWeapon) {
      return state.equipped && state.equipped.weapon === cond.equippedWeapon;
    }
    return true;
  }

  function resolveNode(nodeId) {
    var node = data().nodes[nodeId];
    if (!node) return null;
    var out = {
      id: node.id,
      title: node.title,
      type: node.type,
      lines: node.lines,
      options: node.options || [],
      shopId: node.shopId,
      leave: node.leave,
      encounter: node.encounter,
      onWin: node.onWin,
      onFlee: node.onFlee,
      winFlag: node.winFlag,
      fleeFlag: node.fleeFlag,
      deathCause: node.deathCause
    };
    if (node.variants) {
      for (var i = 0; i < node.variants.length; i++) {
        var v = node.variants[i];
        if (matchCond(v.if)) {
          if (v.lines) out.lines = v.lines;
          if (v.options) out.options = v.options;
          break;
        }
      }
    }
    return appendMemory(out);
  }

  function optionVisible(opt) {
    if (opt.showIf && !matchCond(opt.showIf)) return false;
    if (opt.hideIf && matchCond(opt.hideIf)) return false;
    return true;
  }

  function optionAffordable(opt) {
    if (opt.requireGold != null && state.gold < opt.requireGold) return false;
    if (opt.requireToll && state.gold < tollCost()) return false;
    return true;
  }

  function computeDc(opt) {
    if (!opt.check) return null;
    var dc = opt.check.dc;
    if (opt.dcAdjust) {
      for (var i = 0; i < opt.dcAdjust.length; i++) {
        var adj = opt.dcAdjust[i];
        if (matchCond(adj.if)) dc += adj.delta;
      }
    }
    return dc;
  }

  function applyEffects(effects) {
    if (!effects) return { dead: false, notes: [] };
    var dead = false;
    var notes = [];
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      if (e.op === "flag") {
        if (e.value === false) delete state.flags[e.key];
        else state.flags[e.key] = e.value;
      } else if (e.op === "gold") {
        var beforeG = state.gold;
        state.gold += e.amount;
        clampGold();
        noteGoldLost(beforeG, state.gold);
        var delta = state.gold - beforeG;
        if (delta < 0) {
          notes.push("You lose " + -delta + " gold.");
        } else if (delta > 0) {
          notes.push("You gain " + delta + " gold.");
        }
      } else if (e.op === "heal") {
        applyHeal(e.amount);
      } else if (e.op === "damage") {
        applyDamage(e.amount);
        if (state.hp <= 0) dead = true;
      } else if (e.op === "xp") {
        applyXp(e.amount);
      } else if (e.op === "item") {
        addItem(e.id, e.amount || 1);
      } else if (e.op === "combat") {
        pendingCombat = {
          encounter: e.encounter,
          surprised: !!e.surprised,
          skipTurn: !!e.skipTurn,
          damageBonus: e.damageBonus || 0,
          hpDelta: e.hpDelta || 0
        };
      } else if (e.op === "death") {
        state.deathCause = e.cause || "count";
        dead = true;
      } else if (e.op === "mayorPay") {
        var pay = 8;
        if (state.flags.ghoulPeace) {
          pay = state.flags.mayorSore ? 2 : 5;
        } else if (state.flags.ghoulDead) {
          if (state.flags.paidUpfront) pay = 4;
          else if (state.flags.mayorSore) pay = 3;
          else pay = 8;
        }
        state.gold += pay;
        if (pay > 0) notes.push("You gain " + pay + " gold.");
      } else if (e.op === "payToll") {
        var tollBefore = state.gold;
        var toll = tollCost();
        state.gold -= toll;
        clampGold();
        noteGoldLost(tollBefore, state.gold);
        notes.push("You pay " + toll + " gold for the toll.");
      } else if (e.op === "vellumPox") {
        if (state.characterId === "vellum") state.flags.vellumHonest = true;
      } else if (e.op === "vellumOswald") {
        if (state.characterId === "vellum") state.flags.oswaldSoft = true;
      } else if (e.op === "prepareCount") {
        /* flags only; combat start reads them */
      } else if (e.op === "wizardJab") {
        state.wizardJabs = (state.wizardJabs || 0) + 1;
        state.wizardNext = e.mood || "fluster";
      }
    }
    return { dead: dead, notes: notes };
  }

  function tollCost() {
    return state.flags.wightAngry ? 12 : 8;
  }

  function itemPrice(itemId, shopId) {
    var item = data().items[itemId];
    var price = item.price;
    if (itemId === "jack" && state.characterId === "bram") price = 6;
    if (state.characterId === "pip" && shopId === "pox") {
      price = Math.max(1, price - 2);
    }
    return price;
  }

  function healAmount(itemId) {
    var item = data().items[itemId];
    if (!item) return 0;
    if (
      itemId === "draught" &&
      (state.characterId === "vellum" || state.flags.vellumHonest)
    ) {
      return item.vellumHeal || item.heal;
    }
    return item.heal || 0;
  }

  function save() {
    try {
      var blob = {
        v: 2,
        nodeId: state.nodeId,
        characterId: state.characterId,
        might: state.might,
        wits: state.wits,
        spirit: state.spirit,
        hp: state.hp,
        baseMaxHp: state.baseMaxHp,
        xp: state.xp,
        level: state.level,
        gold: state.gold,
        inventory: state.inventory,
        equipped: state.equipped,
        flags: state.flags,
        coinReady: state.coinReady,
        pardonArmed: state.pardonArmed,
        combat: state.combat,
        deathCause: state.deathCause,
        lineIndex: state.lineIndex || 0,
        lastRoll: lastRoll
          ? {
              text: lastRoll.text,
              success: !!lastRoll.success,
              rolls: lastRoll.rolls || null
            }
          : null,
        pendingLevelUps: pendingLevelUps,
        pendingVictory: state.pendingVictory || null,
        stats: ensureStats(),
        wizardJabs: state.wizardJabs || 0,
        wizardNext: state.wizardNext || null
      };
      localStorage.setItem(data().saveKey, JSON.stringify(blob));
    } catch (err) {
      /* ignore quota / private mode */
    }
  }

  function migrateRun(blob) {
    if (!blob.stats) blob.stats = emptyStats();
    if (blob.stats.nat20 == null) blob.stats.nat20 = 0;
    if (blob.stats.nat1 == null) blob.stats.nat1 = 0;
    if (blob.stats.goldWasted == null) blob.stats.goldWasted = 0;
    if (blob.wizardJabs == null) blob.wizardJabs = 0;
    if (blob.wizardNext === undefined) blob.wizardNext = null;
    return blob;
  }

  function load() {
    try {
      var raw = localStorage.getItem(data().saveKey);
      if (!raw) return null;
      var blob = JSON.parse(raw);
      if (!blob || (blob.v !== 1 && blob.v !== 2) || !blob.characterId) {
        return null;
      }
      blob = migrateRun(blob);
      state = {
        nodeId: blob.nodeId,
        characterId: blob.characterId,
        might: blob.might,
        wits: blob.wits,
        spirit: blob.spirit,
        hp: blob.hp,
        baseMaxHp: blob.baseMaxHp,
        xp: blob.xp,
        level: blob.level,
        gold: blob.gold,
        inventory: blob.inventory || {},
        equipped: blob.equipped || { weapon: null, armor: null },
        flags: blob.flags || {},
        coinReady: blob.coinReady !== false,
        pardonArmed: !!blob.pardonArmed,
        combat: blob.combat || null,
        deathCause: blob.deathCause || null,
        lineIndex: blob.lineIndex || 0,
        pendingVictory: blob.pendingVictory || null,
        stats: blob.stats,
        wizardJabs: blob.wizardJabs || 0,
        wizardNext: blob.wizardNext || null
      };
      pendingLevelUps = blob.pendingLevelUps || 0;
      pendingCombat = null;
      lastRoll = blob.lastRoll
        ? {
            text: blob.lastRoll.text,
            success: !!blob.lastRoll.success,
            rolls: blob.lastRoll.rolls || null
          }
        : null;
      return state;
    } catch (err) {
      return null;
    }
  }

  function clearSave() {
    try {
      localStorage.removeItem(data().saveKey);
    } catch (err) {}
    state = null;
    pendingCombat = null;
    lastRoll = null;
    pendingLevelUps = 0;
  }

  function hasSave() {
    try {
      return !!localStorage.getItem(data().saveKey);
    } catch (err) {
      return false;
    }
  }

  function newGame() {
    clearSave();
    state = {
      nodeId: "select",
      characterId: null,
      might: 0,
      wits: 0,
      spirit: 0,
      hp: 0,
      baseMaxHp: 0,
      xp: 0,
      level: 1,
      gold: 0,
      inventory: {},
      equipped: { weapon: null, armor: null },
      flags: {},
      coinReady: true,
      pardonArmed: false,
      combat: null,
      deathCause: null,
      lineIndex: 0,
      pendingVictory: null,
      stats: emptyStats(),
      wizardJabs: 0,
      wizardNext: null
    };
    save();
    return state;
  }

  function selectCharacter(id) {
    var c = data().characters[id];
    if (!c) return null;
    state.characterId = id;
    state.might = c.might;
    state.wits = c.wits;
    state.spirit = c.spirit;
    state.baseMaxHp = c.maxHp;
    state.hp = c.maxHp;
    state.gold = c.gold;
    state.xp = 0;
    state.level = 1;
    state.inventory = {};
    state.equipped = { weapon: null, armor: null };
    state.flags = {};
    state.coinReady = true;
    state.pardonArmed = false;
    state.combat = null;
    state.deathCause = null;
    state.stats = emptyStats();
    state.wizardJabs = 0;
    state.wizardNext = null;
    goTo("arrival");
    return state;
  }

  function goTo(nodeId) {
    var node = data().nodes[nodeId];
    if (!node) return;
    state.nodeId = nodeId;
    state.lineIndex = 0;
    state.coinReady = true;
    /* keep lastRoll so outcome math stays visible across the click-to-advance beat */

    if (node.type !== "combat") {
      state.combat = null;
    }

    if (node.onEnter) {
      var r = applyEffects(node.onEnter);
      if (r.dead) {
        die(state.deathCause || "count");
        return;
      }
    }

    if (node.type === "combat") {
      startCombat(node);
    }

    if (node.type === "ending") {
      recordFate(nodeId);
    }

    save();
  }

  function die(cause) {
    state.deathCause = cause || state.deathCause || "count";
    state.combat = null;
    state.hp = 0;
    state.nodeId = "death";
    state.lineIndex = 0;
    recordFate("death");
    save();
  }

  function startCombat(node) {
    if (state.combat && state.combat.encounter === node.encounter) {
      return;
    }
    var enc = data().encounters[node.encounter];
    var mods = pendingCombat || {};
    pendingCombat = null;

    var hp = enc.hp + (mods.hpDelta || 0);
    var damageBonus = mods.damageBonus || 0;

    if (node.encounter === "count") {
      if (state.flags.announced) hp = Math.min(hp, 20);
      if (state.flags.countWeakness) hp -= 4;
      if (state.flags.rudeEntry || state.flags.clauseFailed) damageBonus += 2;
      if (state.flags.inkSpill) damageBonus += 1;
    }

    if (hp < 1) hp = 1;

    var moveId = pickMove(enc, null, node.encounter);
    if (node.encounter === "count" && state.flags.stoleSilver) {
      moveId = "drain";
    }
    if (node.encounter === "count" && state.flags.firstLecture) {
      moveId = "lecture";
      state.flags.firstLecture = false;
    }

    var skipTurn = !!mods.skipTurn;
    if (state.flags.badAnnounce && node.encounter === "count") {
      skipTurn = true;
      state.flags.badAnnounce = false;
    }

    state.combat = {
      encounter: node.encounter,
      enemyHp: hp,
      enemyMaxHp: hp,
      moveId: moveId,
      skipTurn: skipTurn,
      damageBonus: damageBonus,
      round: 1,
      surprised: !!mods.surprised,
      playerHalve: false,
      playerCancel: false,
      damageReduce: 0,
      saveDcDelta: 0,
      log: []
    };

    if (mods.surprised) {
      /* enemy acts first after intro — handled by UI via combatActEnemyFirst */
    }
  }

  function encounterMoves(enc, encounterId) {
    var moves = enc.moves.slice();
    if (encounterId === "count" && state.flags.vellumSermon) {
      moves = moves.filter(function (m) {
        return m.id !== "mesmer";
      });
    }
    return moves;
  }

  function pickMove(enc, prevId, encounterId) {
    var moves = encounterMoves(enc, encounterId);
    if (moves.length === 0) return enc.moves[0].id;
    var pool = moves.filter(function (m) {
      return m.id !== prevId;
    });
    if (pool.length === 0) pool = moves;
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  function getMove(enc, moveId) {
    for (var i = 0; i < enc.moves.length; i++) {
      if (enc.moves[i].id === moveId) return enc.moves[i];
    }
    return enc.moves[0];
  }

  function resolveCheck(opt, useAdvantage) {
    var result = {
      success: true,
      roll: null,
      text: null,
      lines: [],
      next: null,
      dead: false,
      auto: false
    };

    if (!opt.check) {
      if (!optionAffordable(opt)) {
        result.success = false;
        result.lines = [
          {
            speaker: null,
            text: "You cannot afford that."
          }
        ];
        result.next = state.nodeId;
        return result;
      }
      var plain = applyEffects(opt.success.effects);
      result.lines = (opt.success.lines || []).slice();
      if (plain.notes && plain.notes.length) {
        for (var pn = 0; pn < plain.notes.length; pn++) {
          result.lines.push({ speaker: null, text: plain.notes[pn] });
        }
      }
      result.next = opt.success.next;
      result.dead = plain.dead;
      applyWizardUnlock(opt, result);
      if (result.dead) {
        die(state.deathCause || "count");
        result.next = "death";
      }
      return result;
    }

    var stat = opt.check.stat;
    var dc = computeDc(opt);
    var mod = state[stat] || 0;

    if (
      state.pardonArmed &&
      stat === "spirit"
    ) {
      state.pardonArmed = false;
      removeItem("pardon", 1);
      result.auto = true;
      result.success = true;
      result.text = "Forged Indulgence — SPIRIT check succeeds (no roll).";
      var autoBranch = opt.success;
      var autoFx = applyEffects(autoBranch.effects);
      result.lines = (autoBranch.lines || []).slice();
      if (autoFx.notes && autoFx.notes.length) {
        for (var ni = 0; ni < autoFx.notes.length; ni++) {
          result.lines.push({ speaker: null, text: autoFx.notes[ni] });
        }
      }
      result.next = autoBranch.next;
      result.dead = autoFx.dead;
      if (result.dead) {
        die(state.deathCause || "count");
        result.next = "death";
      }
      lastRoll = { text: result.text, success: true };
      return result;
    }

    var adv = !!(useAdvantage && canUseCoin());
    if (adv) {
      state.coinReady = false;
    }

    var roll = rollD20(adv);
    noteCrit(roll);
    var total = roll.kept + mod;
    var success =
      roll.critSuccess || (!roll.critFail && total >= dc);

    result.roll = roll;
    result.text = formatRoll(roll, stat, mod, total, dc, "DC");
    result.success = success;
    result.rolls = [packCheck(roll, stat, mod, total, dc)];
    lastRoll = {
      text: result.text,
      success: success,
      rolls: result.rolls
    };

    var branch = success ? opt.success : opt.failure || opt.success;
    var lines = (branch.lines || []).slice();
    var effects = (branch.effects || []).slice();

    if (success && roll.critSuccess && opt.critSuccess) {
      if (opt.critSuccess.lines && opt.critSuccess.lines.length) {
        lines = lines.concat(opt.critSuccess.lines);
      }
      if (opt.critSuccess.effects) {
        effects = effects.concat(opt.critSuccess.effects);
      }
    }

    if (!success && roll.critFail) {
      if (opt.critFail && opt.critFail.effects) {
        effects = [{ op: "damage", amount: 2 }].concat(opt.critFail.effects);
      } else {
        effects = [{ op: "damage", amount: 2 }].concat(effects);
      }
      if (opt.critFail && opt.critFail.lines && opt.critFail.lines.length) {
        lines = lines.concat(opt.critFail.lines);
      }
    }

    var fx = applyEffects(effects);
    if (fx.notes && fx.notes.length) {
      for (var nj = 0; nj < fx.notes.length; nj++) {
        lines.push({ speaker: null, text: fx.notes[nj] });
      }
    }
    result.lines = lines;
    result.next = branch.next;
    result.dead = fx.dead;

    if (result.dead) {
      var cause = state.deathCause;
      if (!cause && opt.deathCause) cause = opt.deathCause;
      if (!cause) {
        var node = data().nodes[state.nodeId];
        cause = (node && node.deathCause) || "count";
      }
      if (effects) {
        for (var i = 0; i < effects.length; i++) {
          if (effects[i].op === "death") cause = effects[i].cause;
        }
      }
      die(cause);
      result.next = "death";
    }

    return result;
  }

  function canUseCoin() {
    return invCount("coin") > 0 && state.coinReady;
  }

  function finishChoice(result) {
    if (result.dead) {
      save();
      return;
    }
    if (result.next) {
      goTo(result.next);
    } else {
      save();
    }
  }

  function chooseOption(optIndex, useAdvantage) {
    var node = resolveNode(state.nodeId);
    var visible = visibleOptions(node);
    var opt = visible[optIndex];
    if (!opt || opt.disabled) return null;
    var result = resolveCheck(opt, useAdvantage);
    finishChoice(result);
    return result;
  }

  function visibleOptions(node) {
    node = node || resolveNode(state.nodeId);
    var opts = node.options || [];
    var out = [];
    for (var i = 0; i < opts.length; i++) {
      if (!optionVisible(opts[i])) continue;
      var opt = opts[i];
      var copy = opt;
      var affordable = optionAffordable(opt);
      if (!affordable) {
        copy = {
          label: opt.label,
          check: opt.check,
          showIf: opt.showIf,
          hideIf: opt.hideIf,
          requireGold: opt.requireGold,
          requireToll: opt.requireToll,
          dcAdjust: opt.dcAdjust,
          success: opt.success,
          failure: opt.failure,
          critSuccess: opt.critSuccess,
          critFail: opt.critFail,
          deathCause: opt.deathCause,
          disabled: true
        };
        var need =
          opt.requireToll != null
            ? tollCost()
            : opt.requireGold != null
              ? opt.requireGold
              : 0;
        copy.disabledLabel =
          opt.label +
          " (" +
          need +
          "g) — you have " +
          state.gold;
      }
      out.push(copy);
    }
    return out;
  }

  /* ——— Inventory / shop ——— */

  function buyItem(itemId) {
    var node = data().nodes[state.nodeId];
    if (!node || node.type !== "shop") return { ok: false, reason: "not shop" };
    var shop = data().shops[node.shopId];
    if (shop.stock.indexOf(itemId) < 0) return { ok: false, reason: "not stocked" };
    var item = data().items[itemId];
    var price = itemPrice(itemId, node.shopId);
    if (state.gold < price) return { ok: false, reason: "gold" };

    if (item.kind === "weapon" || item.kind === "armor" || item.kind === "charm") {
      if (invCount(itemId) > 0) return { ok: false, reason: "owned" };
    }
    if (item.kind === "heal" || item.kind === "thrown" || item.kind === "indulgence") {
      if (invCount(itemId) >= 5) return { ok: false, reason: "cap" };
    }

    state.gold -= price;
    noteGoldLost(state.gold + price, state.gold);
    addItem(itemId, 1);
    save();
    return { ok: true, price: price };
  }

  function equipItem(itemId) {
    var item = data().items[itemId];
    if (!item || invCount(itemId) < 1) return false;
    if (item.kind === "weapon") {
      state.equipped.weapon = itemId;
    } else if (item.kind === "armor") {
      var was = state.equipped.armor;
      state.equipped.armor = itemId;
      if (was !== "jack" && itemId === "jack") {
        applyHeal(6);
      } else if (was === "jack" && itemId !== "jack") {
        if (state.hp > maxHp()) state.hp = maxHp();
      }
    } else return false;
    save();
    return true;
  }

  function unequip(slot) {
    if (slot === "armor" && state.equipped.armor === "jack") {
      state.equipped.armor = null;
      if (state.hp > maxHp()) state.hp = maxHp();
    } else if (slot === "weapon") {
      state.equipped.weapon = null;
    } else if (slot === "armor") {
      state.equipped.armor = null;
    }
    save();
  }

  function useItemOutOfCombat(itemId) {
    if (state.combat) return { ok: false, reason: "combat" };
    var item = data().items[itemId];
    if (!item || invCount(itemId) < 1) return { ok: false };

    if (item.kind === "heal") {
      var amt = healAmount(itemId);
      applyHeal(amt);
      removeItem(itemId, 1);
      save();
      return { ok: true, text: "You drink the " + item.name + " (+" + amt + " HP)." };
    }
    if (item.kind === "indulgence") {
      state.pardonArmed = true;
      /* keep in inventory until used on a spirit check; arming marks it */
      save();
      return { ok: true, text: "Forged Indulgence armed for the next Spirit check." };
    }
    if (item.kind === "weapon" || item.kind === "armor") {
      equipItem(itemId);
      return { ok: true, text: "Equipped " + item.name + "." };
    }
    return { ok: false, reason: "cant" };
  }

  function disarmPardon() {
    state.pardonArmed = false;
    save();
  }

  /* ——— Combat ——— */

  function combatLog(msg) {
    if (!state.combat) return;
    if (!state.combat.log) state.combat.log = [];
    state.combat.log.push(msg);
    if (state.combat.log.length > 8) state.combat.log.shift();
  }

  function enemyAlive() {
    return state.combat && state.combat.enemyHp > 0;
  }

  function afterPlayerAction(enc, node) {
    if (!enemyAlive()) {
      return winCombat(enc, node);
    }
    return resolveEnemyTurn(enc, node);
  }

  function mergeCombat(out, follow) {
    if (!follow) return out;
    out.won = out.won || follow.won;
    out.fled = out.fled || follow.fled;
    out.dead = out.dead || follow.dead;
    if (follow.rollText && !out.rollText) out.rollText = follow.rollText;
    else if (follow.rollText) out.rollText = (out.rollText || "") + " · " + follow.rollText;
    if (follow.rolls && follow.rolls.length) {
      out.rolls = (out.rolls || []).concat(follow.rolls);
    }
    if (follow.summary) {
      out.summary = (out.summary ? out.summary + " " : "") + follow.summary;
    }
    return out;
  }

  function winCombat(enc, node) {
    if (node.winFlag) state.flags[node.winFlag] = true;
    applyXp(enc.xp || 0);
    var goldNote = "";
    if (enc.gold) {
      state.gold += enc.gold;
      goldNote = " You gain " + enc.gold + " gold.";
    }
    state.pendingVictory = { next: node.onWin };
    state.combat = null;
    save();
    return {
      won: true,
      fled: false,
      dead: false,
      summary: "Victory." + goldNote,
      rollText: null
    };
  }

  function finishVictory() {
    var next =
      state.pendingVictory && state.pendingVictory.next
        ? state.pendingVictory.next
        : null;
    state.pendingVictory = null;
    if (next) goTo(next);
    else save();
  }

  function setLineIndex(idx) {
    if (!state) return;
    state.lineIndex = idx;
    save();
  }

  function resolveEnemyTurn(enc, node) {
    var c = state.combat;
    var move = getMove(enc, c.moveId);
    var result = { won: false, fled: false, dead: false, rollText: null, summary: "", rolls: [] };

    if (c.playerCancel) {
      combatLog("The telegraphed hit is cancelled.");
      c.playerCancel = false;
      c.playerHalve = false;
      c.damageReduce = 0;
      c.saveDcDelta = 0;
      if (c.encounter === "count") state.wizardNext = null;
      advanceTelegraph(enc, node);
      save();
      return result;
    }

    var mood = applyWizardMood(enc, move);

    if (move.save) {
      var dc = move.save.dc + (c.saveDcDelta || 0) + (mood.saveDcDelta || 0);
      var roll = rollD20(false);
      noteCrit(roll);
      var mod = state[move.save.stat] || 0;
      var total = roll.kept + mod;
      var ok =
        roll.critSuccess || (!roll.critFail && total >= dc);
      result.rollText = formatRoll(roll, move.save.stat, mod, total, dc);
      result.rolls = [packCheck(roll, move.save.stat, mod, total, dc)];
      if (ok) {
        result.summary = "You resist.";
        combatLog(result.summary);
      } else {
        if (move.fail === "skipTurn") {
          c.skipTurn = true;
          result.summary = "Mesmerized — you will skip your next turn.";
          combatLog(result.summary);
        }
      }
    } else {
      var dmg = move.damage || 0;
      dmg += c.damageBonus || 0;
      dmg += mood.damageDelta || 0;
      if (c.damageReduce) dmg = Math.max(0, dmg - c.damageReduce);
      if (c.playerHalve) dmg = Math.max(1, Math.floor(dmg / 2));
      if (dmg < 0) dmg = 0;
      var dealt = applyDamage(dmg);
      result.summary = enc.name + " hits for " + dealt + ".";
      combatLog(result.summary);
      if (move.goldSteal) {
        var beforeSteal = state.gold;
        state.gold -= move.goldSteal;
        clampGold();
        noteGoldLost(beforeSteal, state.gold);
        var stealLine = "It takes " + move.goldSteal + " gold with it.";
        result.summary = (result.summary ? result.summary + " " : "") + stealLine;
        combatLog(stealLine);
      }
      if (move.heal && dealt > 0) {
        c.enemyHp = Math.min(c.enemyMaxHp, c.enemyHp + move.heal);
        combatLog(enc.name + " drains " + move.heal + " HP.");
      }
      if (state.hp <= 0) {
        die(node.deathCause || "count");
        result.dead = true;
        save();
        return result;
      }
    }

    c.playerHalve = false;
    c.playerCancel = false;
    c.damageReduce = 0;
    c.saveDcDelta = 0;
    advanceTelegraph(enc, node);
    save();
    return result;
  }

  function advanceTelegraph(enc, node) {
    var c = state.combat;
    if (!c) return;
    c.moveId = pickMove(enc, c.moveId, c.encounter);
    c.round += 1;
  }

  function combatAttack(useAdvantage) {
    var node = data().nodes[state.nodeId];
    var enc = data().encounters[state.combat.encounter];
    var c = state.combat;
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false, rolls: [] };

    if (c.skipTurn) {
      c.skipTurn = false;
      combatLog("You are still. The night moves.");
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    var adv = !!(useAdvantage && canUseCoin());
    if (adv) state.coinReady = false;

    var roll = rollD20(adv);
    noteCrit(roll);
    var mod = state.might || 0;
    var total = roll.kept + mod;
    var ac = enc.ac;
    var hit =
      roll.critSuccess || (!roll.critFail && total >= ac);
    out.rollText = formatRoll(roll, "might", mod, total, ac, "AC");
    out.rolls = [packCheck(roll, "might", mod, total, ac)];

    if (roll.critFail) {
      out.summary =
        "Critical miss — the enemy strikes through the opening (+2).";
      combatLog(out.summary);
      c.damageBonus = (c.damageBonus || 0) + 2;
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    if (!hit) {
      out.summary = "Miss.";
      combatLog(out.summary);
      return mergeCombat(out, afterPlayerAction(enc, node));
    }

    var pool = rollPool(6, roll.critSuccess ? 2 : 1);
    out.rolls.push(packPool("d6", pool));
    var wBonus = weaponBonus(c.encounter);
    var dmg = pool.sum + mod + wBonus;
    c.enemyHp -= dmg;
    var wName =
      state.equipped && state.equipped.weapon
        ? data().items[state.equipped.weapon].name
        : null;
    out.summary =
      "Hit for " +
      dmg +
      (roll.critSuccess ? " (critical)" : "") +
      (wBonus
        ? " (" +
          (roll.critSuccess ? "2d6" : "1d6") +
          (mod ? "+" + mod + " Might" : "") +
          "+" +
          wBonus +
          (wName ? " " + wName : "") +
          ")"
        : "") +
      ".";
    combatLog(out.summary);
    return mergeCombat(out, afterPlayerAction(enc, node));
  }

  function combatSpecial(useAdvantage) {
    var node = data().nodes[state.nodeId];
    var enc = data().encounters[state.combat.encounter];
    var c = state.combat;
    var char = data().characters[state.characterId];
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false, rolls: [] };

    if (c.skipTurn) {
      c.skipTurn = false;
      combatLog("You are still.");
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    var dc = enc.spiritDc;
    var auto = false;

    if (state.pardonArmed) {
      state.pardonArmed = false;
      removeItem("pardon", 1);
      auto = true;
      out.rollText = "Forged Indulgence — " + char.special + " hits (no roll).";
    }

    var roll = null;
    var hit = true;
    if (!auto) {
      var adv = !!(useAdvantage && canUseCoin());
      if (adv) state.coinReady = false;
      roll = rollD20(adv);
      noteCrit(roll);
      var mod = state.spirit || 0;
      var total = roll.kept + mod;
      hit = roll.critSuccess || (!roll.critFail && total >= dc);
      out.rollText = formatRoll(roll, "spirit", mod, total, dc);
      out.rolls = [packCheck(roll, "spirit", mod, total, dc)];
    }

    if (!auto && roll && roll.critFail) {
      out.summary = "Critical fail — the enemy strikes.";
      combatLog(out.summary);
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    if (!hit) {
      out.summary = char.special + " fails.";
      combatLog(out.summary);
      return mergeCombat(out, afterPlayerAction(enc, node));
    }

    var crit = !!(roll && roll.critSuccess);
    var id = state.characterId;

    if (id === "bram") {
      var bPool = rollPool(4, crit ? 2 : 1);
      out.rolls.push(packPool("d4", bPool));
      var bDmg = bPool.sum + (state.spirit || 0);
      c.enemyHp -= bDmg;
      if (crit) c.playerCancel = true;
      else c.playerHalve = true;
      out.summary =
        "Occupational Hazard deals " +
        bDmg +
        (crit ? " and cancels their hit." : " and halves their hit.");
    } else if (id === "vellum") {
      var vPool = rollPool(8, crit ? 2 : 1);
      out.rolls.push(packPool("d8", vPool));
      var vDmg = vPool.sum + (state.spirit || 0);
      c.enemyHp -= vDmg;
      var heal = crit ? 4 : 2;
      applyHeal(heal);
      out.summary =
        "Unkind Blessing deals " + vDmg + " and heals " + heal + ".";
    } else {
      c.damageReduce = 3;
      c.saveDcDelta = -2;
      out.summary =
        "Revised Estimate: incoming damage −3; save DCs −2 this round.";
    }

    combatLog(out.summary);
    return mergeCombat(out, afterPlayerAction(enc, node));
  }

  function combatItem(itemId) {
    var node = data().nodes[state.nodeId];
    var enc = data().encounters[state.combat.encounter];
    var c = state.combat;
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false, rolls: [] };

    if (c.skipTurn) {
      c.skipTurn = false;
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    if (invCount(itemId) < 1) {
      out.summary = "You don't have that.";
      return out;
    }

    var item = data().items[itemId];

    if (item.kind === "heal") {
      var amt = healAmount(itemId);
      applyHeal(amt);
      removeItem(itemId, 1);
      out.summary = "Used " + item.name + " (+" + amt + " HP).";
      combatLog(out.summary);
      return mergeCombat(out, afterPlayerAction(enc, node));
    }

    if (item.kind === "thrown") {
      c.enemyHp -= item.damage;
      removeItem(itemId, 1);
      out.summary = "Bag of Nails deals " + item.damage + ".";
      combatLog(out.summary);
      return mergeCombat(out, afterPlayerAction(enc, node));
    }

    if (item.kind === "indulgence") {
      removeItem(itemId, 1);
      state.pardonArmed = true;
      out.summary = "Indulgence spent — resolving special.";
      combatLog(out.summary);
      var specialResult = combatSpecial(false);
      specialResult.summary =
        out.summary + (specialResult.summary ? " " + specialResult.summary : "");
      return specialResult;
    }

    out.summary = "Can't use that in combat.";
    return out;
  }

  function combatBrace(useAdvantage) {
    var node = data().nodes[state.nodeId];
    var enc = data().encounters[state.combat.encounter];
    var c = state.combat;
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false, rolls: [] };

    if (c.skipTurn) {
      c.skipTurn = false;
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    var adv = !!(useAdvantage && canUseCoin());
    if (adv) state.coinReady = false;

    var roll = rollD20(adv);
    noteCrit(roll);
    var mod = state.wits || 0;
    var dc = enc.fleeDc;
    var total = roll.kept + mod;
    var ok =
      roll.critSuccess || (!roll.critFail && total >= dc);
    out.rollText = formatRoll(roll, "wits", mod, total, dc, "DC");
    out.rolls = [packCheck(roll, "wits", mod, total, dc)];
    lastRoll = { text: out.rollText, success: ok, rolls: out.rolls };

    if (roll.critFail) {
      c.damageBonus = (c.damageBonus || 0) + 2;
      out.summary = "Brace fails badly — the blow lands harder (+2).";
      combatLog(out.summary);
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    if (ok) {
      if (roll.critSuccess) {
        c.playerCancel = true;
        out.summary = "Perfect brace — the telegraphed hit is cancelled.";
      } else {
        c.playerHalve = true;
        out.summary = "You brace — telegraphed damage is halved.";
      }
      combatLog(out.summary);
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    out.summary = "Brace fails — the blow comes in full.";
    combatLog(out.summary);
    return mergeCombat(out, resolveEnemyTurn(enc, node));
  }

  function combatFlee(useAdvantage) {
    var node = data().nodes[state.nodeId];
    var enc = data().encounters[state.combat.encounter];
    var c = state.combat;
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false, rolls: [] };

    if (c.skipTurn) {
      c.skipTurn = false;
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    var adv = !!(useAdvantage && canUseCoin());
    if (adv) state.coinReady = false;

    var roll = rollD20(adv);
    noteCrit(roll);
    var mod = state.wits || 0;
    var dc = enc.fleeDc;
    var total = roll.kept + mod;
    var ok =
      roll.critSuccess || (!roll.critFail && total >= dc);
    out.rollText = formatRoll(roll, "wits", mod, total, dc, "DC");
    out.rolls = [packCheck(roll, "wits", mod, total, dc)];

    if (ok) {
      if (roll.critSuccess) {
        state.gold += 3;
        out.summary =
          "You flee — and snatch 3 gold on the way. You gain 3 gold.";
      } else {
        out.summary = "You flee.";
      }
      combatLog(out.summary);
      if (node.fleeFlag) state.flags[node.fleeFlag] = true;
      state.combat = null;
      goTo(node.onFlee);
      out.fled = true;
      return out;
    }

    out.summary = "Can't get away.";
    combatLog(out.summary);
    if (roll.critFail) {
      applyDamage(2);
      if (state.hp <= 0) {
        die(node.deathCause || "count");
        out.dead = true;
        save();
        return out;
      }
    }
    return mergeCombat(out, resolveEnemyTurn(enc, node));
  }

  function combatEnemyFirst() {
    if (!state.combat || !state.combat.surprised) return null;
    state.combat.surprised = false;
    var node = data().nodes[state.nodeId];
    var enc = data().encounters[state.combat.encounter];
    return resolveEnemyTurn(enc, node);
  }

  function leaveShop() {
    var node = data().nodes[state.nodeId];
    if (!node || node.type !== "shop") return;
    goTo(node.leave || "inn");
  }

  function getState() {
    return state;
  }

  function getLastRoll() {
    return lastRoll;
  }

  function needsLevelPick() {
    return pendingLevelUps > 0;
  }

  function snapshot() {
    if (!state) return null;
    var node = resolveNode(state.nodeId);
    var char = state.characterId
      ? data().characters[state.characterId]
      : null;
    var combatView = null;
    if (state.combat) {
      var enc = data().encounters[state.combat.encounter];
      var move = getMove(enc, state.combat.moveId);
      combatView = {
        name: enc.name,
        enemyHp: state.combat.enemyHp,
        enemyMaxHp: state.combat.enemyMaxHp,
        telegraph: move.telegraph,
        moveId: state.combat.moveId,
        skipTurn: state.combat.skipTurn,
        surprised: state.combat.surprised,
        log: state.combat.log || [],
        specialName: char ? char.special : "Special"
      };
    }
    return {
      state: state,
      node: node,
      character: char,
      maxHp: maxHp(),
      options: visibleOptions(node),
      combat: combatView,
      canCoin: canUseCoin(),
      pardonArmed: state.pardonArmed,
      needsLevelPick: needsLevelPick(),
      tollCost: tollCost(),
      shop: node && node.type === "shop" ? shopView(node) : null,
      displayLevel: Math.max(1, state.level - pendingLevelUps),
      pendingVictory: state.pendingVictory || null,
      equippedLabels: equippedLabels(),
      stats: ensureStats(),
      wizardJabs: state.wizardJabs || 0,
      wizardNext: state.wizardNext || null,
      epitaph:
        node && node.type === "ending" && char
          ? {
              title: node.title,
              line: epitaphLine(node.id),
              glyph: char.glyph,
              name: char.name,
              role: char.role,
              nat20: ensureStats().nat20,
              nat1: ensureStats().nat1,
              goldWasted: ensureStats().goldWasted,
              wizardJabs: state.wizardJabs || 0,
              url: data().siteUrl
            }
          : null
    };
  }

  function equippedLabels() {
    var out = { weapon: null, armor: null };
    if (state.equipped && state.equipped.weapon) {
      var w = data().items[state.equipped.weapon];
      out.weapon =
        w.name + " (+" + (w.bonus || 0) + ")";
    }
    if (state.equipped && state.equipped.armor) {
      var a = data().items[state.equipped.armor];
      out.armor =
        a.name +
        " (+" +
        (a.maxHp || 0) +
        " HP, −" +
        (a.reduction || 0) +
        " dmg)";
    }
    return out;
  }

  function shopView(node) {
    var shop = data().shops[node.shopId];
    var stock = [];
    for (var i = 0; i < shop.stock.length; i++) {
      var id = shop.stock[i];
      var item = data().items[id];
      var owned = invCount(id);
      var unique =
        item.kind === "weapon" ||
        item.kind === "armor" ||
        item.kind === "charm";
      var price = itemPrice(id, node.shopId);
      stock.push({
        id: id,
        name: item.name,
        blurb: item.blurb,
        price: price,
        kind: item.kind,
        owned: owned,
        sold: unique && owned > 0,
        canAfford: state.gold >= price,
        atCap: !unique && owned >= 5
      });
    }
    return {
      keeper: shop.keeper,
      stock: stock,
      leave: shop.leave,
      shopId: shop.id
    };
  }

  function inventoryList() {
    var list = [];
    var ids = Object.keys(state.inventory || {});
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var item = data().items[id];
      if (!item) continue;
      list.push({
        id: id,
        name: item.name,
        kind: item.kind,
        count: state.inventory[id],
        blurb: item.blurb,
        equipped:
          (item.kind === "weapon" && state.equipped.weapon === id) ||
          (item.kind === "armor" && state.equipped.armor === id)
      });
    }
    return list;
  }

  window.MerlinEngine = {
    rollD20: rollD20,
    formatRoll: formatRoll,
    hasSave: hasSave,
    load: load,
    save: save,
    clearSave: clearSave,
    newGame: newGame,
    selectCharacter: selectCharacter,
    goTo: goTo,
    getState: getState,
    snapshot: snapshot,
    resolveNode: resolveNode,
    visibleOptions: visibleOptions,
    computeDc: computeDc,
    chooseOption: chooseOption,
    buyItem: buyItem,
    leaveShop: leaveShop,
    itemPrice: itemPrice,
    equipItem: equipItem,
    unequip: unequip,
    useItemOutOfCombat: useItemOutOfCombat,
    inventoryList: inventoryList,
    maxHp: maxHp,
    canUseCoin: canUseCoin,
    combatAttack: combatAttack,
    combatSpecial: combatSpecial,
    combatItem: combatItem,
    combatBrace: combatBrace,
    combatFlee: combatFlee,
    combatEnemyFirst: combatEnemyFirst,
    applyLevelPick: applyLevelPick,
    needsLevelPick: needsLevelPick,
    getLastRoll: getLastRoll,
    tollCost: tollCost,
    healAmount: healAmount,
    disarmPardon: disarmPardon,
    finishVictory: finishVictory,
    setLineIndex: setLineIndex,
    fatesView: fatesView,
    epitaphLine: epitaphLine
  };
})();
