/**
 * Third-party error suppression — browser-extension noise only.
 *
 * Browser wallets (e.g. Rabby's evmAsk.js) inject scripts that throw on pages they do not understand,
 * which shows up as console errors and Sentry noise on clean pages. This registers capture-phase
 * listeners that stop *only* errors originating from those injectors.
 *
 * Loaded from the root layout with `next/script` + `strategy="beforeInteractive"` so it is installed
 * before any application code runs; see `public/theme-init.js` for why this is a static file rather
 * than an inline script rendered by a component.
 *
 * Scope is deliberately narrow: the filter matches the extension's own identifiers, never application
 * errors. Anything else propagates untouched.
 */
(function () {
  var SDK_MARKERS = ['ethereum', 'evmAsk'];

  function isExtensionError(message, filename) {
    var haystacks = [message || '', filename || ''];
    for (var i = 0; i < haystacks.length; i++) {
      for (var j = 0; j < SDK_MARKERS.length; j++) {
        if (haystacks[i].indexOf(SDK_MARKERS[j]) !== -1) return true;
      }
    }
    return false;
  }

  window.addEventListener(
    'error',
    function (event) {
      if (isExtensionError(event.message, event.filename)) {
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    function (event) {
      var reason = event.reason;
      var message = reason && reason.message;
      var stack = reason && reason.stack;
      if (isExtensionError(message, stack)) {
        event.preventDefault();
      }
    },
    true
  );
})();
