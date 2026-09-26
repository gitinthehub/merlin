/* MERLIN — UI. Rendering + typewriter + input. */
(function () {
  "use strict";

  var E = window.MerlinEngine;
  var D = window.MERLIN;

  var els = {};
  var typewriter = {
    lines: [],
    lineIndex: 0,
    charIndex: 0,
    full: "",
    done: false,
    timer: null,
    after: null
  };
  var useCoinNext = false;
  var awaitingAdvance = false;
  var pendingResultLines = null;
  var packOpen = false;
  var fatesReturn = null;
  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Wire only conventional portrait paths; onerror falls back to glyph. */
  var PORTRAIT_FILES = {
    bram: "images/char-bram.png",
    vellum: "images/char-vellum.png",
    pip: "images/char-pip.png"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function cacheEls() {
    els.splash = $("splash");
    els.game = $("game");
    els.fates = $("fates");
    els.fatesList = $("fates-list");
    els.btnFates = $("btn-fates");
    els.btnFatesBack = $("btn-fates-back");
    els.sheet = $("sheet");
    els.btnContinue = $("btn-continue");
    els.btnStart = $("btn-start");
    els.btnDaily = $("btn-daily");
    els.dailyBlurb = $("daily-blurb");
    els.btnNew = $("btn-new");
    els.sheetGlyph = $("sheet-glyph");
    els.sheetName = $("sheet-name");
    els.sheetRole = $("sheet-role");
    els.sheetLevel = $("sheet-level");
    els.sheetGold = $("sheet-gold");
    els.sheetHpText = $("sheet-hp-text");
    els.sheetXpText = $("sheet-xp-text");
    els.barHp = $("bar-hp");
    els.barXp = $("bar-xp");
    els.statMight = $("stat-might");
    els.statWits = $("stat-wits");
    els.statSpirit = $("stat-spirit");
    els.btnPack = $("btn-pack");
    els.pack = $("pack");
    els.packList = $("pack-list");
    els.packEmpty = $("pack-empty");
    els.sceneTitle = $("scene-title");
    els.speaker = $("speaker");
    els.story = $("story");
    els.die = $("die");
    els.combat = $("combat");
    els.enemyName = $("enemy-name");
    els.enemyHp = $("enemy-hp");
    els.barEnemy = $("bar-enemy");
    els.telegraph = $("telegraph");
    els.combatLog = $("combat-log");
    els.combatActions = $("combat-actions");
    els.shop = $("shop");
    els.shopKeeper = $("shop-keeper");
    els.shopList = $("shop-list");
    els.btnLeaveShop = $("btn-leave-shop");
    els.choices = $("choices");
    els.selectChars = $("select-chars");
    els.endingActions = $("ending-actions");
    els.btnEndingNew = $("btn-ending-new");
    els.epitaphCanvas = $("epitaph-canvas");
    els.btnEpitaph = $("btn-epitaph");
    els.epitaphStatus = $("epitaph-status");
    els.visitReview = $("visit-review");
    els.shareLine = $("share-line");
    els.btnShare = $("btn-share");
    els.btnRestoreGate = $("btn-restore-gate");
    els.modal = $("modal");
    els.modalText = $("modal-text");
    els.modalActions = $("modal-actions");
  }

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      v = (v || "").trim();
      return v || fallback;
    } catch (err) {
      return fallback;
    }
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    var words = String(text || "").split(/\s+/);
    var lines = [];
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawEpitaph(epitaph) {
    var canvas = els.epitaphCanvas;
    if (!canvas || !epitaph) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 800;
    var H = 1000;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = "100%";
    canvas.style.maxWidth = "20rem";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var bg = cssVar("--bg", "#140c0a");
    var parchment = cssVar("--parchment", "#e8d4b0");
    var parchmentDim = cssVar("--parchment-dim", "#c4a882");
    var candle = cssVar("--candle", "#e8b86d");
    var brass = cssVar("--brass", "#b8924a");
    var edge = cssVar("--panel-edge", "#3a2418");
    var font =
      'Georgia, "Palatino Linotype", Palatino, "Book Antiqua", serif';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, W - 32, H - 32);

    var pad = 48;
    var cx = W / 2;

    ctx.fillStyle = candle;
    ctx.font = "700 42px " + font;
    ctx.textAlign = "center";
    ctx.fillText("MERLIN", cx, 70);
    ctx.fillStyle = parchmentDim;
    ctx.font = "italic 22px " + font;
    ctx.fillText("Not That One", cx, 102);

    ctx.font = "96px " + font;
    ctx.fillStyle = parchment;
    ctx.fillText(epitaph.glyph || "", cx, 210);
    ctx.font = "700 34px " + font;
    ctx.fillStyle = parchment;
    ctx.fillText(epitaph.name || "", cx, 260);
    ctx.font = "italic 22px " + font;
    ctx.fillStyle = parchmentDim;
    ctx.fillText(epitaph.role || "", cx, 292);

    ctx.fillStyle = parchment;
    ctx.font = "700 40px " + font;
    ctx.fillText(epitaph.title || "", cx, 370);

    ctx.fillStyle = brass;
    ctx.font = "600 18px " + font;
    ctx.fillText("The Count", cx, 430);
    ctx.fillStyle = candle;
    ctx.font = "italic 24px " + font;
    var mainQuote = epitaph.tombstone || epitaph.line || "";
    var quoteLines = wrapCanvasText(ctx, mainQuote, W - pad * 2);
    var qy = 470;
    for (var qi = 0; qi < quoteLines.length && qi < 4; qi++) {
      ctx.fillText(quoteLines[qi], cx, qy);
      qy += 32;
    }
    if (epitaph.tombstone && epitaph.line) {
      ctx.fillStyle = parchmentDim;
      ctx.font = "italic 18px " + font;
      var subLines = wrapCanvasText(ctx, epitaph.line, W - pad * 2);
      for (var si2 = 0; si2 < subLines.length && si2 < 2; si2++) {
        ctx.fillText(subLines[si2], cx, qy);
        qy += 24;
      }
    }

    if (epitaph.review) {
      ctx.fillStyle = parchmentDim;
      ctx.font = "italic 16px " + font;
      var revLines = wrapCanvasText(ctx, epitaph.review, W - pad * 2);
      var ry = Math.min(qy + 16, 640);
      for (var ri = 0; ri < revLines.length && ri < 4; ri++) {
        ctx.fillText(revLines[ri], cx, ry);
        ry += 22;
      }
    }

    var statsY = 700;
    var boxW = 200;
    var gap = 24;
    var totalW = boxW * 3 + gap * 2;
    var startX = (W - totalW) / 2;
    var stats = [
      { label: "Nat 20s", value: epitaph.nat20 },
      { label: "Nat 1s", value: epitaph.nat1 },
      { label: "Gold wasted", value: epitaph.goldWasted }
    ];
    for (var si = 0; si < stats.length; si++) {
      var sx = startX + si * (boxW + gap);
      ctx.strokeStyle = edge;
      ctx.strokeRect(sx, statsY, boxW, 100);
      ctx.fillStyle = parchmentDim;
      ctx.font = "18px " + font;
      ctx.fillText(stats[si].label, sx + boxW / 2, statsY + 36);
      ctx.fillStyle = candle;
      ctx.font = "700 36px " + font;
      ctx.fillText(String(stats[si].value == null ? 0 : stats[si].value), sx + boxW / 2, statsY + 78);
    }

    if (epitaph.wizardJabs > 0) {
      ctx.fillStyle = parchmentDim;
      ctx.font = "18px " + font;
      ctx.fillText("Called him a wizard", cx, 850);
      ctx.fillStyle = candle;
      ctx.font = "700 28px " + font;
      ctx.fillText(String(epitaph.wizardJabs), cx, 886);
    }

    ctx.fillStyle = brass;
    ctx.font = "18px " + font;
    ctx.fillText(epitaph.url || "", cx, 960);
  }

  function copyOrSaveEpitaph() {
    var canvas = els.epitaphCanvas;
    if (!canvas) return;
    var snap = E.snapshot();
    if (snap && snap.epitaph) drawEpitaph(snap.epitaph);
    if (els.btnEpitaph) els.btnEpitaph.disabled = true;
    if (els.epitaphStatus) els.epitaphStatus.textContent = "";

    function finish(msg) {
      if (els.epitaphStatus) els.epitaphStatus.textContent = msg;
      if (els.btnEpitaph) els.btnEpitaph.disabled = false;
    }

    if (!canvas.toBlob) {
      finish("Could not export image.");
      return;
    }

    canvas.toBlob(function (blob) {
      if (!blob) {
        finish("Could not export image.");
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "merlin-epitaph.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);

      var copied = false;
      if (
        navigator.clipboard &&
        window.ClipboardItem &&
        typeof navigator.clipboard.write === "function"
      ) {
        try {
          navigator.clipboard
            .write([new ClipboardItem({ "image/png": blob })])
            .then(function () {
              finish("Copied and saved.");
            })
            .catch(function () {
              finish("Saved.");
            });
          copied = true;
        } catch (err) {
          copied = false;
        }
      }
      if (!copied) finish("Saved.");
    }, "image/png");
  }

  function renderFates() {
    var view = E.fatesView();
    clear(els.fatesList);
    (view.rows || []).forEach(function (row) {
      var li = document.createElement("li");
      li.className =
        "fate " +
        (row.found ? "fate-found" : "fate-locked fate-blank");
      var title = document.createElement("div");
      title.className = "fate-title";
      title.textContent = row.found ? row.title : "————————";
      li.appendChild(title);
      if (row.found && row.line) {
        var line = document.createElement("p");
        line.className = "fate-line";
        line.textContent = row.line;
        li.appendChild(line);
      } else if (!row.found && row.hint) {
        var hint = document.createElement("p");
        hint.className = "fate-hint";
        hint.textContent = row.hint;
        li.appendChild(hint);
      }
      els.fatesList.appendChild(li);
    });
  }

  function showFates() {
    fatesReturn = {
      splash: !els.splash.hasAttribute("hidden"),
      game: !els.game.hasAttribute("hidden")
    };
    show(els.splash, false);
    show(els.game, false);
    show(els.fates, true);
    renderFates();
  }

  function hideFates() {
    show(els.fates, false);
    if (fatesReturn && fatesReturn.game) {
      show(els.game, true);
      show(els.splash, false);
    } else {
      show(els.splash, true);
      show(els.game, false);
    }
    fatesReturn = null;
  }

  function show(el, on) {
    if (on) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function btn(label, className, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = className || "btn";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  /* ——— Typewriter ——— */

  function stopTypewriter() {
    if (typewriter.timer) {
      clearTimeout(typewriter.timer);
      typewriter.timer = null;
    }
  }

  function startTypewriter(lines, after, startIndex) {
    stopTypewriter();
    typewriter.lines =
      lines && lines.length ? lines.slice() : [{ speaker: null, text: "" }];
    typewriter.lineIndex = Math.min(
      startIndex || 0,
      Math.max(0, typewriter.lines.length - 1)
    );
    typewriter.charIndex = 0;
    typewriter.done = false;
    typewriter.after = after || null;
    awaitingAdvance = false;
    if (E.setLineIndex) E.setLineIndex(typewriter.lineIndex);
    paintLineStart();
    tickTypewriter();
  }

  function showContinueCue() {
    var cue = document.createElement("span");
    cue.className = "continue-cue";
    cue.setAttribute("aria-hidden", "true");
    cue.textContent = "▾";
    els.story.appendChild(cue);
  }

  function paintLineStart() {
    var line = typewriter.lines[typewriter.lineIndex];
    typewriter.full = line.text || "";
    typewriter.charIndex = 0;
    if (line.speaker) {
      els.speaker.textContent = line.speaker;
      show(els.speaker, true);
    } else {
      show(els.speaker, false);
    }
    els.story.textContent = "";
  }

  function finishTypewriter() {
    typewriter.done = true;
    awaitingAdvance = false;
    var after = typewriter.after;
    typewriter.after = null;
    if (after) after();
  }

  function tickTypewriter() {
    if (typewriter.done) return;
    var full = typewriter.full;
    if (typewriter.charIndex < full.length) {
      typewriter.charIndex += 1;
      els.story.textContent = full.slice(0, typewriter.charIndex);
      var caret = document.createElement("span");
      caret.className = "caret";
      els.story.appendChild(caret);
      var delay = reducedMotion ? 0 : 18;
      typewriter.timer = setTimeout(tickTypewriter, delay);
    } else {
      els.story.textContent = full;
      awaitingAdvance = true;
      showContinueCue();
      /* Last line: wait for an extra click before after() */
    }
  }

  function skipOrAdvanceTypewriter() {
    if (typewriter.done) return false;
    var full = typewriter.full;
    if (typewriter.charIndex < full.length) {
      stopTypewriter();
      typewriter.charIndex = full.length;
      els.story.textContent = full;
      awaitingAdvance = true;
      showContinueCue();
      return true;
    }
    if (awaitingAdvance) {
      if (typewriter.lineIndex < typewriter.lines.length - 1) {
        typewriter.lineIndex += 1;
        if (E.setLineIndex) E.setLineIndex(typewriter.lineIndex);
        awaitingAdvance = false;
        paintLineStart();
        tickTypewriter();
        return true;
      }
      /* Final click on last line */
      finishTypewriter();
      return true;
    }
    return false;
  }

  /* ——— Modal ——— */

  function openModal(text, actions) {
    els.modalText.textContent = text;
    clear(els.modalActions);
    actions.forEach(function (a) {
      els.modalActions.appendChild(
        btn(a.label, a.className || "btn", function () {
          closeModal();
          if (a.onClick) a.onClick();
        })
      );
    });
    show(els.modal, true);
  }

  function closeModal() {
    show(els.modal, false);
  }

  function confirmNewGame(then) {
    openModal("Start a new night? Your guest book stays. This erases the saved run.", [
      { label: "Cancel", className: "btn", onClick: null },
      {
        label: "New Game",
        className: "btn primary",
        onClick: function () {
          E.clearSave();
          E.newGame();
          if (then) then();
          else showSelect();
        }
      }
    ]);
  }

  function maybeLevelUp(then) {
    if (!E.needsLevelPick()) {
      if (then) then();
      return;
    }
    openModal("Level up — choose a stat to raise (+1). Max HP +4, heal 4.", [
      {
        label: "Might",
        className: "btn primary",
        onClick: function () {
          E.applyLevelPick("might");
          renderSheet();
          maybeLevelUp(then);
        }
      },
      {
        label: "Wits",
        className: "btn primary",
        onClick: function () {
          E.applyLevelPick("wits");
          renderSheet();
          maybeLevelUp(then);
        }
      },
      {
        label: "Spirit",
        className: "btn primary",
        onClick: function () {
          E.applyLevelPick("spirit");
          renderSheet();
          maybeLevelUp(then);
        }
      }
    ]);
  }

  /* ——— Sheet ——— */

  function xpForNext(level, xp) {
    var t = D.xpThresholds;
    if (level >= 3) return { cur: xp, need: t[2], pct: 100 };
    var prev = t[level - 1] || 0;
    var need = t[level];
    var span = need - prev;
    var into = xp - prev;
    var pct = span <= 0 ? 100 : Math.min(100, Math.floor((into / span) * 100));
    return { cur: xp, need: need, pct: pct };
  }

  function renderSheet() {
    var snap = E.snapshot();
    if (!snap || !snap.state.characterId) {
      show(els.btnNew, false);
      show(els.sheet, false);
      return;
    }
    show(els.sheet, true);
    show(els.btnNew, true);
    var s = snap.state;
    var c = snap.character;
    mountPortrait(
      els.sheetGlyph,
      PORTRAIT_FILES[s.characterId] || null,
      c.glyph || ""
    );
    els.sheetName.textContent = c.name;
    els.sheetRole.textContent = c.role;
    els.sheetLevel.textContent = String(snap.displayLevel != null ? snap.displayLevel : s.level);
    els.sheetGold.textContent = String(s.gold);
    els.sheetHpText.textContent = s.hp + " / " + snap.maxHp;
    els.barHp.style.width =
      Math.max(0, Math.min(100, (s.hp / snap.maxHp) * 100)) + "%";
    var xp = xpForNext(s.level, s.xp);
    els.sheetXpText.textContent =
      s.level >= 3 ? s.xp + " (max)" : s.xp + " / " + xp.need;
    els.barXp.style.width = xp.pct + "%";
    els.statMight.textContent = String(s.might);
    els.statWits.textContent = String(s.wits);
    els.statSpirit.textContent = String(s.spirit);

    var eq = snap.equippedLabels || {};
    var eqEl = $("sheet-equipped");
    if (eqEl) {
      var parts = [];
      if (eq.weapon) parts.push(eq.weapon);
      if (eq.armor) parts.push(eq.armor);
      eqEl.textContent = parts.length ? parts.join(" · ") : "";
      show(eqEl, parts.length > 0);
    }
    renderPack();
  }

  function renderPack() {
    var list = E.inventoryList();
    clear(els.packList);
    show(els.packEmpty, list.length === 0);
    list.forEach(function (it) {
      var li = document.createElement("li");
      var title = document.createElement("div");
      title.textContent =
        it.name +
        (it.count > 1 ? " ×" + it.count : "") +
        (it.equipped ? " (equipped)" : "");
      li.appendChild(title);
      var blurb = document.createElement("div");
      blurb.className = "muted";
      blurb.textContent = it.blurb;
      li.appendChild(blurb);
      var actions = document.createElement("div");
      actions.className = "item-actions";

      if (it.kind === "weapon" || it.kind === "armor") {
        if (!it.equipped) {
          actions.appendChild(
            btn("Equip", "btn small", function () {
              E.equipItem(it.id);
              renderSheet();
              refreshStageSoft();
            })
          );
        } else {
          actions.appendChild(
            btn("Unequip", "btn small", function () {
              E.unequip(it.kind === "weapon" ? "weapon" : "armor");
              renderSheet();
              refreshStageSoft();
            })
          );
        }
      }
      if (it.kind === "heal") {
        actions.appendChild(
          btn("Use", "btn small", function () {
            var st = E.getState();
            if (st.combat) {
              handleCombatResult(E.combatItem(it.id));
            } else {
              var r = E.useItemOutOfCombat(it.id);
              if (r.ok) flashDie(r.text, true);
              renderSheet();
            }
          })
        );
      }
      if (it.kind === "indulgence") {
        actions.appendChild(
          btn(
            E.getState().pardonArmed ? "Armed" : "Arm",
            "btn small",
            function () {
              var st = E.getState();
              if (st.combat) {
                handleCombatResult(E.combatItem(it.id));
              } else {
                var r = E.useItemOutOfCombat(it.id);
                if (r.ok) flashDie(r.text, true);
                renderSheet();
              }
            }
          )
        );
      }
      if (it.kind === "thrown") {
        var st0 = E.getState();
        if (st0.combat) {
          actions.appendChild(
            btn("Throw", "btn small", function () {
              handleCombatResult(E.combatItem(it.id));
            })
          );
        }
      }
      if (actions.childNodes.length) li.appendChild(actions);
      els.packList.appendChild(li);
    });
  }

  /* ——— Portraits ——— */

  function mountPortrait(frame, src, glyph) {
    if (!frame) return;
    frame.textContent = glyph || "";
    if (!src) return;
    var img = new Image();
    img.alt = "";
    img.className = "portrait-img";
    img.onload = function () {
      while (frame.firstChild) frame.removeChild(frame.firstChild);
      frame.appendChild(img);
    };
    img.onerror = function () {
      frame.textContent = glyph || "";
    };
    img.src = src;
  }

  /* ——— Die display ——— */

  function flashDie(text, success, rolls) {
    if (!text) {
      show(els.die, false);
      return;
    }
    show(els.die, true);
    els.die.className = "die " + (success ? "success" : "fail");

    var faces = els.die.querySelector(".die-faces");
    var eq = els.die.querySelector(".die-eq");
    if (!faces) {
      faces = document.createElement("div");
      faces.className = "die-faces";
      els.die.appendChild(faces);
    }
    if (!eq) {
      eq = document.createElement("div");
      eq.className = "die-eq";
      els.die.appendChild(eq);
    }
    eq.textContent = text;

    if (rolls && rolls.length && window.MerlinDice) {
      window.MerlinDice.mount(faces, rolls, {
        size: "stage",
        animate: !reducedMotion
      });
    } else {
      while (faces.firstChild) faces.removeChild(faces.firstChild);
    }
  }

  /* ——— Scene render ——— */

  function showSplash() {
    show(els.splash, true);
    show(els.game, false);
    show(els.fates, false);
    show(els.btnNew, false);
    var has = E.hasSave();
    show(els.btnContinue, has);
    els.btnStart.textContent = has ? "New Game" : "Begin";
    updateDailyBlurb();
  }

  function updateDailyBlurb() {
    if (!els.dailyBlurb || !els.btnDaily) return;
    var spec = E.dailySpec();
    var char = D.characters[spec.heroId];
    var name = char ? char.name : spec.heroId;
    var text =
      "MERLIN #" + spec.number + " · " + spec.date + " · " + name;
    var rec = E.readDailyRecord();
    if (rec && rec.date === spec.date && rec.endingId) {
      var endNode = D.nodes[rec.endingId];
      var endTitle = endNode ? endNode.title : rec.endingId;
      text += " · Last: " + endTitle;
      els.btnDaily.textContent = "Replay today's curse";
    } else {
      els.btnDaily.textContent = "Daily Curse";
    }
    els.dailyBlurb.textContent = text;
    show(els.dailyBlurb, true);
  }

  function startDaily() {
    E.startDaily();
    show(els.splash, false);
    show(els.fates, false);
    show(els.game, true);
    renderScene();
  }

  function showSelect() {
    show(els.splash, false);
    show(els.fates, false);
    show(els.game, true);
    E.newGame();
    renderScene();
  }

  function resumeGame() {
    if (!E.load()) {
      showSplash();
      return;
    }
    show(els.splash, false);
    show(els.fates, false);
    show(els.game, true);
    renderScene();
    maybeLevelUp(null);
  }

  function hideStageParts() {
    show(els.combat, false);
    show(els.shop, false);
    show(els.choices, false);
    show(els.selectChars, false);
    show(els.endingActions, false);
    show(els.die, false);
    clear(els.choices);
    clear(els.combatActions);
    clear(els.selectChars);
  }

  function renderScene() {
    var snap = E.snapshot();
    if (!snap || !snap.node) return;
    hideStageParts();
    renderSheet();
    useCoinNext = false;

    var node = snap.node;
    if (els.game) {
      if (node.type === "select") els.game.classList.add("is-select");
      else els.game.classList.remove("is-select");
    }
    els.sceneTitle.textContent = node.title || "";

    var savedRoll = E.getLastRoll();
    if (savedRoll && savedRoll.text) {
      flashDie(savedRoll.text, !!savedRoll.success, savedRoll.rolls);
    }

    if (snap.pendingVictory) {
      startTypewriter(
        [{ speaker: null, text: "Victory." }],
        function () {
          maybeLevelUp(function () {
            E.finishVictory();
            renderScene();
          });
        }
      );
      return;
    }

    var startIdx =
      snap.state.lineIndex && snap.state.lineIndex > 0
        ? snap.state.lineIndex
        : 0;

    function afterScene() {
      if (node.type === "select") renderSelect();
      else if (node.type === "ending") {
        show(els.endingActions, true);
        if (els.epitaphStatus) els.epitaphStatus.textContent = "";
        if (snap.epitaph) drawEpitaph(snap.epitaph);
        if (els.visitReview) {
          els.visitReview.textContent =
            (snap.epitaph && snap.epitaph.review) || "";
        }
        if (els.shareLine && els.btnShare) {
          if (snap.shareLine) {
            els.shareLine.textContent = snap.shareLine;
            show(els.shareLine, true);
            show(els.btnShare, true);
          } else {
            show(els.shareLine, false);
            show(els.btnShare, false);
          }
        }
        if (els.btnRestoreGate) {
          show(
            els.btnRestoreGate,
            node.id === "death" && snap.hasCheckpoint
          );
        }
      } else if (node.type === "shop") renderShop(E.snapshot());
      else if (node.type === "combat") {
        var s = E.snapshot();
        renderCombat(s);
        if (s.combat && s.combat.surprised) {
          setTimeout(function () {
            var er = E.combatEnemyFirst();
            if (er && er.rollText) flashDie(er.rollText, false, er.rolls);
            renderSheet();
            var s2 = E.snapshot();
            if (s2.node && s2.node.type === "combat") renderCombat(s2);
            else renderScene();
            maybeLevelUp(null);
          }, reducedMotion ? 0 : 400);
        }
      } else {
        renderChoices(E.snapshot());
      }
    }

    if (node.type === "select") {
      show(els.speaker, false);
      startTypewriter(node.lines, afterScene, 0);
      return;
    }

    startTypewriter(node.lines, afterScene, startIdx);
  }

  function refreshStageSoft() {
    var snap = E.snapshot();
    if (!snap) return;
    if (snap.node.type === "shop") renderShop(snap);
    if (snap.node.type === "combat") renderCombat(snap);
    if (snap.node.type === "scene" && typewriter.done) renderChoices(snap);
  }

  function renderSelect() {
    show(els.selectChars, true);
    clear(els.selectChars);
    ["bram", "vellum", "pip"].forEach(function (id) {
      var c = D.characters[id];
      var card = document.createElement("button");
      card.type = "button";
      card.className = "char-card";
      card.innerHTML = "";
      var g = document.createElement("div");
      g.className = "glyph";
      mountPortrait(g, PORTRAIT_FILES[id], c.glyph);
      var n = document.createElement("div");
      n.className = "name";
      n.textContent = c.name;
      var r = document.createElement("div");
      r.className = "role";
      r.textContent = c.role;
      var v = document.createElement("div");
      v.className = "voice";
      v.textContent = c.voice;
      var nums = document.createElement("div");
      nums.className = "nums";
      nums.textContent =
        "MGT " +
        c.might +
        "  WIT " +
        c.wits +
        "  SPI " +
        c.spirit +
        "  HP " +
        c.maxHp +
        "  ✦ " +
        c.gold;
      card.appendChild(g);
      card.appendChild(n);
      card.appendChild(r);
      card.appendChild(v);
      card.appendChild(nums);
      card.addEventListener("click", function () {
        E.selectCharacter(id);
        renderScene();
      });
      els.selectChars.appendChild(card);
    });
  }

  function addCoinToggle(parent, snap) {
    if (!snap.canCoin) return;
    var row = document.createElement("label");
    row.className = "coin-row";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = useCoinNext;
    cb.addEventListener("change", function () {
      useCoinNext = cb.checked;
    });
    row.appendChild(cb);
    row.appendChild(
      document.createTextNode(" Use Twice-Lucky Coin (advantage)")
    );
    parent.appendChild(row);
  }

  function renderChoices(snap) {
    show(els.choices, true);
    clear(els.choices);
    addCoinToggle(els.choices, snap);

    snap.options.forEach(function (opt, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      var label = document.createElement("span");
      label.textContent = opt.disabled
        ? opt.disabledLabel || opt.label
        : opt.label;
      b.appendChild(label);
      if (opt.check && !opt.disabled) {
        var dc = E.computeDc(opt);
        var hint = document.createElement("span");
        hint.className = "choice-dc";
        hint.textContent =
          opt.check.stat.toUpperCase() + " DC " + dc;
        b.appendChild(hint);
      }
      if (opt.requireToll && !opt.disabled) {
        var toll = document.createElement("span");
        toll.className = "choice-dc";
        toll.textContent = snap.tollCost + " gold";
        b.appendChild(toll);
      }
      if (opt.disabled) {
        b.disabled = true;
      } else {
        b.addEventListener("click", function () {
          onChoose(idx);
        });
      }
      els.choices.appendChild(b);
    });
  }

  function onChoose(idx) {
    show(els.choices, false);
    var result = E.chooseOption(idx, useCoinNext);
    useCoinNext = false;
    if (!result) {
      renderScene();
      return;
    }

    if (result.text) flashDie(result.text, result.success, result.rolls);
    else show(els.die, false);

    var lines = result.lines && result.lines.length ? result.lines : null;
    var after = function () {
      maybeLevelUp(function () {
        renderScene();
      });
    };

    if (lines) {
      startTypewriter(lines, after);
    } else {
      after();
    }
    renderSheet();
  }

  function renderShop(snap) {
    show(els.shop, true);
    var shop = snap.shop;
    els.shopKeeper.textContent = shop.keeper;
    clear(els.shopList);
    shop.stock.forEach(function (it) {
      var li = document.createElement("li");
      li.className = "shop-row";
      var row = document.createElement("div");
      row.className = "row";
      var left = document.createElement("div");
      var name = document.createElement("strong");
      name.textContent = it.name;
      left.appendChild(name);
      var blurb = document.createElement("div");
      blurb.className = "muted";
      blurb.textContent = it.blurb;
      left.appendChild(blurb);
      row.appendChild(left);
      var right = document.createElement("div");
      right.className = "shop-buy";
      var price = document.createElement("div");
      price.className = "price";
      price.textContent = it.price + " ✦";
      right.appendChild(price);

      var status = "Buy";
      var disabled = false;
      if (it.sold) {
        status = "Sold";
        disabled = true;
      } else if (it.atCap) {
        status = "Max";
        disabled = true;
      } else if (!it.canAfford) {
        status = "Too poor";
        disabled = true;
      }

      var buy = btn(status, "btn small shop-buy-btn", function () {
        if (disabled) return;
        doBuy(it.id);
      });
      if (disabled) buy.disabled = true;
      right.appendChild(buy);
      row.appendChild(right);
      li.appendChild(row);

      if (!disabled) {
        li.classList.add("tappable");
        li.addEventListener("click", function (ev) {
          if (ev.target.closest && ev.target.closest("button")) return;
          doBuy(it.id);
        });
      }
      els.shopList.appendChild(li);
    });
  }

  function doBuy(itemId) {
    var r = E.buyItem(itemId);
    if (r.ok) {
      flashDie("Bought for " + r.price + " gold. You lose " + r.price + " gold.", true);
      renderSheet();
      renderShop(E.snapshot());
    }
  }

  function renderCombat(snap) {
    show(els.combat, true);
    var c = snap.combat;
    if (!c) return;
    els.enemyName.textContent = c.name;
    els.enemyHp.textContent = c.enemyHp + " / " + c.enemyMaxHp + " HP";
    els.barEnemy.style.width =
      Math.max(0, Math.min(100, (c.enemyHp / c.enemyMaxHp) * 100)) + "%";
    els.telegraph.textContent = "Telegraph: " + c.telegraph;
    clear(els.combatLog);
    (c.log || []).forEach(function (line) {
      var li = document.createElement("li");
      li.textContent = line;
      els.combatLog.appendChild(li);
    });

    clear(els.combatActions);
    addCoinToggle(els.combatActions, snap);

    if (c.skipTurn) {
      var skip = btn("You are mesmerized — End turn", "btn", function () {
        handleCombatResult(E.combatAttack(false));
      });
      els.combatActions.appendChild(skip);
      return;
    }

    els.combatActions.appendChild(
      btn("Attack (Might)", "btn", function () {
        handleCombatResult(E.combatAttack(useCoinNext));
      })
    );
    els.combatActions.appendChild(
      btn(c.specialName + " (Spirit)", "btn", function () {
        handleCombatResult(E.combatSpecial(useCoinNext));
      })
    );
    els.combatActions.appendChild(
      btn("Brace (Wits)", "btn", function () {
        handleCombatResult(E.combatBrace(useCoinNext));
      })
    );

    var inv = E.inventoryList();
    inv.forEach(function (it) {
      if (
        it.kind === "heal" ||
        it.kind === "thrown" ||
        it.kind === "indulgence"
      ) {
        els.combatActions.appendChild(
          btn(
            "Item: " + it.name + (it.count > 1 ? " ×" + it.count : ""),
            "btn",
            function () {
              handleCombatResult(E.combatItem(it.id));
            }
          )
        );
      }
    });

    els.combatActions.appendChild(
      btn("Flee (Wits)", "btn", function () {
        handleCombatResult(E.combatFlee(useCoinNext));
      })
    );
  }

  function handleCombatResult(result) {
    useCoinNext = false;
    if (!result) {
      renderScene();
      return;
    }
    if (result.rollText) {
      var successPaint =
        !result.dead &&
        (result.fled ||
          result.won ||
          (result.summary && /^Hit /.test(result.summary)) ||
          (result.summary && /flee/i.test(result.summary)) ||
          (result.summary && /flee|Brace|Occupational|Blessing|Estimate/i.test(result.summary)));
      flashDie(result.rollText, !!successPaint, result.rolls);
    }
    renderSheet();

    if (result.won) {
      clear(els.combatActions);
      show(els.combat, false);
      startTypewriter(
        [{ speaker: null, text: result.summary || "Victory." }],
        function () {
          maybeLevelUp(function () {
            E.finishVictory();
            renderScene();
          });
        }
      );
      return;
    }

    if (result.dead || result.fled) {
      maybeLevelUp(function () {
        renderScene();
      });
      return;
    }

    var snap = E.snapshot();
    if (snap.node && snap.node.type === "combat") renderCombat(snap);
    else {
      maybeLevelUp(function () {
        renderScene();
      });
    }
  }

  /* ——— Events ——— */

  function bind() {
    els.btnStart.addEventListener("click", function () {
      if (E.hasSave()) {
        confirmNewGame(function () {
          showSelect();
        });
      } else {
        showSelect();
      }
    });

    els.btnContinue.addEventListener("click", function () {
      resumeGame();
    });

    if (els.btnDaily) {
      els.btnDaily.addEventListener("click", function () {
        if (E.hasSave()) {
          confirmNewGame(function () {
            startDaily();
          });
        } else {
          startDaily();
        }
      });
    }

    els.btnNew.addEventListener("click", function () {
      confirmNewGame(function () {
        showSelect();
      });
    });

    els.btnEndingNew.addEventListener("click", function () {
      confirmNewGame(function () {
        showSelect();
      });
    });

    if (els.btnEpitaph) {
      els.btnEpitaph.addEventListener("click", function () {
        copyOrSaveEpitaph();
      });
    }

    if (els.btnShare) {
      els.btnShare.addEventListener("click", function () {
        var snap = E.snapshot();
        var text = snap.shareLine || "";
        if (snap.epitaph && snap.epitaph.review) {
          text = text + "\n" + snap.epitaph.review;
        }
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () {
              if (els.epitaphStatus) {
                els.epitaphStatus.textContent = "Share line copied.";
              }
            },
            function () {
              if (els.epitaphStatus) {
                els.epitaphStatus.textContent = "Could not copy.";
              }
            }
          );
        } else if (els.epitaphStatus) {
          els.epitaphStatus.textContent = text;
        }
      });
    }

    if (els.btnRestoreGate) {
      els.btnRestoreGate.addEventListener("click", function () {
        if (E.restoreGate()) renderScene();
      });
    }

    if (els.btnFates) {
      els.btnFates.addEventListener("click", function () {
        showFates();
      });
    }

    if (els.btnFatesBack) {
      els.btnFatesBack.addEventListener("click", function () {
        hideFates();
      });
    }

    els.btnLeaveShop.addEventListener("click", function () {
      E.leaveShop();
      renderScene();
    });

    els.btnPack.addEventListener("click", function () {
      packOpen = !packOpen;
      show(els.pack, packOpen);
      els.btnPack.textContent = packOpen ? "Pack ▴" : "Pack";
      if (els.sheet) {
        if (packOpen) els.sheet.classList.add("sheet-expanded");
        else els.sheet.classList.remove("sheet-expanded");
      }
    });

    els.story.addEventListener("click", function () {
      skipOrAdvanceTypewriter();
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        if (els.modal && !els.modal.hasAttribute("hidden")) return;
        if (els.fates && !els.fates.hasAttribute("hidden")) return;
        if (skipOrAdvanceTypewriter()) ev.preventDefault();
      }
    });
  }

  function boot() {
    cacheEls();
    bind();
    if (E.hasSave()) {
      /* Auto-resume mid-game on refresh per plan */
      resumeGame();
    } else {
      showSplash();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
