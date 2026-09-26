/* MERLIN — shared polyhedral die view. Pure DOM/SVG. No engine, no network. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function prefersReduced() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function el(tag, attrs, kids) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, attrs[k]);
      });
    }
    if (kids) {
      for (var i = 0; i < kids.length; i++) {
        if (kids[i]) node.appendChild(kids[i]);
      }
    }
    return node;
  }

  function textNode(x, y, value, size) {
    var t = el("text", {
      x: String(x),
      y: String(y),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": String(size),
      fill: "#140c0a",
      class: "mdie-num"
    });
    t.appendChild(document.createTextNode(String(value)));
    return t;
  }

  function banner(x, y, label, kind) {
    var g = el("g", { class: "mdie-banner mdie-banner--" + kind });
    var t = el("text", {
      x: String(x),
      y: String(y),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": "11",
      "letter-spacing": "0.12em",
      fill: kind === "crit" ? "#e8b86d" : "#c43a3a",
      class: "mdie-banner-text"
    });
    t.appendChild(document.createTextNode(label));
    g.appendChild(t);
    return g;
  }

  function svgShell(viewBox, className, kids) {
    return el(
      "svg",
      {
        viewBox: viewBox,
        class: className,
        role: "img",
        "aria-hidden": "true"
      },
      kids
    );
  }

  function drawD20(face, flags) {
    var kids = [
      el("path", {
        d: "M60,6 L110,36 L110,96 L60,126 L10,96 L10,36 Z",
        fill: "#1a100c",
        stroke: "#b8924a",
        "stroke-width": "2"
      }),
      el("path", {
        d: "M60,6 L60,126 M10,36 L110,96 M110,36 L10,96",
        fill: "none",
        stroke: "#b8924a",
        "stroke-width": "1.25"
      }),
      el("path", {
        d: "M60,28 L100,78 L20,78 Z",
        fill: "#e8d4b0",
        stroke: "#b8924a",
        "stroke-width": "1.25"
      }),
      textNode(60, 64, face, 26)
    ];
    if (flags && flags.critSuccess) kids.push(banner(60, 98, "CRIT", "crit"));
    if (flags && flags.critFail) kids.push(banner(60, 98, "NAT 1", "fail"));
    return svgShell("0 0 120 132", "mdie mdie-d20", kids);
  }

  function drawD10(face) {
    return svgShell("0 0 100 120", "mdie mdie-d10", [
      el("path", {
        d: "M50,4 L96,38 L78,108 L22,108 L4,38 Z",
        fill: "#1a100c",
        stroke: "#b8924a",
        "stroke-width": "2"
      }),
      el("path", {
        d: "M50,4 L50,108 M4,38 L96,38 M22,108 L50,46 L78,108",
        fill: "none",
        stroke: "#b8924a",
        "stroke-width": "1.25"
      }),
      el("path", {
        d: "M50,18 L84,52 L50,70 L16,52 Z",
        fill: "#e8d4b0",
        stroke: "#b8924a",
        "stroke-width": "1.25"
      }),
      textNode(50, 48, face, 24)
    ]);
  }

  function drawD6(face) {
    return svgShell("0 0 100 110", "mdie mdie-d6", [
      el("path", {
        d: "M50,8 L90,28 L50,48 L10,28 Z",
        fill: "#e8d4b0",
        stroke: "#b8924a",
        "stroke-width": "1.5"
      }),
      el("path", {
        d: "M10,28 L50,48 L50,92 L10,72 Z",
        fill: "#c4a882",
        stroke: "#b8924a",
        "stroke-width": "1.5"
      }),
      el("path", {
        d: "M90,28 L50,48 L50,92 L90,72 Z",
        fill: "#8a7048",
        stroke: "#b8924a",
        "stroke-width": "1.5"
      }),
      textNode(50, 30, face, 18)
    ]);
  }

  function drawD4(face) {
    return svgShell("0 0 100 110", "mdie mdie-d4", [
      el("path", {
        d: "M50,8 L96,96 L4,96 Z",
        fill: "#e8d4b0",
        stroke: "#b8924a",
        "stroke-width": "2"
      }),
      textNode(50, 67, face, 22)
    ]);
  }

  function drawD8(face) {
    return svgShell("0 0 100 120", "mdie mdie-d8", [
      el("path", {
        d: "M50,4 L96,60 L50,116 L4,60 Z",
        fill: "#e8d4b0",
        stroke: "#b8924a",
        "stroke-width": "2"
      }),
      el("path", {
        d: "M4,60 L96,60 M50,4 L50,116",
        fill: "none",
        stroke: "#b8924a",
        "stroke-width": "1.25"
      }),
      textNode(50, 60, face, 22)
    ]);
  }

  function wrapDie(svg, extraClass) {
    var wrap = document.createElement("div");
    wrap.className = "mdie-wrap" + (extraClass ? " " + extraClass : "");
    wrap.appendChild(svg);
    return wrap;
  }

  function renderOne(roll) {
    var kind = roll.kind || "d20";
    var frag = document.createDocumentFragment();

    if (kind === "d20") {
      var dice = roll.dice || [roll.kept];
      var isAdv = dice.length === 2;
      if (!isAdv) {
        frag.appendChild(
          wrapDie(
            drawD20(dice[0], {
              critSuccess: !!roll.critSuccess,
              critFail: !!roll.critFail
            })
          )
        );
      } else {
        var kept = roll.kept;
        var keptIdx = 0;
        if (dice[0] !== kept && dice[1] === kept) keptIdx = 1;
        for (var i = 0; i < 2; i++) {
          var flags = null;
          if (i === keptIdx) {
            flags = {
              critSuccess: !!roll.critSuccess,
              critFail: !!roll.critFail
            };
          } else if (roll.critFail) {
            flags = { critFail: true };
          }
          var cls = i === keptIdx ? "is-kept" : "is-dropped";
          frag.appendChild(wrapDie(drawD20(dice[i], flags), cls));
        }
      }
      return frag;
    }

    if (kind === "d10") {
      frag.appendChild(wrapDie(drawD10((roll.dice && roll.dice[0]) || roll.kept)));
      return frag;
    }

    if (kind === "d4") {
      var d4s = roll.dice || [roll.kept];
      for (var a = 0; a < d4s.length; a++) {
        frag.appendChild(wrapDie(drawD4(d4s[a])));
      }
      if (d4s.length > 1) {
        var s4 = document.createElement("span");
        s4.className = "die-sum";
        s4.textContent =
          "total " + (roll.total != null ? roll.total : d4s[0] + d4s[1]);
        frag.appendChild(s4);
      }
      return frag;
    }

    if (kind === "d8") {
      var d8s = roll.dice || [roll.kept];
      for (var b = 0; b < d8s.length; b++) {
        frag.appendChild(wrapDie(drawD8(d8s[b])));
      }
      if (d8s.length > 1) {
        var s8 = document.createElement("span");
        s8.className = "die-sum";
        s8.textContent =
          "total " + (roll.total != null ? roll.total : d8s[0] + d8s[1]);
        frag.appendChild(s8);
      }
      return frag;
    }

    /* d6 / 2d6 */
    var faces = roll.dice || [roll.kept];
    for (var c = 0; c < faces.length; c++) {
      frag.appendChild(wrapDie(drawD6(faces[c])));
    }
    if (faces.length > 1) {
      var sum = document.createElement("span");
      sum.className = "die-sum";
      sum.textContent =
        "total " + (roll.total != null ? roll.total : faces[0] + faces[1]);
      frag.appendChild(sum);
    }
    return frag;
  }

  function mount(host, rolls, options) {
    options = options || {};
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);

    var list = rolls && rolls.length ? rolls : [];
    if (!list.length) return;

    var size = options.size || "stage";
    var animate =
      options.animate == null ? !prefersReduced() : !!options.animate;

    var row = document.createElement("div");
    row.className = "die-row die-row--" + size;
    if (animate) row.className += " is-tumbling";

    for (var i = 0; i < list.length; i++) {
      row.appendChild(renderOne(list[i]));
    }

    host.appendChild(row);

    if (animate) {
      window.setTimeout(function () {
        row.classList.remove("is-tumbling");
      }, 700);
    }
  }

  window.MerlinDice = {
    mount: mount,
    prefersReduced: prefersReduced
  };
})();
