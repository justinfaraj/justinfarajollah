// Contact page only: on desktop, "sms:" links usually do nothing, so offer a
// copy-number button instead. Phones get the sms: button via CSS.
(function () {
  var btn = document.getElementById('copy-phone');
  if (!btn || !navigator.clipboard) return;

  btn.hidden = false;
  btn.addEventListener('click', function () {
    navigator.clipboard.writeText(btn.dataset.copy).then(function () {
      var label = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = label; }, 1800);
    });
  });
})();

// Vertical edge label (see styles.css): shows the name of the section that is
// crossing the middle of the screen, and splits its colour at the exact pixel
// where a navy band begins, so it is never unreadable.
(function () {
  var label = document.getElementById('section-label');
  var sections = document.querySelectorAll('[data-label]');
  if (!label) return;

  var texts = label.querySelectorAll('.vertical-label-text');
  var inkLayer = label.querySelector('.vertical-label-ink');
  var whiteLayer = label.querySelector('.vertical-label-white');
  var darkBands = document.querySelectorAll('.section-ink');

  function clipTo(layer, top, bottom) {
    layer.style.clipPath = 'inset(' + top + 'px 0 ' + bottom + 'px 0)';
  }

  function update() {
    var rect = label.getBoundingClientRect();
    var height = rect.height;
    if (!height) return;

    var darkTop = null, darkBottom = null;
    darkBands.forEach(function (band) {
      var b = band.getBoundingClientRect();
      var top = Math.max(rect.top, b.top);
      var bottom = Math.min(rect.bottom, b.bottom);
      if (bottom <= top) return;
      darkTop = darkTop === null ? top : Math.min(darkTop, top);
      darkBottom = darkBottom === null ? bottom : Math.max(darkBottom, bottom);
    });

    if (darkTop === null) {            // entirely over a light band
      clipTo(whiteLayer, height / 2, height / 2);
      clipTo(inkLayer, 0, 0);
      return;
    }

    var insetTop = darkTop - rect.top;
    var insetBottom = rect.bottom - darkBottom;
    clipTo(whiteLayer, insetTop, insetBottom);
    if (insetTop >= insetBottom) {
      clipTo(inkLayer, 0, height - insetTop);
    } else {
      clipTo(inkLayer, height - insetBottom, 0);
    }
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; update(); });
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  if (sections.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        // a longer word changes the label's height, so remeasure with the swap
        texts.forEach(function (n) { n.textContent = entry.target.dataset.label; });
        update();
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    sections.forEach(function (s) { observer.observe(s); });
  }

  update();
})();

