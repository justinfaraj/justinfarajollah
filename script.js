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
// name is; on phones it is scaled to span the whole bar.
//
// Built to stay smooth on phones: everything is measured ONCE (after fonts load,
// and again only if the screen WIDTH changes, never for the address bar showing
// and hiding). While scrolling, the only thing touched is the transform of two
// elements, which the browser can draw without redoing layout. Font sizes are
// never animated; the words are scaled instead.
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
  var geo = null;
  var docked = false;
  var lastWidth = window.innerWidth;

  function textRect(node, a, b) {
    var r = document.createRange();
    r.setStart(node, a);
    r.setEnd(node, b);
    return r.getBoundingClientRect();
  }

  // On phones the docked name is sized to span the full width of the bar.
  function fitBrandToBar() {
    brand.style.fontSize = '';
    if (!phone.matches) return;
    var bar = brand.parentNode;
    var cs = getComputedStyle(bar);
    var avail = bar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var natural = textRect(brandText, 0, brandText.length).width;
    var size = parseFloat(getComputedStyle(brand).fontSize) * avail / natural;
    // capped so the bar stays slim on wide phones (landscape) and tablets, where
    // filling the whole width would mean enormous type
    size = Math.min(size, 56);
    brand.style.fontSize = Math.floor(size * 10) / 10 + 'px';
  }

  function measure() {
    fitBrandToBar();
    var sy = window.scrollY;
    var f1 = parseFloat(getComputedStyle(brand).fontSize);
    var next = { words: [], D: 0 };
    for (var i = 0; i < words.length; i++) {
      var cs = getComputedStyle(spans[i]);
      var f0 = parseFloat(cs.fontSize);
      // the overlay word is drawn at the hero size and only ever scaled down
      words[i].style.fontSize = f0 + 'px';
      words[i].style.letterSpacing = cs.letterSpacing;
      words[i].style.transform = 'none';
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
    // on one line, "Farajollah" starts this far right of "Justin" (in hero-size units)
    next.words[1].adj = (next.words[1].fx - next.words[0].fx) / next.words[1].k;
    // how far you scroll while the name travels; a short hero still gets a gentle animation
    next.D = Math.max(phone.matches ? 120 : 60, next.words[0].sy - next.words[0].fy);
    geo = next;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
  function smooth(v) { return v * v * (3 - 2 * v); }       // smoothstep

  function update() {
    if (!geo) return;
    var y = window.scrollY;
    var p = Math.min(1, Math.max(0, y / geo.D));
    var e = smooth(p);
    var dpr = window.devicePixelRatio || 1;
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
      if (p > 0.99) {                                      // about to dock: land on whole device pixels
        x = Math.round(x * dpr) / dpr;
        t = Math.round(t * dpr) / dpr;
      }
      words[i].style.transform = 'translate3d(' + x + 'px,' + t + 'px,0) scale(' + sc + ')';
    }
    if (navBg) navBg.style.opacity = p;                    // phones: the bar fades in as the name arrives
    var d = p >= 1;
    if (d !== docked) {                                    // at the end the real nav text takes over (crisp)
      docked = d;
      root.classList.toggle('name-docked', d);
    }
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; update(); });
  }

  function init() {
    // show the overlay first: a display:none element has no boxes to measure
    root.classList.add('name-morph');
    measure();
    update();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () {
    // phone browsers fire resize whenever the address bar shows or hides; only a
    // real change of width (rotation, window resize) needs a re-measure
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    measure();
    schedule();
  });

  // measure only once the web fonts are in, since they change every width
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
  } else {
    window.addEventListener('load', init);
  }
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
