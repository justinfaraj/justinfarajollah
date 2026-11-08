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
// nav as you scroll (see styles.css). Start and end positions are measured from
// the real elements (the hero h1 and the invisible nav brand), so the docked
// name lands exactly where the small nav name used to be.
(function () {
  var float = document.getElementById('name-float');
  var h1 = document.getElementById('hero-name');
  var brand = document.querySelector('.nav-brand');
  if (!float || !h1 || !brand) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var words = float.querySelectorAll('.nf-word');
  var spans = h1.querySelectorAll('.nm');
  var brandText = brand.firstChild;
  var ends = [[0, 6], [7, 17]];          // "Justin" and "Farajollah" in "Justin Farajollah"
  var geo = null;

  function textRect(node, a, b) {
    var r = document.createRange();
    r.setStart(node, a);
    r.setEnd(node, b);
    return r.getBoundingClientRect();
  }

  // where a word's text box sits inside the overlay at a given size, so the
  // overlay can be placed by its ink box rather than its element box
  function inkOffset(word, size) {
    word.style.fontSize = size + 'px';
    word.style.transform = 'translate3d(0,0,0)';
    var r = textRect(word.firstChild, 0, word.textContent.length);
    return { left: r.left, top: r.top };
  }

  function measure() {
    var sy = window.scrollY;
    var f1 = parseFloat(getComputedStyle(brand).fontSize);
    var next = { words: [], D: 0 };
    for (var i = 0; i < words.length; i++) {
      var s = textRect(spans[i].firstChild, 0, spans[i].textContent.length);
      var f = textRect(brandText, ends[i][0], ends[i][1]);
      var f0 = parseFloat(getComputedStyle(spans[i]).fontSize);
      next.words.push({
        s: { left: s.left, top: s.top + sy },        // document coordinates
        f: { left: f.left, top: f.top },             // viewport coordinates (nav is pinned)
        size0: f0, size1: f1,
        ls0: parseFloat(getComputedStyle(spans[i]).letterSpacing) || 0,   // "normal" parses to NaN, i.e. 0
        ls1: parseFloat(getComputedStyle(brand).letterSpacing) || 0,
        off0: inkOffset(words[i], f0), off1: inkOffset(words[i], f1)
      });
    }
    // scroll distance over which the first word travels up to the nav
    next.D = Math.max(60, next.words[0].s.top - next.words[0].f.top);
    geo = next;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function update() {
    if (!geo) return;
    var y = window.scrollY;
    var p = Math.min(1, Math.max(0, y / geo.D));
    var e = p * p * (3 - 2 * p);                     // smoothstep
    // at the end of the travel, the real nav text takes over from the overlay
    document.documentElement.classList.toggle('name-docked', p >= 1);
    for (var i = 0; i < words.length; i++) {
      var g = geo.words[i];
      var size = lerp(g.size0, g.size1, e);
      var x = lerp(g.s.left, g.f.left, e) - lerp(g.off0.left, g.off1.left, e);
      var t = lerp(g.s.top - y, g.f.top, e) - lerp(g.off0.top, g.off1.top, e);
      words[i].style.fontSize = size + 'px';
      words[i].style.letterSpacing = lerp(g.ls0, g.ls1, e) + 'px';
      if (e > 0.995) {                                         // about to dock: land on whole device pixels,
        var dpr = window.devicePixelRatio || 1;                // like normal text, so the handoff cannot shift
        x = Math.round(x * dpr) / dpr;
        t = Math.round(t * dpr) / dpr;
      }
      words[i].style.transform = 'translate3d(' + x + 'px,' + t + 'px,0)';
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
    document.documentElement.classList.add('name-morph');
    measure();
    update();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () { measure(); schedule(); });

  // measure only once the web fonts are in, since they change every width
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
  } else {
    window.addEventListener('load', init);
  }
})();