// Home page: the large hero name rearranges onto one line and docks into the
// top bar as you scroll (see styles.css). On desktop it lands where the small nav
// name is; on phones it becomes the bar, two thirds of its width, centred.
//
// Smoothness: scrolling happens on the browser's compositor thread, so any
// animation driven from JavaScript scroll events is always a frame or more behind
// it, which shows up as lag on phones. So the motion is NOT driven from JS:
//   Engine A (scroll-driven animations): the path is measured once and handed to
//     the browser as keyframes tied to the scroll position. It then runs entirely
//     on the compositor, in lock-step with the scrolling, with no JS per frame.
//   Engine B (browsers without that feature): scrolling past a small threshold
//     plays a short timed animation to the docked state, and scrolling back to the
//     top plays it in reverse. It is not scrubbed, but it cannot lag.
// Only transforms and opacity are ever animated; font sizes never are. Above the
// top of the page (rubber-band overscroll) the name stays put.
(function () {
  var float = document.getElementById('name-float');
  var h1 = document.getElementById('hero-name');
  var brand = document.querySelector('.nav-brand');
  var navBg = document.querySelector('.nav-bg');
  if (!float || !h1 || !brand) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  var words = float.querySelectorAll('.nf-word');
  var spans = h1.querySelectorAll('.nm');
  var brandText = brand.firstChild;
  var ends = [[0, 6], [7, 17]];                 // "Justin" and "Farajollah" in "Justin Farajollah"
  var phone = window.matchMedia('(max-width: 860px)');
  var scrollDriven = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'));
  var geo = null;
  var lastWidth = window.innerWidth;
  var keyframeSheet = null;
  var docked = false;                            // Engine B state
  var dockTimer = 0;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
  function smooth(v) { return v * v * (3 - 2 * v); }       // smoothstep
  function r2(v) { return Math.round(v * 100) / 100; }

  function textRect(node, a, b) {
    var r = document.createRange();
    r.setStart(node, a);
    r.setEnd(node, b);
    return r.getBoundingClientRect();
  }

  // Phones: the docked name is two thirds of the width of the bar (centred by CSS).
  function fitBrandToBar() {
    brand.style.fontSize = '';
    if (!phone.matches) return;
    var bar = brand.parentNode;
    var avail = bar.clientWidth * 2 / 3;
    var natural = textRect(brandText, 0, brandText.length).width;
    var size = parseFloat(getComputedStyle(brand).fontSize) * avail / natural;
    // capped so the bar stays slim on wide phones (landscape) and tablets
    size = Math.min(size, 56);
    brand.style.fontSize = Math.floor(size * 10) / 10 + 'px';
  }

  // Everything is measured once; none of this runs while scrolling.
  function measure() {
    fitBrandToBar();
    var sy = window.scrollY;
    var f1 = parseFloat(getComputedStyle(brand).fontSize);
    var next = { words: [], D: 0 };
    root.classList.add('dock-measuring');        // switches the overlay's motion off while it is measured
    for (var i = 0; i < words.length; i++) {
      var cs = getComputedStyle(spans[i]);
      var f0 = parseFloat(cs.fontSize);
      // the overlay word is drawn at the hero size and only ever scaled down
      words[i].style.fontSize = f0 + 'px';
      words[i].style.letterSpacing = cs.letterSpacing;
      var ink = textRect(words[i].firstChild, 0, words[i].textContent.length);   // text box inside its element
      var s = textRect(spans[i].firstChild, 0, spans[i].textContent.length);     // where it starts (hero)
      var f = textRect(brandText, ends[i][0], ends[i][1]);                       // where it ends (bar)
      next.words.push({
        sx: s.left, sy: s.top + sy,       // start: left in viewport, top in document
        fx: f.left, fy: f.top,            // end: viewport (the bar is pinned)
        k: f1 / f0,                       // final scale
        ox: ink.left, oy: ink.top
      });
    }
    root.classList.remove('dock-measuring');
    // on one line, "Farajollah" starts this far right of "Justin" (in hero-size units)
    next.words[1].adj = (next.words[1].fx - next.words[0].fx) / next.words[1].k;
    // how far you scroll while the name travels; a short hero still gets a gentle animation
    next.D = Math.max(phone.matches ? 120 : 60, next.words[0].sy - next.words[0].fy);
    geo = next;
  }

  // Where both words are at progress p (0 = in the hero, 1 = docked in the bar).
  function pose(p) {
    var e = smooth(p);
    var y = p * geo.D;                           // scroll position this progress stands for
    var out = [];
    var firstLeft = 0;
    for (var i = 0; i < words.length; i++) {
      var g = geo.words[i];
      var sc = 1 + (g.k - 1) * e;
      // "Farajollah" slides right first, along its own line, aiming for the spot
      // just after wherever "Justin" currently ends (at the current size), and
      // only then rises up beside it, so the two words never pass through each other
      var ex = i === 1 ? smooth(clamp01(p / 0.55)) : e;
      var ey = i === 1 ? smooth(clamp01((p - 0.25) / 0.75)) : e;
      var left = i === 1 ? lerp(g.sx, firstLeft + sc * g.adj, ex) : lerp(g.sx, g.fx, ex);
      if (i === 0) firstLeft = left;
      var x = left - sc * g.ox;
      var t = lerp(g.sy - y, g.fy, ey) - sc * g.oy;
      out.push('translate3d(' + r2(x) + 'px,' + r2(t) + 'px,0) scale(' + Math.round(sc * 10000) / 10000 + ')');
    }
    return out;
  }

  // ---- Engine A: scroll-driven animations (compositor, no JS while scrolling) ----
  function buildScrollDriven() {
    var N = 40;
    var rows = [];
    for (var j = 0; j <= N; j++) rows.push(pose(j / N));
    if (!keyframeSheet) {
      var st = document.createElement('style');
      st.id = 'dock-keyframes';
      document.head.appendChild(st);
      keyframeSheet = st.sheet;
    }
    while (keyframeSheet.cssRules.length) keyframeSheet.deleteRule(0);
    for (var i = 0; i < words.length; i++) {
      var body = '';
      for (var k = 0; k <= N; k++) body += r2(k * 100 / N) + '%{transform:' + rows[k][i] + '}';
      keyframeSheet.insertRule('@keyframes dock-w' + i + '{' + body + '}', keyframeSheet.cssRules.length);
    }
    root.style.setProperty('--dock-d', geo.D + 'px');
    root.classList.add('sd');
  }

  // ---- Engine B: timed animation triggered by scrolling past a threshold ----
  function setDocked(on, instant) {
    docked = on;
    clearTimeout(dockTimer);
    root.classList.toggle('td-instant', !!instant);
    var pz = pose(on ? 1 : 0);
    for (var i = 0; i < words.length; i++) words[i].style.transform = pz[i];
    if (navBg) navBg.style.opacity = on ? 1 : 0;
    if (on) {
      if (instant) root.classList.add('name-docked');
      else dockTimer = setTimeout(function () { root.classList.add('name-docked'); }, 520);   // real nav text takes over once it has landed
    } else {
      root.classList.remove('name-docked');
    }
    if (instant) { void float.offsetWidth; root.classList.remove('td-instant'); }
  }

  function setupTriggered() {
    root.classList.add('td');
    setDocked(window.scrollY > 10, true);
    window.addEventListener('scroll', function () {
      var y = window.scrollY;                    // negative while rubber-banding above the top: counts as "at the top"
      if (!docked && y > 10) setDocked(true, false);
      else if (docked && y < 2) setDocked(false, false);
    }, { passive: true });
  }

  function init() {
    // show the overlay first: a display:none element has no boxes to measure
    root.classList.add('name-morph');
    measure();
    if (scrollDriven) buildScrollDriven();
    else setupTriggered();
  }

  window.addEventListener('resize', function () {
    // phone browsers fire resize whenever the address bar shows or hides; only a
    // real change of width (rotation, window resize) needs a re-measure
    if (window.innerWidth === lastWidth || !geo) return;
    lastWidth = window.innerWidth;
    measure();
    if (scrollDriven) buildScrollDriven();
    else setDocked(docked, true);
  });

  // measure only once the web fonts are in, since they change every width
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
  } else {
    window.addEventListener('load', init);
  }
})();

