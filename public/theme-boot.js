/* Applies the saved theme and language BEFORE first paint (no flash). Keep in sync with src/lib/prefs.ts. */
(function () {
  try {
    var t = localStorage.getItem('nova.theme')
    var l = localStorage.getItem('nova.lang')
    var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches
    var name = t === 'mutiara' || t === 'lazuardi' || t === 'zamrud' ? t : dark ? 'lazuardi' : 'mutiara'
    var root = document.documentElement
    root.setAttribute('data-theme', name)
    root.style.colorScheme = name === 'lazuardi' ? 'dark' : 'light'
    root.lang = l === 'en' || l === 'ms' ? l : /^en\b/i.test(navigator.language) ? 'en' : 'ms'
  } catch {
    /* storage or matchMedia unavailable: the stylesheet default applies */
  }
})()
