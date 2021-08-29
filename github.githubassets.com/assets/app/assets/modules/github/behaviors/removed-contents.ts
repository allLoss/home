// Removed Contents behavior
//
// When "has-removed-contents" is added to an Element, its contents are
// detached from the document and stored in memory. Once the class is removed,
// the original contents are automatically reinserted into the document.
//
// WARNING: Adding new content to an Element while it has its contents detatch
// has undefined behavior.
//
// This behavior is useful when working with form with multiple states. Using
// d-none is only presentational and doesn't exclude the form fields from
// being submitted or participating in validation requirements.

import {fire} from 'delegated-events'
import {observe} from 'selector-observer'

observe('.has-removed-contents', function () {
  let contents: ChildNode[]
  return {
    add(parent) {
      contents = Array.from(parent.childNodes)
      for (const el of contents) {
        parent.removeChild(el)
      }
      const form = parent.closest('form')
      if (form) fire(form, 'change')
    },
    remove(parent) {
      for (const el of contents) {
        parent.appendChild(el)
      }
      const form = parent.closest('form')
      if (form) fire(form, 'change')
    }
  }
})