// Home page: content below the hero rises gently into place the first time it
// scrolls into view (see "ENTRANCE MOTION" in styles.css). Items in a group
// (service cards, steps) follow each other by a beat. Nothing is hidden unless
// html.anim is set, which already means JS is on and reduced motion is off.
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('anim') || !document.body.classList.contains('home')) return;

  var groups = [
    '.about > *',
    '.section-heading-center, .section-lede',
    '.service-card',
    '.step',
    '.steps-cta, .carousel',
    '.cta-heading, .cta-section .btn'
  ];
  var items = [];
  groups.forEach(function (sel) {
    var parents = new Map();
    document.querySelectorAll(sel).forEach(function (el) {
      // stagger only among siblings, so each section starts its own count
      var n = parents.get(el.parentNode) || 0;
      parents.set(el.parentNode, n + 1);
      el.style.setProperty('--d', Math.min(n, 5) * 0.06 + 's');
      el.classList.add('reveal');
      items.push(el);
    });
  });

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  items.forEach(function (el) { io.observe(el); });
})();

// Home page, "How it works": the steps lean toward the mouse, and the line
// joining them behaves like a string. Experimental; to remove it, delete this
// whole block and the .steps-wrap div + svg in index.html (the plain CSS line
// comes back by itself).
//
// What keeps it from feeling cheap:
//   - Small. The number circle travels at most ~12px; nothing ever jumps.
//   - Depth. Each step moves as three layers: the circle the most, the title
//     less, the paragraph least, so it reads as a soft lean, not a block sliding.
//   - Distance shaping. The pull grows from zero right under the cursor (no
//     snapping when you cross a step), is strongest a short way off, and fades
//     with distance, so the nearest step reacts most and the others follow.
//   - A spring, not an easing curve. Every frame chases the target with a
//     slightly under-damped spring, so it trails the mouse, never stops dead,
//     and settles back with the smallest overshoot when the mouse leaves.
//   - Mouse only, motion allowed only, and the loop sleeps once settled.
(function () {
  var root = document.documentElement;
  var section = document.getElementById('process');
  var list = section && section.querySelector('.steps');
  if (!list || !root.classList.contains('anim')) return;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  var MAX = 12;          // px, the most the circle moves
  var REACH = 300;       // px, the distance at which the pull is strongest
  var STIFFNESS = 170;   // spring: higher follows more tightly
  var DAMPING = 19;      // spring: lower wobbles more (≈0.73 of critical)
  var LAYERS = [['.step-num', 1], ['h3', 0.55], ['p', 0.3]];

  // The line between the circles is a string, simulated as a chain of points
  // pinned to the circle centres. Each point is pulled toward its neighbours
  // (the wave equation), so when a circle moves the string doesn't just redraw
  // straight: the middle lags, bends and ripples back into line. The cursor
  // also bows it gently, and sweeping the mouse across it plucks it.
  var SEGS = 14;            // links per span
  var TENSION = 4200;       // tighter and faster with more (≈2.5 wobbles a second)
  var STRING_DAMPING = 2.7; // rings longer with less (a pluck fades in about a second)
  var STIFF_DAMPING = 7;    // internal friction: kills small ripples fast, so the
                            // string always moves in smooth arcs, never squiggles
  var STRING_PULL = 70;     // how far the cursor bows the string toward itself
  var PLUCK = 0.3;          // share of the mouse's speed handed to the string
  var PLUCK_MAX = 260;      // px/s, so a flick can never throw it wildly
  var PLUCK_WIDTH = 64;     // px, how much of the string a pluck catches
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var svg = section.querySelector('.steps-string');

  var steps = Array.prototype.map.call(list.querySelectorAll('.step'), function (li) {
    return {
      li: li,
      anchor: li.querySelector('.step-num'),
      parts: LAYERS.map(function (l) { return { el: li.querySelector(l[0]), depth: l[1] }; })
        .filter(function (p) { return p.el; }),
      x: 0, y: 0, vx: 0, vy: 0
    };
  });

  var spans = [];
  if (svg) {
    for (var n = 0; n < steps.length - 1; n++) {
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('pathLength', '1');      // lets CSS draw it across at any length
      svg.appendChild(path);
      spans.push({ path: path, a: steps[n], b: steps[n + 1], pts: null, side: null });
    }
    svg.parentNode.classList.add('is-strung');
  }

  var mouse = null;      // last pointer position (viewport), null when outside
  var mouseV = 0;        // vertical mouse speed, px/s, for plucking
  var lastMove = 0;
  var raf = 0;
  var last = 0;
  var aliveUntil = 0;    // keep animating at least until then (entrance rise)
  var reset = true;      // re-lay the strings straight (first frame, resize)

  // pull vector for a cursor offset (dx, dy): linear near zero, peaks at REACH,
  // then falls off, i.e. offset * 2*MAX/REACH / (1 + (d/REACH)^2)
  function pull(dx, dy) {
    var u2 = (dx * dx + dy * dy) / (REACH * REACH);
    var k = (2 * MAX / REACH) / (1 + u2);
    return [dx * k, dy * k];
  }

  function write(s) {
    var still = Math.abs(s.x) < 0.01 && Math.abs(s.y) < 0.01;
    s.parts.forEach(function (p) {
      p.el.style.transform = still ? '' :
        'translate(' + (s.x * p.depth).toFixed(2) + 'px,' + (s.y * p.depth).toFixed(2) + 'px)';
    });
  }

  // smooth curve through the points (Catmull-Rom as cubic Béziers)
  function curve(p) {
    var d = 'M' + p[0].x.toFixed(2) + ' ' + p[0].y.toFixed(2);
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
      d += 'C' + (p1.x + (p2.x - p0.x) / 6).toFixed(2) + ' ' + (p1.y + (p2.y - p0.y) / 6).toFixed(2) +
           ' ' + (p2.x - (p3.x - p1.x) / 6).toFixed(2) + ' ' + (p2.y - (p3.y - p1.y) / 6).toFixed(2) +
           ' ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
    }
    return d;
  }

  // one span of string for one frame; returns true while it is still moving
  function stepString(sp, dt, mx, my) {
    var A = sp.a.pos, B = sp.b.pos, RA = sp.a.rest, RB = sp.b.rest;
    var p = sp.pts, i;
    if (!p || reset) {
      p = sp.pts = [];
      for (i = 0; i <= SEGS; i++) {
        p.push({ x: A.x + (B.x - A.x) * i / SEGS, y: A.y + (B.y - A.y) * i / SEGS, vx: 0, vy: 0, fx: 0, fy: 0 });
      }
    }

    // the cursor's steady pull on each point, measured from where the string rests
    for (i = 1; i < SEGS; i++) {
      p[i].fx = p[i].fy = 0;
      if (mx === null) continue;
      var t = pull(mx - (RA.x + (RB.x - RA.x) * i / SEGS), my - (RA.y + (RB.y - RA.y) * i / SEGS));
      p[i].fx = t[0] * STRING_PULL;
      p[i].fy = t[1] * STRING_PULL;
    }

    // pluck: the mouse crossed the string between two frames
    if (mx !== null && mx > A.x && mx < B.x) {
      var k = Math.min(SEGS - 1, Math.floor((mx - A.x) / (B.x - A.x) * SEGS));
      var f = (mx - p[k].x) / ((p[k + 1].x - p[k].x) || 1);
      var gap = my - (p[k].y + (p[k + 1].y - p[k].y) * f);
      var side = gap > 0 ? 1 : -1;
      if (sp.side !== null && side !== sp.side && Math.abs(gap) < 40) {
        var kick = Math.max(-PLUCK_MAX, Math.min(PLUCK_MAX, mouseV * PLUCK));
        for (i = 1; i < SEGS; i++) {
          var dx = p[i].x - mx;
          p[i].vy += kick * Math.exp(-dx * dx / (2 * PLUCK_WIDTH * PLUCK_WIDTH));
        }
      }
      sp.side = side;
    } else {
      sp.side = null;
    }

    // integrate in small sub-steps so the stiff string stays stable
    var subs = Math.ceil(dt / 0.004), h = dt / subs, moving = false;
    for (var s = 0; s < subs; s++) {
      p[0].x = A.x; p[0].y = A.y;
      p[SEGS].x = B.x; p[SEGS].y = B.y;
      p[0].vx = p[0].vy = p[SEGS].vx = p[SEGS].vy = 0;
      for (i = 1; i < SEGS; i++) {
        var q = p[i], l = p[i - 1], r = p[i + 1];
        q.ax = TENSION * (l.x - 2 * q.x + r.x) + q.fx - STRING_DAMPING * q.vx +
               STIFF_DAMPING * (l.vx - 2 * q.vx + r.vx);
        q.ay = TENSION * (l.y - 2 * q.y + r.y) + q.fy - STRING_DAMPING * q.vy +
               STIFF_DAMPING * (l.vy - 2 * q.vy + r.vy);
      }
      for (i = 1; i < SEGS; i++) {
        p[i].vx += p[i].ax * h; p[i].vy += p[i].ay * h;
        p[i].x += p[i].vx * h; p[i].y += p[i].vy * h;
      }
    }
    for (i = 1; i < SEGS; i++) {
      if (Math.abs(p[i].vx) > 0.4 || Math.abs(p[i].vy) > 0.4 ||
          Math.abs(p[i].ax) > 4 || Math.abs(p[i].ay) > 4) { moving = true; break; }
    }
    sp.path.setAttribute('d', curve(p));
    return moving;
  }

  function frame(now) {
    var dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    if (now - lastMove > 60) mouseV = 0;         // a resting mouse plucks nothing
    var moving = now < aliveUntil;
    var o = svg ? svg.getBoundingClientRect() : { left: 0, top: 0 };
    var mx = mouse ? mouse[0] - o.left : null;   // cursor in the string's coordinates
    var my = mouse ? mouse[1] - o.top : null;

    steps.forEach(function (s) {
      // the circle's centre as drawn, and its resting centre (minus what we added)
      var r = s.anchor.getBoundingClientRect();
      var cx = r.left + r.width / 2 - o.left, cy = r.top + r.height / 2 - o.top;
      s.rest = { x: cx - s.x, y: cy - s.y };
      var tx = 0, ty = 0;
      if (mouse) {
        var t = pull(mx - s.rest.x, my - s.rest.y);
        tx = t[0]; ty = t[1];
      }
      s.vx += (STIFFNESS * (tx - s.x) - DAMPING * s.vx) * dt;
      s.vy += (STIFFNESS * (ty - s.y) - DAMPING * s.vy) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (Math.abs(tx - s.x) > 0.02 || Math.abs(ty - s.y) > 0.02 ||
          Math.abs(s.vx) > 0.02 || Math.abs(s.vy) > 0.02) moving = true;
      else if (!mouse) { s.x = s.y = s.vx = s.vy = 0; }
      write(s);
      s.pos = { x: s.rest.x + s.x, y: s.rest.y + s.y };
    });

    spans.forEach(function (sp) {
      if (stepString(sp, dt, mx, my)) moving = true;
    });
    reset = false;

    if (moving) raf = requestAnimationFrame(frame);
    else { raf = 0; list.classList.remove('is-pulling'); }
  }

  function wake() {
    if (raf) return;
    list.classList.add('is-pulling');
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  section.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !finePointer.matches) return;
    var now = performance.now();
    if (mouse && now > lastMove) {
      // smoothed vertical speed, so one jittery event can't fling the string
      var v = (e.clientY - mouse[1]) / ((now - lastMove) / 1000);
      mouseV = mouseV * 0.4 + v * 0.6;
    }
    lastMove = now;
    mouse = [e.clientX, e.clientY];
    wake();
  });
  section.addEventListener('pointerleave', function () {
    if (!mouse) return;
    mouse = null;
    wake();
  });
  // the page can scroll under a resting mouse; the targets move with it
  window.addEventListener('scroll', function () { if (mouse) wake(); }, { passive: true });
  window.addEventListener('resize', function () { reset = true; wake(); });

  // Entrance: a span draws itself across once both of its circles are in, and
  // the strings keep simulating while the steps rise, so they get carried up
  // with them instead of snapping into place afterwards.
  function revealed() {
    spans.forEach(function (sp) {
      if (sp.b.li.classList.contains('in') && sp.a.li.classList.contains('in')) sp.path.classList.add('on');
    });
    aliveUntil = performance.now() + 1600;
    wake();
  }
  if (spans.length && 'MutationObserver' in window) {
    var mo = new MutationObserver(revealed);
    steps.forEach(function (s) { mo.observe(s.li, { attributes: true, attributeFilter: ['class'] }); });
  }
  revealed();
})();

