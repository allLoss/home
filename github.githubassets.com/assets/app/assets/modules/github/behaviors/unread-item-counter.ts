// Unread Item Counter
//
// Keeps count of how many unread items are present throughout the page. The
// count is reflected in the page title automatically.
//
// To increase or decrease the page title counter, it's as simple as adding or
// removing the `.js-unread-item` class from an element. The counter is reset and
// the page title is cleared when there are no more elements with the
// `.js-unread-item` class present.
//
// Markup
//
// ``` html
// <div class="comment js-comment js-unread-item">
//   :metal:
// </div>
// ```
//

import {observe} from 'selector-observer'

let unreadCounter = 0
const titleRe = /^\(\d+\)\s+/

function updateTitle() {
  const prefix = unreadCounter ? `(${unreadCounter}) ` : ''
  if (document.title.match(titleRe)) {
    document.title = document.title.replace(titleRe, prefix)
  } else {
    document.title = `${prefix}${document.title}`
  }
}

observe('.js-unread-item', {
  add() {
    unreadCounter++
    updateTitle()
  },
  remove() {
    unreadCounter--
    updateTitle()
  }
})
