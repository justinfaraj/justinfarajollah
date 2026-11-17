// Contact details. The phone number and the email address never appear in the
// HTML: both are put together from pieces here, and only when someone clicks.
// Phones get "Text me" (opens the text app with a message typed); desktops,
// where sms: usually does nothing, get the copy buttons instead (CSS picks
// which shows). "Email me" opens a draft with the subject and message filled
// in, and so does the footer's "Email me" link on every page.
(function () {
  var MESSAGE = "Hey Justin, I'm looking to build a site";                 // the text message
  var SUBJECT = 'Website Inquiry';                                         // the email's subject line
  // the email, laid out like an email: greeting, a blank line, then the message
  var EMAIL_BODY = "Hey Justin,\r\n\r\nI'm looking to build a site. Can we chat?";

  function number() { return ['+1', '516', '729', '4010'].join(''); }
  function address() { return ['hello', '@', 'justinfarajollah', '.com'].join(''); }

  function openText(e) {
    e.preventDefault();
    window.location.href = 'sms:' + number() + '?&body=' + encodeURIComponent(MESSAGE);
  }

  function openEmail(e) {
    e.preventDefault();
    window.location.href = 'mailto:' + address() + '?subject=' + encodeURIComponent(SUBJECT) +
      '&body=' + encodeURIComponent(EMAIL_BODY);
  }

  // A copy button stays hidden unless the browser can copy. The value goes to
  // the clipboard only, never into the page; the button says "Copied" for a moment.
  var status = document.getElementById('copy-status');      // unseen line that screen readers read out

  function copyButton(btn, value, what) {
    if (!btn || !navigator.clipboard) return;
    var label = btn.textContent;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(value()).then(function () {
        btn.textContent = 'Copied';
        if (status) status.textContent = what + ' copied';
        setTimeout(function () {
          btn.textContent = label;
          if (status) status.textContent = '';
        }, 1800);
      });
    });
  }

  var text = document.getElementById('text-me');
  if (text) text.addEventListener('click', openText);

  var email = document.getElementById('email-me');
  if (email) {
    email.hidden = false;
    email.addEventListener('click', openEmail);
  }

  copyButton(document.getElementById('copy-phone'), number, 'Number');
  copyButton(document.getElementById('copy-email'), address, 'Email address');

  // footer "Email me", all three pages. Without JS it is an ordinary link to
  // the contact page.
  Array.prototype.forEach.call(document.querySelectorAll('.footer-email'), function (link) {
    link.addEventListener('click', openEmail);
  });
})();