// Recent work carousel (see styles.css). One project is in the foreground, its
// neighbours sit behind it on either side. The list is not circular: when
// there would be two cards on one side, only the nearest is shown and the other
// is parked off the edge of the screen (data-pos -2 / 2).
(function () {
  var root = document.getElementById('work-carousel');
  if (!root) return;

  var cards = Array.prototype.slice.call(root.querySelectorAll('.work-card'));
  var prev = root.querySelector('.car-prev');
  var next = root.querySelector('.car-next');
  var status = root.querySelector('.car-status');
  var stage = root.querySelector('.car-stage');
  var active = 0;
  cards.forEach(function (c, i) { if (c.hasAttribute('aria-current')) active = i; });

  function render() {
    cards.forEach(function (card, i) {
      var pos = Math.max(-2, Math.min(2, i - active));
      var parked = Math.abs(pos) === 2;
      card.setAttribute('data-pos', pos);
      card.setAttribute('aria-hidden', parked ? 'true' : 'false');
      card.tabIndex = parked ? -1 : 0;
      if (i === active) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
    });
    prev.disabled = active === 0;
    next.disabled = active === cards.length - 1;
    status.textContent = 'Showing ' + cards[active].getAttribute('data-name') +
      ', project ' + (active + 1) + ' of ' + cards.length;
  }

  function go(to) {
    if (to < 0 || to > cards.length - 1 || to === active) return;
    active = to;
    render();
  }

  // a card behind the foreground comes forward; the foreground card is a
  // normal link and takes you to the site
  cards.forEach(function (card, i) {
    card.addEventListener('click', function (e) {
      if (i !== active) {
        e.preventDefault();
        go(i);
      }
    });
  });

  prev.addEventListener('click', function () { go(active - 1); });
  next.addEventListener('click', function () { go(active + 1); });

  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(active - 1); }
    else if (e.key === 'ArrowRight') { go(active + 1); }
  });

  // swipe on touch screens
  var startX = null;
  stage.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? active + 1 : active - 1);
  }, { passive: true });

  // pause the drifting while the carousel is off screen: saves battery and keeps
  // scrolling smooth on the rest of the page
  root.classList.add('is-offscreen');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { root.classList.toggle('is-offscreen', !entry.isIntersecting); });
    }, { rootMargin: '120px 0px' }).observe(root);
  } else {
    root.classList.remove('is-offscreen');
  }

  render();
})();
