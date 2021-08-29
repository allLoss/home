// Installs observer to account for sticky/fixed overlay offsets when navigating
// to a fragment.

import {computeFixedYOffset, scrollToFragmentTarget} from '../sticky-scroll-into-view'
import hashChange from './hash-change'
import {on} from 'delegated-events'

function scrollTargetIntoViewIfNeeded() {
  if (computeFixedYOffset(document)) {
    scrollToFragmentTarget(document)
  }
}

hashChange(scrollTargetIntoViewIfNeeded)

on('click', 'a[href^="#"]', function (event) {
  const {currentTarget} = event
  if (!(currentTarget instanceof HTMLAnchorElement)) return

  // this defers the execution of scrollTargetIntoViewIfNeeded until after all the click stuff happened, including after scroll
  setTimeout(scrollTargetIntoViewIfNeeded, 0)
})
