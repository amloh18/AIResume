/**
 * Theme bootstrap — runs before React hydration.
 *
 * Loaded from the root layout with `next/script` + `strategy="beforeInteractive"`, which delegates
 * execution to Next's bootstrap (`appBootstrap` → `self.__next_s`) instead of a raw `<script>` in the
 * React tree. Rendering an inline script element from a component makes React create it client-side,
 * which logs "Encountered a script tag while rendering React component" and can break hydration.
 *
 * Must stay dependency-free, ES5-safe and side-effect-only: it applies the stored/system theme to
 * <html> so the first paint matches the user's preference and ThemeProvider does not have to correct it.
 */
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var isDark = false;

    if (saved === 'dark') {
      isDark = true;
    } else if (saved === 'light') {
      isDark = false;
    } else {
      isDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    /* localStorage can throw in private/blocked contexts — fall back to the default light theme. */
  }
})();
