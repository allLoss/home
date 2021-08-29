//
// Updatable Content
//
// Markup
//
//     <div class="js-socket-channel js-updatable-content"
//          data-channel="pull:123"
//          data-url="/pull/123?partial=commits">
//     </div>
//

import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'
import {updateContent} from '../updatable-content'

observe('.js-socket-channel.js-updatable-content', {
  subscribe: el =>
    fromEvent(el, 'socket:message', function (event: Event) {
      const {gid, wait} = (event as CustomEvent).detail.data
      const container = event.target as HTMLElement
      const target = gid ? findByGid(container, gid) : container
      if (target) setTimeout(updateContent, wait || 0, target)
    })
})

function findByGid(root: HTMLElement, gid: string): HTMLElement | null {
  if (root.getAttribute('data-gid') === gid) return root
  for (const el of root.querySelectorAll<HTMLElement>(`[data-url][data-gid]`)) {
    if (el.getAttribute('data-gid') === gid) {
      return el
    }
  }
  return null
}
