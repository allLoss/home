// Append any window.location.hash changes to the permalink.
//
// For example, if you're viewing:
// /github/linguist/blob/master/lib/linguist/languages.yml#L12
//
// You probably want the permalink to preserve the #L12, and go to:
// /github/linguist/blob/SHA/lib/linguist/languages.yml#L12

import {on} from 'delegated-events'
import {replaceState} from '../history'

on('click', '.js-permalink-shortcut', function (event) {
  const target = event.currentTarget as HTMLAnchorElement
  try {
    replaceState(null, '', target.href + window.location.hash)
  } catch (error) {
    window.location.href = target.href + window.location.hash
  }
  event.preventDefault()
})
