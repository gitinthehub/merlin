/* MERLIN — visual roadmap page. Static; no engine, no network. */
(function () {
  "use strict";

  /* Keep in sync with ROADMAP.md plot-point + phase tables. */
  var BEATS = [
    {
      title: "1. The cart at dusk",
      nodes: "arrival — Hallowmere Gate",
      check: "WITS d20 vs DC 12",
      file: "images/beat-gate.png",
      dice: [{ kind: "d20", dice: [12], kept: 12, dropped: null, total: 12, stat: "wits", mod: 0, dc: 12, critSuccess: false, critFail: false }]
    },
    {
      title: "2. The Gutted Goose",
      nodes: "inn, hearth",
      check: "— (shop + rest)",
      file: "images/beat-inn.png",
      dice: []
    },
    {
      title: "3. Hearth & Nail",
      nodes: "hearth (shop)",
      check: "— (gold only)",
      file: "images/beat-shop.png",
      dice: []
    },
    {
      title: "4. The Square",
      nodes: "mayor",
      check: "WITS d20 vs DC 13",
      file: "images/beat-square.png",
      dice: [{ kind: "d20", dice: [13], kept: 13, dropped: null, total: 13, stat: "wits", mod: 0, dc: 13, critSuccess: false, critFail: false }]
    },
    {
      title: "5. The Churchyard",
      nodes: "churchyard → fight_ghoul → after_ghoul",
      check: "SPIRIT d20 vs DC 14 · WITS d20 vs DC 15 · then the ghoul",
      file: "images/beat-churchyard.png",
      dice: [
        { kind: "d20", dice: [14], kept: 14, dropped: null, total: 14, stat: "spirit", mod: 0, dc: 14, critSuccess: false, critFail: false },
        { kind: "d20", dice: [15], kept: 15, dropped: null, total: 15, stat: "wits", mod: 0, dc: 15, critSuccess: false, critFail: false }
      ]
    },
    {
      title: "6. The Marsh Road",
      nodes: "marsh, pox → fight_wight → after_wight",
      check: "WITS d20 vs DC 13, then the wight",
      file: "images/beat-marsh.png",
      dice: [{ kind: "d20", dice: [13], kept: 13, dropped: null, total: 13, stat: "wits", mod: 0, dc: 13, critSuccess: false, critFail: false }]
    },
    {
      title: "7. Castle Gate & Foyer",
      nodes: "gate, foyer",
      check: "WITS d20 vs DC 14 · MIGHT d20 vs DC 16 (or the ledge)",
      file: "images/beat-castle.png",
      dice: [
        { kind: "d20", dice: [14], kept: 14, dropped: null, total: 14, stat: "wits", mod: 0, dc: 14, critSuccess: false, critFail: false },
        { kind: "d20", dice: [16], kept: 16, dropped: null, total: 16, stat: "might", mod: 0, dc: 16, critSuccess: false, critFail: false }
      ]
    },
    {
      title: "8. The Throne Room",
      nodes: "ledger, throne → fight_count",
      check: "WITS d20 vs DC 12 · SPIRIT d20 vs DC 13/11 · WITS d20 vs DC 15/16, then Count Merlin (AC 14)",
      file: "images/beat-throne.png",
      dice: [
        { kind: "d20", dice: [12], kept: 12, dropped: null, total: 12, stat: "wits", mod: 0, dc: 12, critSuccess: false, critFail: false },
        { kind: "d20", dice: [13], kept: 13, dropped: null, total: 13, stat: "spirit", mod: 0, dc: 13, critSuccess: false, critFail: false },
        { kind: "d20", dice: [11], kept: 11, dropped: null, total: 11, stat: "spirit", mod: 0, dc: 11, critSuccess: false, critFail: false },
        { kind: "d20", dice: [15], kept: 15, dropped: null, total: 15, stat: "wits", mod: 0, dc: 15, critSuccess: false, critFail: false },
        { kind: "d20", dice: [16], kept: 16, dropped: null, total: 16, stat: "wits", mod: 0, dc: 16, critSuccess: false, critFail: false }
      ]
    }
  ];

  var PHASES = [
    {
      id: "v1.0",
      name: "shipped",
      status: "done",
      items: [
        { id: "0.1", name: "Scene-graph engine", status: "done" },
        { id: "0.2", name: "d20 core", status: "done" },
        { id: "0.3", name: "3 pregens", status: "done" },
        { id: "0.4", name: "22-node scene graph", status: "done" },
        { id: "0.5", name: "Economy", status: "done" },
        { id: "0.6", name: "Combat", status: "done", special: "2d6" },
        { id: "0.7", name: "Persistence", status: "done" },
        { id: "0.8", name: "QA", status: "done" }
      ]
    },
    {
      id: "v1.1",
      name: "Make the night land",
      status: "done",
      items: [
        { id: "1.1", name: "A die you can see", status: "done" },
        { id: "1.2", name: "Character portraits", status: "done" },
        { id: "1.3", name: "The Count's Epitaph Card", status: "done" },
        { id: "1.4", name: "Fates Ledger", status: "done" },
        { id: "1.5", name: "He Remembers You", status: "done" },
        { id: "1.6", name: "Call Him a Wizard", status: "done" },
        { id: "1.7", name: "Visual roadmap page", status: "done" },
        { id: "1.8", name: "The Daily Curse", status: "done" },
        { id: "1.9", name: "The Count reviews your visit", status: "done" },
        { id: "1.10", name: "Tombstone line, as specified", status: "done" },
        { id: "1.11", name: "Oswald's guest book + checkpoint", status: "done" },
        { id: "1.12", name: "Portraits must be prominent", status: "done" }
      ]
    },
    {
      id: "v2.0",
      name: "ORONATH engine",
      status: "done",
      items: [
        { id: "2.1", name: "Core dice engine", status: "done", special: "d10" },
        { id: "2.2", name: "Arc schema + validator", status: "done" },
        { id: "2.3", name: "Character system", status: "done" },
        { id: "2.4", name: "Gameplay loop / UI", status: "done" },
        { id: "2.5", name: "Persistence", status: "done" },
        { id: "2.6", name: "Arc pre-generation", status: "done" },
        { id: "2.7", name: "Deployment", status: "done" },
        { id: "2.8", name: "First arc: Oronath", status: "done" }
      ]
    }
  ];

  function statusLabel(s) {
    if (s === "done") return "done";
    if (s === "in progress") return "in progress";
    return "not started";
  }

  function badgeRolls(item) {
    if (item.special === "2d6") {
      return [
        {
          kind: "d6",
          dice: [6, 6],
          kept: null,
          dropped: null,
          total: 12,
          stat: null,
          mod: 0,
          dc: null,
          critSuccess: false,
          critFail: false
        }
      ];
    }
    if (item.special === "d10") {
      return [
        {
          kind: "d10",
          dice: [10],
          kept: 10,
          dropped: null,
          total: 10,
          stat: null,
          mod: 0,
          dc: null,
          critSuccess: false,
          critFail: false
        }
      ];
    }
    if (item.status === "done") {
      return [
        {
          kind: "d20",
          dice: [20],
          kept: 20,
          dropped: null,
          total: 20,
          stat: null,
          mod: 0,
          dc: null,
          critSuccess: true,
          critFail: false
        }
      ];
    }
    if (item.status === "in progress") {
      return [
        {
          kind: "d20",
          dice: [11],
          kept: 11,
          dropped: null,
          total: 11,
          stat: null,
          mod: 0,
          dc: null,
          critSuccess: false,
          critFail: false
        }
      ];
    }
    return [
      {
        kind: "d6",
        dice: [1],
        kept: 1,
        dropped: null,
        total: 1,
        stat: null,
        mod: 0,
        dc: null,
        critSuccess: false,
        critFail: false
      }
    ];
  }

  function mountArt(frame, src, title) {
    var caption = document.createElement("div");
    caption.className = "beat-placeholder";
    var t = document.createElement("strong");
    t.textContent = title;
    var p = document.createElement("p");
    p.textContent = "Painting not in the satchel.";
    caption.appendChild(t);
    caption.appendChild(p);
    frame.appendChild(caption);
    if (!src) return;
    var img = new Image();
    img.alt = "";
    img.className = "beat-img";
    img.onload = function () {
      while (frame.firstChild) frame.removeChild(frame.firstChild);
      frame.appendChild(img);
    };
    img.onerror = function () {
      /* leave captioned placeholder */
    };
    img.src = src;
  }

  function renderBeats() {
    var host = document.getElementById("beat-cards");
    if (!host || !window.MerlinDice) return;
    var reduced = window.MerlinDice.prefersReduced();

    BEATS.forEach(function (beat) {
      var card = document.createElement("article");
      card.className = "beat-card panel";

      var frame = document.createElement("div");
      frame.className = "beat-frame";
      mountArt(frame, beat.file, beat.title);
      card.appendChild(frame);

      var body = document.createElement("div");
      body.className = "beat-body";

      var h = document.createElement("h3");
      h.className = "beat-title";
      h.textContent = beat.title;
      body.appendChild(h);

      var nodes = document.createElement("p");
      nodes.className = "beat-nodes muted";
      nodes.textContent = beat.nodes;
      body.appendChild(nodes);

      var check = document.createElement("p");
      check.className = "beat-check";
      check.textContent = beat.check;
      body.appendChild(check);

      if (beat.dice && beat.dice.length) {
        var dieHost = document.createElement("div");
        dieHost.className = "beat-die";
        body.appendChild(dieHost);
        window.MerlinDice.mount(dieHost, beat.dice, {
          size: "card",
          animate: !reduced
        });
      }

      card.appendChild(body);
      host.appendChild(card);
    });
  }

  function renderMilestones() {
    var host = document.getElementById("milestones");
    if (!host || !window.MerlinDice) return;
    var reduced = window.MerlinDice.prefersReduced();

    PHASES.forEach(function (phase) {
      var block = document.createElement("div");
      block.className = "phase-block";

      var phaseChip = document.createElement("div");
      phaseChip.className = "mile-chip phase-chip status-" + phase.status.replace(/\s+/g, "-");
      var phaseDie = document.createElement("div");
      phaseDie.className = "mile-die";
      phaseChip.appendChild(phaseDie);
      var phaseLabel = document.createElement("span");
      phaseLabel.textContent =
        phase.id + " · " + phase.name + " · " + statusLabel(phase.status);
      phaseChip.appendChild(phaseLabel);
      block.appendChild(phaseChip);
      window.MerlinDice.mount(phaseDie, badgeRolls(phase), {
        size: "chip",
        animate: !reduced
      });

      var list = document.createElement("div");
      list.className = "mile-list";
      phase.items.forEach(function (item) {
        var chip = document.createElement("div");
        chip.className =
          "mile-chip status-" + item.status.replace(/\s+/g, "-");
        if (item.status === "not started") chip.className += " is-dim";
        var die = document.createElement("div");
        die.className = "mile-die";
        chip.appendChild(die);
        var lab = document.createElement("span");
        lab.textContent =
          item.id + " · " + item.name + " · " + statusLabel(item.status);
        chip.appendChild(lab);
        list.appendChild(chip);
        window.MerlinDice.mount(die, badgeRolls(item), {
          size: "chip",
          animate: !reduced
        });
      });
      block.appendChild(list);
      host.appendChild(block);
    });
  }

  function boot() {
    renderBeats();
    renderMilestones();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
