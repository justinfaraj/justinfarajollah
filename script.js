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
