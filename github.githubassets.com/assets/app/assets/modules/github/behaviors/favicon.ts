// Favicon manager
//
// Manages light and dark favicon variations, and handles status,
// showing a ✕, check, or pending dot over depending on the page status

import {observe} from 'selector-observer'

let oldHref: string

function updateFavicon(newHref?: string, colorScheme?: string) {
  const favicon = document.querySelector<HTMLLinkElement>('.js-site-favicon[type="image/svg+xml"]')
  const faviconFallback = document.querySelector<HTMLLinkElement>('.js-site-favicon[type="image/png"]')

  if (!colorScheme) colorScheme = 'light'
  const colorSchemeSuffix = colorScheme === 'light' ? '' : '-dark'

  if (favicon && faviconFallback) {
    if (oldHref == null) {
      oldHref = favicon.href
    }

    if (newHref) {
      newHref = newHref.substr(0, newHref.lastIndexOf('.'))
      newHref = `${newHref}${colorSchemeSuffix}.svg`
      favicon.href = newHref

      const newFallbackHref = favicon.href.substr(0, favicon.href.lastIndexOf('.'))
      faviconFallback.href = `${newFallbackHref}.png`
    } else {
      const n = favicon.href.indexOf('-dark.svg')
      const newFaviconName = favicon.href.substr(0, n !== -1 ? n : favicon.href.lastIndexOf('.'))

      favicon.href = `${newFaviconName}${colorSchemeSuffix}.svg`
      faviconFallback.href = `${newFaviconName}${colorSchemeSuffix}.png`
    }
  }
}

function prefersDarkColorScheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resetIcon() {
  if (oldHref != null) updateFavicon(oldHref, prefersDarkColorScheme() ? 'dark' : 'light')
}

observe('[data-favicon-override]', {
  add(el) {
    const href = el.getAttribute('data-favicon-override')!

    // allow `remove` for the old element to fire first
    setTimeout(() => updateFavicon(href, prefersDarkColorScheme() ? 'dark' : 'light'))
  },
  remove() {
    resetIcon()
  }
})

if (prefersDarkColorScheme()) {
  // update favicon to dark on page load
  updateFavicon(undefined, 'dark')
}

window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
  updateFavicon(undefined, prefersDarkColorScheme() ? 'dark' : 'light')
})
