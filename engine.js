/* MERLIN — pure engine. No DOM. */
(function () {
  "use strict";

  var D = null;
  var state = null;
  var pendingCombat = null;
  var lastRoll = null;
  var pendingLevelUps = 0;
  var levelPickQueue = [];

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

  function formatRoll(roll, stat, mod, total, dc) {
    var name = String(stat).toUpperCase();
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
        " vs DC " +
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
        " vs DC " +
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
    return out;
  }

  function optionVisible(opt) {
    if (opt.showIf && !matchCond(opt.showIf)) return false;
    if (opt.hideIf && matchCond(opt.hideIf)) return false;
    if (opt.requireGold != null && state.gold < opt.requireGold) return false;
    if (opt.requireToll) {
      var cost = tollCost();
      if (state.gold < cost) return false;
    }
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
    if (!effects) return { dead: false };
    var dead = false;
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      if (e.op === "flag") {
        if (e.value === false) delete state.flags[e.key];
        else state.flags[e.key] = e.value;
      } else if (e.op === "gold") {
        state.gold += e.amount;
        clampGold();
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
      } else if (e.op === "payToll") {
        state.gold -= tollCost();
        clampGold();
      } else if (e.op === "vellumPox") {
        if (state.characterId === "vellum") state.flags.vellumHonest = true;
      } else if (e.op === "vellumOswald") {
        if (state.characterId === "vellum") state.flags.oswaldSoft = true;
      } else if (e.op === "prepareCount") {
        /* flags only; combat start reads them */
      }
    }
    return { dead: dead };
  }

  function tollCost() {
    return state.flags.wightAngry ? 12 : 8;
  }

  function itemPrice(itemId) {
    var item = data().items[itemId];
    var price = item.price;
    if (itemId === "jack" && state.characterId === "bram") price = 6;
    if (state.characterId === "pip") price = Math.max(1, price - 2);
    return price;
  }

  function healAmount(itemId) {
    var item = data().items[itemId];
    if (!item) return 0;
    if (itemId === "draught" && state.characterId === "vellum") {
      return item.vellumHeal || item.heal;
    }
    return item.heal || 0;
  }

  function save() {
    try {
      var blob = {
        v: 1,
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
        pendingLevelUps: pendingLevelUps
      };
      localStorage.setItem(data().saveKey, JSON.stringify(blob));
    } catch (err) {
      /* ignore quota / private mode */
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(data().saveKey);
      if (!raw) return null;
      var blob = JSON.parse(raw);
      if (!blob || blob.v !== 1 || !blob.characterId) return null;
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
        lineIndex: blob.lineIndex || 0
      };
      pendingLevelUps = blob.pendingLevelUps || 0;
      pendingCombat = null;
      lastRoll = null;
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
      lineIndex: 0
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
    goTo("arrival");
    return state;
  }

  function goTo(nodeId) {
    var node = data().nodes[nodeId];
    if (!node) return;
    state.nodeId = nodeId;
    state.lineIndex = 0;
    state.coinReady = true;
    lastRoll = null;

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

    save();
  }

  function die(cause) {
    state.deathCause = cause || state.deathCause || "count";
    state.combat = null;
    state.hp = 0;
    state.nodeId = "death";
    state.lineIndex = 0;
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
      var plain = applyEffects(opt.success.effects);
      result.lines = (opt.success.lines || []).slice();
      result.next = opt.success.next;
      result.dead = plain.dead;
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
      if (opt.critSuccess && opt.critSuccess.lines) {
        /* not a crit */
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
    var total = roll.kept + mod;
    var success =
      roll.critSuccess || (!roll.critFail && total >= dc);

    result.roll = roll;
    result.text = formatRoll(roll, stat, mod, total, dc);
    result.success = success;
    lastRoll = { text: result.text, success: success, roll: roll };

    var branch = success ? opt.success : opt.failure || opt.success;
    var extra = success ? opt.critSuccess : opt.critFail;
    var lines = (branch.lines || []).slice();
    var effects = (branch.effects || []).slice();

    if (extra) {
      if (extra.lines && extra.lines.length) {
        lines = lines.concat(extra.lines);
      }
      if (extra.effects) {
        if (success) {
          effects = effects.concat(extra.effects);
        } else if (roll.critFail) {
          /* Crit-fail effects replace the failure's effects, then +2 damage. */
          effects = [{ op: "damage", amount: 2 }].concat(extra.effects);
        }
      } else if (!success && roll.critFail) {
        effects = [{ op: "damage", amount: 2 }].concat(effects);
      }
    } else if (!success && roll.critFail) {
      effects = [{ op: "damage", amount: 2 }].concat(effects);
    }

    var fx = applyEffects(effects);
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
    if (!opt) return null;
    var result = resolveCheck(opt, useAdvantage);
    finishChoice(result);
    return result;
  }

  function visibleOptions(node) {
    node = node || resolveNode(state.nodeId);
    var opts = node.options || [];
    var out = [];
    for (var i = 0; i < opts.length; i++) {
      if (optionVisible(opts[i])) out.push(opts[i]);
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
    var price = itemPrice(itemId);
    if (state.gold < price) return { ok: false, reason: "gold" };

    if (item.kind === "weapon" || item.kind === "armor" || item.kind === "charm") {
      if (invCount(itemId) > 0) return { ok: false, reason: "owned" };
    }
    if (item.kind === "heal" || item.kind === "thrown" || item.kind === "indulgence") {
      if (invCount(itemId) >= 5) return { ok: false, reason: "cap" };
    }

    state.gold -= price;
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
      winCombat(enc, node);
      return { won: true, fled: false, dead: false, summary: "", rollText: null };
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
    if (follow.summary) {
      out.summary = (out.summary ? out.summary + " " : "") + follow.summary;
    }
    return out;
  }

  function winCombat(enc, node) {
    if (node.winFlag) state.flags[node.winFlag] = true;
    applyXp(enc.xp || 0);
    state.gold += enc.gold || 0;
    combatLog("Victory.");
    state.combat = null;
    goTo(node.onWin);
    return { won: true };
  }

  function resolveEnemyTurn(enc, node) {
    var c = state.combat;
    var move = getMove(enc, c.moveId);
    var result = { won: false, fled: false, dead: false, rollText: null, summary: "" };

    if (c.playerCancel) {
      combatLog("The telegraphed hit is cancelled.");
      c.playerCancel = false;
      c.playerHalve = false;
      c.damageReduce = 0;
      c.saveDcDelta = 0;
      advanceTelegraph(enc, node);
      save();
      return result;
    }

    if (move.save) {
      var dc = move.save.dc + (c.saveDcDelta || 0);
      var adv = false;
      var roll = rollD20(false);
      var mod = state[move.save.stat] || 0;
      var total = roll.kept + mod;
      var ok =
        roll.critSuccess || (!roll.critFail && total >= dc);
      result.rollText = formatRoll(roll, move.save.stat, mod, total, dc);
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
      if (c.damageReduce) dmg = Math.max(0, dmg - c.damageReduce);
      if (c.playerHalve) dmg = Math.max(1, Math.floor(dmg / 2));
      var dealt = applyDamage(dmg);
      result.summary = enc.name + " hits for " + dealt + ".";
      combatLog(result.summary);
      if (move.goldSteal) {
        state.gold -= move.goldSteal;
        clampGold();
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
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false };

    if (c.skipTurn) {
      c.skipTurn = false;
      combatLog("You are still. The night moves.");
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    var adv = !!(useAdvantage && canUseCoin());
    if (adv) state.coinReady = false;

    var roll = rollD20(adv);
    var mod = state.might || 0;
    var total = roll.kept + mod;
    var ac = enc.ac;
    var hit =
      roll.critSuccess || (!roll.critFail && total >= ac);
    out.rollText = formatRoll(roll, "might", mod, total, ac);

    if (roll.critFail) {
      out.summary = "Critical miss — the enemy strikes immediately.";
      combatLog(out.summary);
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    if (!hit) {
      out.summary = "Miss.";
      combatLog(out.summary);
      return mergeCombat(out, afterPlayerAction(enc, node));
    }

    var dice = roll.critSuccess ? rollDie(6) + rollDie(6) : rollDie(6);
    var dmg = dice + mod + weaponBonus(c.encounter);
    c.enemyHp -= dmg;
    out.summary =
      "Hit for " +
      dmg +
      (roll.critSuccess ? " (critical)!" : ".");
    combatLog(out.summary);
    return mergeCombat(out, afterPlayerAction(enc, node));
  }

  function combatSpecial(useAdvantage) {
    var node = data().nodes[state.nodeId];
    var enc = data().encounters[state.combat.encounter];
    var c = state.combat;
    var char = data().characters[state.characterId];
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false };

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
      var mod = state.spirit || 0;
      var total = roll.kept + mod;
      hit = roll.critSuccess || (!roll.critFail && total >= dc);
      out.rollText = formatRoll(roll, "spirit", mod, total, dc);
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
      var bd = crit ? rollDie(4) + rollDie(4) : rollDie(4);
      var bDmg = bd + (state.spirit || 0);
      c.enemyHp -= bDmg;
      if (crit) c.playerCancel = true;
      else c.playerHalve = true;
      out.summary =
        "Occupational Hazard deals " +
        bDmg +
        (crit ? " and cancels their hit." : " and halves their hit.");
    } else if (id === "vellum") {
      var vd = crit ? rollDie(8) + rollDie(8) : rollDie(8);
      var vDmg = vd + (state.spirit || 0);
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
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false };

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

  function combatFlee(useAdvantage) {
    var node = data().nodes[state.nodeId];
    var enc = data().encounters[state.combat.encounter];
    var c = state.combat;
    var out = { rollText: null, summary: "", won: false, dead: false, fled: false };

    if (c.skipTurn) {
      c.skipTurn = false;
      return mergeCombat(out, resolveEnemyTurn(enc, node));
    }

    var adv = !!(useAdvantage && canUseCoin());
    if (adv) state.coinReady = false;

    var roll = rollD20(adv);
    var mod = state.wits || 0;
    var dc = enc.fleeDc;
    var total = roll.kept + mod;
    var ok =
      roll.critSuccess || (!roll.critFail && total >= dc);
    out.rollText = formatRoll(roll, "wits", mod, total, dc);

    if (ok) {
      if (roll.critSuccess) {
        state.gold += 3;
        out.summary = "You flee — and snatch 3 gold on the way.";
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
      shop: node && node.type === "shop" ? shopView(node) : null
    };
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
      if (unique && owned > 0) continue;
      stock.push({
        id: id,
        name: item.name,
        blurb: item.blurb,
        price: itemPrice(id),
        kind: item.kind,
        owned: owned,
        canAfford: state.gold >= itemPrice(id),
        atCap: !unique && owned >= 5
      });
    }
    return {
      keeper: shop.keeper,
      stock: stock,
      leave: shop.leave
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
    combatFlee: combatFlee,
    combatEnemyFirst: combatEnemyFirst,
    applyLevelPick: applyLevelPick,
    needsLevelPick: needsLevelPick,
    getLastRoll: getLastRoll,
    tollCost: tollCost,
    healAmount: healAmount,
    disarmPardon: disarmPardon
  };
})();
