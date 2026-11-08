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
