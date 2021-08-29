import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'
import {requestSubmit} from '../form'

let unreadCount = 0

function markThreadAsRead() {
  if (!document.hasFocus()) return
  const form = document.querySelector('.js-timeline-marker-form')
  if (form && form instanceof HTMLFormElement) requestSubmit(form)
}

const observer =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        function (entries) {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              clearUnread(entry.target)
            }
          }
        },
        {
          root: null,
          rootMargin: '0px',
          threshold: 1.0
        }
      )
    : null

observe('.js-unread-item', {
  constructor: HTMLElement,
  add(el) {
    unreadCount++
    if (observer) {
      observer.observe(el)
    }
  },
  remove(el) {
    unreadCount--
    if (observer) {
      observer.unobserve(el)
    }
    if (unreadCount === 0) {
      markThreadAsRead()
    }
  }
})

function clearUnread(el: Element) {
  el.classList.remove('js-unread-item', 'unread-item')
}

// Mark any unread comments as read if the user has marked the thread as read
// in another tab or remotely via email notification.
observe('.js-discussion[data-channel-target]', {
  subscribe: el =>
    fromEvent(el, 'socket:message', function (event: Event) {
      const target = event.target as Element
      const data = (event as CustomEvent).detail.data
      if (target.getAttribute('data-channel-target') === data.gid) {
        for (const item of document.querySelectorAll('.js-unread-item')) {
          clearUnread(item)
        }
      }
    })
})