// Contact page: "Let's work together" (see styles.css). Clicking the headline,
// or the round button under it, fades the first view out and brings in the
// "Let's talk" panel. Ported from a 21st.dev React component: the numbers are
// the original's. All the motion is CSS; this block only switches two classes
// on the section and looks after focus and screen readers.
(function () {
  var CLICK_TO_SUCCESS_MS = 500;               // original: 500
  var EASE = 'cubic-bezier(.16,1,.3,1)';       // original: cubic-bezier(0.16, 1, 0.3, 1)

  var root = document.querySelector('.lw');
  if (!root) return;
  var head = root.querySelector('.lw-head');
  var trigger = document.getElementById('lw-trigger');
  var panel = document.getElementById('lw-panel');
  var talk = document.getElementById('lw-talk');
  var firstView = root.querySelectorAll('.lw-avail, .lw-head, .lw-bottom');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var clicked = false;

  root.style.setProperty('--lw-ease', EASE);

  // Until it is revealed the panel is invisible, so it is also kept out of the
  // tab order and away from screen readers. This is set here and not in the
  // HTML so that, with JS off, the panel is an ordinary working part of the page.
  panel.setAttribute('inert', '');
  panel.setAttribute('aria-hidden', 'true');

  function succeed() {
    root.classList.add('is-success');
    panel.removeAttribute('inert');
    panel.removeAttribute('aria-hidden');
    trigger.setAttribute('aria-expanded', 'true');
    talk.focus({ preventScroll: true });
  }

  // one listener covers a mouse click anywhere on the headline group and the
  // button itself (a key press on the button arrives here as a click too)
  head.addEventListener('click', function () {
    if (clicked) return;
    clicked = true;
    root.classList.add('is-clicked');
    // the first view is fading out: nothing in it may be tabbed to any more
    Array.prototype.forEach.call(firstView, function (el) { el.setAttribute('inert', ''); });
    // reduced motion is read at the moment of the click, so a change to the
    // setting is always respected: no wait, and CSS switches states instantly
    setTimeout(succeed, reduce.matches ? 0 : CLICK_TO_SUCCESS_MS);
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

  // (only touches the page when the value actually changes: this runs on every
  // scrolled frame, and almost every frame the answer is the same as the last)
  function clipTo(layer, top, bottom) {
    var value = 'inset(' + top + 'px 0 ' + bottom + 'px 0)';
    if (layer._clip === value) return;
    layer._clip = value;
    layer.style.clipPath = value;
  }

  // The side index (desktop navigation, see styles.css) rides on this block:
  // the same observer tells it which section is current, and the same scroll
  // handler turns it white while it sits over a navy band.
  var sideNav = document.querySelector('.side-nav');
  var sideLinks = sideNav ? sideNav.querySelectorAll('.side-link') : [];
  var tracksScroll = document.body.classList.contains('home');   // other pages have a fixed (or no) current item
  var SIDE_HREF = {            // a section's data-label -> the href of its item
    Home: '#home', About: '#about', Work: '#work',
    Services: '#services', Process: '#process', FAQ: '#faq'
  };

  // The closing band has no item of its own ("Contact" in the index is a link
  // to the contact page, not to that band), so over it nothing is marked.
  function setCurrent(name) {
    if (!tracksScroll) return;
    Array.prototype.forEach.call(sideLinks, function (link) {
      if (link.getAttribute('href') === SIDE_HREF[name]) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function updateSide() {
    if (!sideNav) return;
    var r = sideNav.getBoundingClientRect();
    if (!r.height) return;                     // hidden below the breakpoint
    var mid = r.top + r.height / 2;
    var onInk = false;
    darkBands.forEach(function (band) {
      var b = band.getBoundingClientRect();
      if (mid >= b.top && mid <= b.bottom) onInk = true;
    });
    sideNav.classList.toggle('on-ink', onInk);
  }

  function update() {
    updateSide();
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
        setCurrent(entry.target.dataset.label);
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
    '.steps-cta, .faq-list',
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

// Home page, "How it works", phones: one line threads the stacked steps and
// ends at the "Start with a chat" button. It leaves circle 1 to the right,
// runs down the right side of step 1's text, turns in to circle 2, leaves it
// to the left, runs down the left side of step 2's text, turns in to circle 3,
// leaves it to the right again and turns in to the button's right end. Every
// turn is a rounded corner.
// Scrolling is the only thing that draws it: the tip advances a fixed amount
// per pixel scrolled, and scrolling back up undraws it at the same rate.
// Desktop keeps the string above (styles.css shows each at its own widths).
// To remove it, delete this block and the .steps-trace svg in index.html.
(function () {
  var root = document.documentElement;
  var section = document.getElementById('process');
  var wrap = section && section.querySelector('.steps-wrap');
  var svg = wrap && wrap.querySelector('.steps-trace');
  if (!svg || !root.classList.contains('anim')) return;
  var steps = wrap.querySelectorAll('.step');
  if (steps.length !== 3) return;
  var phone = window.matchMedia('(max-width: 860px)');

  var GAP = 16;      // px between the widest text and the line
  var CORNER = 16;   // px, radius of every turn
  var START = 0.75;  // drawing starts when circle 1 is this far down the screen
  var END = 0.45;    // and is complete when the button is this far down

  var cta = section.querySelector('.steps-cta .btn');
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var paths = [];
  for (var n = 0; n < (cta ? 3 : 2); n++) {
    paths.push(svg.appendChild(document.createElementNS(SVG_NS, 'path')));
  }
  var geo = null;
  var lastWidth = window.innerWidth;
  var pending = false;

  function r2(v) { return Math.round(v * 100) / 100; }

  // circle centre and radius in .steps-wrap coordinates. Layout offsets, not
  // screen rects, so the steps' entrance rise doesn't throw the numbers off.
  function circle(li) {
    var n = li.querySelector('.step-num');
    return {
      x: li.offsetLeft + n.offsetLeft + n.offsetWidth / 2,
      y: li.offsetTop + n.offsetTop + n.offsetHeight / 2,
      r: n.offsetWidth / 2
    };
  }

  // an element's layout position in the page, ignoring transforms
  function place(el) {
    var x = 0, y = 0;
    for (; el; el = el.offsetParent) { x += el.offsetLeft; y += el.offsetTop; }
    return { x: x, y: y };
  }

  // the button's centre and half its width, also in .steps-wrap coordinates
  // (it sits outside .steps-wrap, so measured through the page)
  function button() {
    var b = place(cta), w = place(wrap);
    return {
      x: b.x - w.x + cta.offsetWidth / 2,
      y: b.y - w.y + cta.offsetHeight / 2,
      r: cta.offsetWidth / 2
    };
  }

  function measure() {
    geo = null;
    wrap.classList.toggle('is-traced', phone.matches);
    if (!phone.matches) return;

    var stops = Array.prototype.map.call(steps, circle);
    if (cta) stops.push(button());
    var a = stops[0];

    // the line runs just outside the widest line of text in any step, the
    // same distance out on both sides
    var box = wrap.getBoundingClientRect();
    var half = 0;
    Array.prototype.forEach.call(steps, function (li) {
      ['h3', 'p'].forEach(function (sel) {
        var el = li.querySelector(sel);
        if (!el) return;
        var rg = document.createRange();
        rg.selectNodeContents(el);
        var t = rg.getBoundingClientRect();
        half = Math.max(half, a.x - (t.left - box.left), (t.right - box.left) - a.x);
      });
    });
    var k = CORNER, q = Math.PI * k / 2;   // corner radius, a quarter turn's length
    var arc = ' ' + k + ' ' + k + ' 0 0 ';
    var lengths = [], total = 0;

    // one path per hop, alternating sides: right (turning clockwise), then
    // left (anticlockwise), then right again
    paths.forEach(function (path, i) {
      var from = stops[i], to = stops[i + 1];
      var s = i % 2 ? -1 : 1;                       // +1 right side, -1 left side
      var x = a.x + s * (half + GAP);               // the side the line runs down
      var x0 = from.x + s * from.r, x1 = to.x + s * to.r;
      var sweep = s > 0 ? '1 ' : '0 ';
      path.setAttribute('d',
        'M' + r2(x0) + ' ' + r2(from.y) + 'H' + r2(x - s * k) +
        'A' + arc + sweep + r2(x) + ' ' + r2(from.y + k) + 'V' + r2(to.y - k) +
        'A' + arc + sweep + r2(x - s * k) + ' ' + r2(to.y) + 'H' + r2(x1));
      var L = Math.abs(x - s * k - x0) + (to.y - from.y - 2 * k) + Math.abs(x - s * k - x1) + 2 * q;
      // the gap is a pixel longer than the dash, so an undrawn line leaves no dot
      path.style.strokeDasharray = r2(L) + ' ' + r2(L + 1);
      lengths.push(L);
      total += L;
    });

    // the screen height is taken once: phone toolbars change it mid-scroll,
    // and the line should only ever move because you scrolled
    geo = { y0: a.y, y1: stops[stops.length - 1].y, lengths: lengths, total: total, vh: window.innerHeight };
    update();
  }

  function update() {
    pending = false;
    if (!geo) return;
    var top = wrap.getBoundingClientRect().top;
    var span = (geo.y1 - geo.y0) + (START - END) * geo.vh;
    var t = (START * geo.vh - (top + geo.y0)) / span;
    var left = Math.min(1, Math.max(0, t)) * geo.total;   // length still to hand out
    paths.forEach(function (path, i) {
      var L = geo.lengths[i], on = Math.min(left, L);
      left -= on;
      path.style.strokeDashoffset = r2(L - on);
    });
  }

  function schedule() {
    if (pending || !geo) return;
    pending = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () {
    // phone browsers fire resize whenever the toolbar slides; only a real
    // change of width (rotation, window resize) changes the layout
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    measure();
  });
  if (phone.addEventListener) phone.addEventListener('change', measure);

  // text widths depend on the web fonts, so measure once they're in
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  else window.addEventListener('load', measure);
})();

// Recent work: stacking cards (see styles.css). Each project sits in a
// full-height item that pins under the nav; the next one slides up over it
// while the earlier cards shrink back, one after another. Ported from a
// 21st.dev React + GSAP component: the numbers are the original's. CSS does the
// pinning; this block only hands CSS the sizes and writes each card's scale.
(function () {
  var STEP = 0.05;              // original: 0.05   scale given up per card stacked on top
  var OFFSET_PX = 25;           // original: 25     each card sits this much lower than the last
  var TOP_SHIFT_SVH = -5;       // original: -5     the pile sits a little above the middle
  var CARD_W = '70%';           // original: "70%"
  // (the original's fixed card height, 450, is gone: a card is now as tall as
  // its screenshot needs, so nothing is cut off; see styles.css)
  var RADIUS_PX = 24;           // original: 24
  var BORDER_PX = 3;            // original: 3      thickness of the ring
  var ELECTRIC_BORDER = true;   // false switches the ring around each card off

  var stack = document.getElementById('work-stack');
  if (!stack) return;
  var items = Array.prototype.slice.call(stack.children);
  var cards = items.map(function (item) { return item.querySelector('.stack-card'); });
  var count = cards.length;
  if (!count) return;

  stack.style.setProperty('--stack-w', CARD_W);
  stack.style.setProperty('--stack-radius', RADIUS_PX + 'px');
  stack.style.setProperty('--stack-border', BORDER_PX + 'px');
  stack.style.setProperty('--stack-offset', OFFSET_PX + 'px');
  stack.style.setProperty('--stack-shift', TOP_SHIFT_SVH + 'svh');

  cards.forEach(function (card, i) {
    card.style.setProperty('--i', i);
    if (ELECTRIC_BORDER) {
      var ring = document.createElement('span');
      ring.className = 'stack-ring';
      card.insertBefore(ring, card.firstChild);
    }
  });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // Nothing is cached: every frame re-reads where the wrapper is.
  function update() {
    var rect = stack.getBoundingClientRect();
    var innerHeight = window.innerHeight;
    if (rect.bottom < 0 || rect.top > innerHeight) return;      // entirely off screen

    // reduced motion keeps the stacking but not the shrinking; so does the plain
    // list (no JS layout on very short screens), where nothing is pinned
    var still = reduce.matches || !pinned;

    var scrollY = window.scrollY;
    var wrapperTopAbs = scrollY + rect.top;
    var itemHeight = items[0].clientHeight;

    for (var i = 0; i < count; i++) {
      var value = '';
      if (!still) {
        // card i starts shrinking when its natural (un-pinned) top reaches the
        // middle of the screen and is done when its natural bottom gets there
        var target = 1 - (count - i) * STEP;
        var progress = clamp((scrollY - (wrapperTopAbs + i * itemHeight - innerHeight / 2)) / itemHeight, 0, 1);
        var scale = 1 + (target - 1) * progress;
        value = 'scale(' + scale + ')';
      }
      // most frames most cards have not changed: leave those alone
      if (written[i] !== value) { written[i] = value; cards[i].style.transform = value; }
    }
  }

  // Whether the layout is the pinned stack (CSS decides, from the screen size)
  // only changes when the window does, so it is looked up then, not per frame.
  var pinned = false;
  var written = [];
  function measureLayout() { pinned = getComputedStyle(items[0]).position === 'sticky'; }
  measureLayout();

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; update(); });
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () { measureLayout(); schedule(); });
  window.addEventListener('load', function () { measureLayout(); schedule(); });      // fonts and images can move the section

  // Hover, mouse only: the card under the cursor grows a touch (CSS, .is-hot)
  // and leans a few pixels toward the cursor on a spring, so it trails the
  // mouse with a little tension and settles back when the mouse leaves. This
  // uses the separate `translate` and `scale` properties, so it never fights
  // the stacking transform written above.
  var FOLLOW_PX = 7;          // the most a card leans toward the cursor
  var STIFFNESS = 170;        // spring: higher follows more tightly
  var DAMPING = 19;           // spring: lower wobbles more
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  cards.forEach(function (card) {
    var x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, raf = 0, last = 0;

    function frame(now) {
      var dt = Math.min(0.032, (now - last) / 1000 || 0.016);
      last = now;
      vx += (STIFFNESS * (tx - x) - DAMPING * vx) * dt;
      vy += (STIFFNESS * (ty - y) - DAMPING * vy) * dt;
      x += vx * dt;
      y += vy * dt;
      var settled = Math.abs(tx - x) < 0.02 && Math.abs(ty - y) < 0.02 && Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02;
      if (settled) { x = tx; y = ty; vx = vy = 0; }
      card.style.translate = (x || y) ? x.toFixed(2) + 'px ' + y.toFixed(2) + 'px' : '';
      raf = settled ? 0 : requestAnimationFrame(frame);
    }
    function wake() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    card.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !finePointer.matches || reduce.matches) return;
      var r = card.getBoundingClientRect();
      // where the cursor is across the card, -1 to 1 each way (measured from
      // the card's resting centre, without the lean it already has)
      var px = clamp((e.clientX - (r.left + r.width / 2 - x)) / (r.width / 2), -1, 1);
      var py = clamp((e.clientY - (r.top + r.height / 2 - y)) / (r.height / 2), -1, 1);
      tx = px * FOLLOW_PX;
      ty = py * FOLLOW_PX;
      card.classList.add('is-hot');
      wake();
    });
    card.addEventListener('pointerleave', function () {
      tx = ty = 0;
      card.classList.remove('is-hot');
      wake();
    });
  });
  if (reduce.addEventListener) reduce.addEventListener('change', schedule);
  else if (reduce.addListener) reduce.addListener(schedule);

  update();
})();

// "What I do" cards: a soft round glow follows the cursor inside each card.
// The glow itself is the card's ::before in styles.css (size, scale, timing and
// opacity are set there); this block only tells it where the cursor is, through
// --gx / --gy. Mouse and pen only: on touch nothing happens.
(function () {
  var cards = document.querySelectorAll('.service-card');

  Array.prototype.forEach.call(cards, function (card) {
    var x = 0, y = 0, pending = false;

    // cursor position measured from the inside corner of the card (inside its
    // border), which is what the glow's left/top are measured from
    function place() {
      pending = false;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--gx', (x - r.left - card.clientLeft) + 'px');
      card.style.setProperty('--gy', (y - r.top - card.clientTop) + 'px');
    }

    function precise(e) { return e.pointerType === 'mouse' || e.pointerType === 'pen'; }

    // on the way in, place it first, so the glow grows from the cursor and
    // never from wherever it was left last time
    card.addEventListener('pointerenter', function (e) {
      if (!precise(e)) return;
      x = e.clientX; y = e.clientY;
      place();
      card.classList.add('is-glowing');
    });

    card.addEventListener('pointermove', function (e) {
      if (!precise(e)) return;
      x = e.clientX; y = e.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(place);
    });

    // on the way out the glow shrinks back where it stands
    function off() { card.classList.remove('is-glowing'); }
    card.addEventListener('pointerleave', off);
    card.addEventListener('pointercancel', off);
  });
})();

// Theme toggle and curtain (see styles.css), every page. The site is light
// unless the visitor has chosen dark: their choice is saved in the browser and
// kept for as long as the browser keeps it. The small script in each page's
// <head> applies the saved choice before the first paint; this block runs the
// button. A press drops a sheet in the new theme's colour from the top,
// changes the theme behind it, and pulls the sheet back up. Ported from a
// 21st.dev React component: the numbers are the original's.
(function () {
  var DURATION = 550;                                 // original: 550 (ms), each way
  var EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';      // original: cubic-bezier(0.76, 0, 0.24, 1)
  var SETTLE_PAD = 60;                                // original: 60 (ms)
  // the top bar fades to the new theme from the moment of the press: a little
  // longer than the curtain's fall, so it is still settling as the page returns
  var FADE = 850;                                     // ms
  var FADE_EASING = 'cubic-bezier(0.45, 0, 0.55, 1)'; // gentle in, gentle out
  var FADE_TAIL = 'cubic-bezier(0.33, 0.67, 0.67, 1)';  // the last part of that same curve

  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  var curtain = document.getElementById('theme-curtain');
  if (!btn) return;
  // what sits above the curtain and fades instead of waiting for it
  var early = [document.querySelector('.topnav'), document.getElementById('name-float')]
    .filter(Boolean);

  var meta = document.querySelector('meta[name="theme-color"]');
  // the head script keeps the light value here before it writes the dark one
  var lightMeta = meta ? (meta.getAttribute('data-light') || meta.content) : '';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var phase = 'idle';

  function current() { return root.dataset.theme === 'dark' ? 'dark' : 'light'; }

  // CSS is the one place the colours are written down
  function pageBg(theme) {
    return getComputedStyle(root).getPropertyValue(theme === 'dark' ? '--page-bg-dark' : '--page-bg-light').trim();
  }

  // the icon swaps by itself: CSS shows the moon or the sun from data-theme
  function apply(theme) {
    root.dataset.theme = theme;
    if (meta) meta.content = theme === 'dark' ? pageBg('dark') : lightMeta;
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  // storage can be blocked (private windows, strict settings): the theme then
  // still changes, it just is not remembered
  function save(theme) {
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }

  apply(current());

  btn.addEventListener('click', function () {
    if (phase !== 'idle') return;                     // mid-wipe: ignore
    var target = current() === 'dark' ? 'light' : 'dark';

    // reduced motion (read at the moment of the press): no curtain at all
    if (reduce.matches || !curtain) {
      apply(target);
      save(target);
      return;
    }

    // 1. falling: the sheet, already in the new theme's colour, wipes down,
    // and the top bar (above the sheet) starts fading to the new theme now
    phase = 'falling';
    var pressed = performance.now();
    root.style.setProperty('--theme-fade', FADE + 'ms ' + FADE_EASING);
    root.style.setProperty('--theme-fade-color', FADE + 'ms ' + FADE_EASING);
    root.classList.add('theme-fading');
    early.forEach(function (el) { el.dataset.theme = target; });
    curtain.style.background = pageBg(target);
    void curtain.offsetHeight;                        // make the browser take that in before the motion starts
    curtain.style.transition = 'transform ' + DURATION + 'ms ' + EASING;
    curtain.style.transform = 'scaleY(1)';

    setTimeout(function () {
      // 2. the page is covered: change the theme, then pull the sheet back up.
      // Chrome restarts the bar's text-colour fade at this moment, so a
      // restart gets only what is left of the fade, on the tail of its curve
      var rest = Math.max(0, Math.round(FADE - (performance.now() - pressed)));
      root.style.setProperty('--theme-fade-color', rest + 'ms ' + FADE_TAIL);
      apply(target);
      save(target);
      phase = 'rising';
      curtain.style.transform = 'scaleY(0)';

      setTimeout(function () {
        // 3. done: the page has caught up with the bar, which hands its
        // colours back to the page (they now match, so nothing visibly changes)
        phase = 'idle';
        curtain.style.transition = 'none';
        early.forEach(function (el) { delete el.dataset.theme; });
        root.classList.remove('theme-fading');
        root.style.removeProperty('--theme-fade');
        root.style.removeProperty('--theme-fade-color');
      }, DURATION + SETTLE_PAD);
    }, DURATION);
  });
})();

// Home page, "Common questions": turns the plain headings and answers in the
// HTML into an accordion (see "FAQ" in styles.css). Everything is read from
// the page, so a new question is just another .faq-item block. Ported from a
// 21st.dev React + motion accordion; all the motion is CSS, this block builds
// the buttons and panels and keeps the open/closed state and aria in step.
(function () {
  var TYPE = 'single';          // original: "single"   only one item open at a time ("multiple" lets several stay open)
  var COLLAPSIBLE = true;       // original: true       the open item can be closed, leaving none open
  var DEFAULT_OPEN = 0;         // original: the first item (its position in the list; -1 for none)

  var list = document.querySelector('.faq-list');
  if (!list) return;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var items = Array.prototype.map.call(list.querySelectorAll('.faq-item'), function (item, i) {
    var id = item.getAttribute('data-id') || String(i + 1);
    var title = item.querySelector('.faq-title');
    var body = item.querySelector('.faq-body');

    // the heading stays a real heading; its text moves into a button inside it
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'faq-btn';
    btn.id = 'faq-btn-' + id;
    btn.setAttribute('aria-controls', 'faq-panel-' + id);
    var q = document.createElement('span');
    q.className = 'faq-q';
    q.textContent = title.textContent;
    var icon = document.createElementNS(SVG_NS, 'svg');
    icon.setAttribute('class', 'faq-chevron');
    icon.setAttribute('viewBox', '0 0 256 256');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M208 96l-80 80-80-80');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '16');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    icon.appendChild(path);
    btn.appendChild(q);
    btn.appendChild(icon);
    title.textContent = '';
    title.appendChild(btn);

    // the answer goes inside panel > clip, which is what lets CSS animate its height
    var panel = document.createElement('div');
    panel.className = 'faq-panel';
    panel.id = 'faq-panel-' + id;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', btn.id);
    var clip = document.createElement('div');
    clip.className = 'faq-clip';
    item.insertBefore(panel, body);
    clip.appendChild(body);
    panel.appendChild(clip);

    return { item: item, btn: btn, panel: panel, open: false };
  });
  if (!items.length) return;

  // a closed panel stays in the page at zero height, so it is also hidden from
  // screen readers and its links are taken out of the tab order
  function set(it, open) {
    it.open = open;
    it.item.classList.toggle('is-open', open);
    it.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      it.panel.removeAttribute('aria-hidden');
      it.panel.inert = false;
      it.panel.removeAttribute('inert');
    } else {
      it.panel.setAttribute('aria-hidden', 'true');
      it.panel.inert = true;
      it.panel.setAttribute('inert', '');
    }
  }

  function toggle(it) {
    if (it.open) {
      if (COLLAPSIBLE) set(it, false);
      return;
    }
    if (TYPE === 'single') items.forEach(function (other) { if (other.open) set(other, false); });
    set(it, true);
  }

  items.forEach(function (it, i) {
    set(it, i === DEFAULT_OPEN);
    it.btn.addEventListener('click', function () { toggle(it); });
    // arrows move between the questions (wrapping round), Home and End jump to
    // the ends; Enter and Space toggle because these are real buttons
    it.btn.addEventListener('keydown', function (e) {
      var to = -1;
      if (e.key === 'ArrowDown') to = (i + 1) % items.length;
      else if (e.key === 'ArrowUp') to = (i - 1 + items.length) % items.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = items.length - 1;
      if (to < 0) return;
      e.preventDefault();
      items[to].btn.focus();
    });
  });

  list.classList.add('is-ready');
})();
