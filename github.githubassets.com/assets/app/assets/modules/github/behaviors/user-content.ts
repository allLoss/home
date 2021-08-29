// Support linking to named anchors in user content
//
// Named elements in user content are prefixed with "user-content-" to prevent
// DOM clobbering. This allows users to link to the unprefixed named anchors by
// listening for hashchange and, when when no elements with an ID or name of the
// given hash exist, looks for an element with a prefixed name.
//
// See https://github.com/github/github/issues/23103 for more information.

import {decodeFragmentValue, findElementByFragmentName} from '../fragment-target'
import {on} from 'delegated-events'
import {ready} from '../document-ready'
import {scrollIntoView} from '../sticky-scroll-into-view'

function hashchange() {
  if (document.querySelector(':target')) {
    return
  }
  const hash = decodeFragmentValue(location.hash).toLowerCase()
  const target = findElementByFragmentName(document, `user-content-${hash}`)
  if (target) {
    scrollIntoView(target)
  }
}

// Scroll to anchor when clicked on page.
window.addEventListener('hashchange', hashchange)

// Scroll to anchor on pjax navigation
document.addEventListener('pjax:success', hashchange)

// Scroll to anchor on page load.
;(async function () {
  await ready
  hashchange()
})()

// Scroll to anchor when clicking on a link that has the exact same fragment
// identifier as already present in the URL. This won't trigger `hashchange`,
// so we need to scroll manually.
on('click', 'a[href]', function (event) {
  const {currentTarget} = event
  if (!(currentTarget instanceof HTMLAnchorElement)) return

  if (currentTarget.href === location.href && location.hash.length > 1) {
    setTimeout(function () {
      if (!event.defaultPrevented) hashchange()
    })
  }
})
