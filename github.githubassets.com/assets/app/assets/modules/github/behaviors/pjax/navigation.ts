import {detectContainer, preserveScrollTo} from './utils'
import {on} from 'delegated-events'
import pjaxRequest from '../pjax'

on('click', '[data-pjax] a, a[data-pjax]', function (event) {
  const link = event.currentTarget
  if (link instanceof HTMLAnchorElement) {
    if (link.getAttribute('data-skip-pjax') != null) {
      return
    }
    if (link.getAttribute('data-remote') != null) {
      return
    }

    const container = detectContainer(link)
    if (container) {
      click(event, {
        container,
        scrollTo: preserveScrollTo(link)
      })
    }
  }
})

on('change', 'select[data-pjax]', function (event) {
  const select = event.currentTarget as HTMLSelectElement
  const container = detectContainer(select)
  if (container) {
    pjaxRequest({url: select.value, container})
  }
})

function click(event: MouseEvent, options: {container: Element; scrollTo?: number | false}) {
  const link = event.currentTarget as HTMLAnchorElement

  // Middle click, cmd click, and ctrl click should open
  // links in a new tab as normal.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  // Ignore cross origin links
  if (location.protocol !== link.protocol || location.hostname !== link.hostname) return

  // Ignore case when a hash is being tacked on the current URL
  if (link.href.indexOf('#') > -1 && stripHash(link) === stripHash(location)) return

  // Ignore event with default prevented
  if (event.defaultPrevented) return

  const opts = {
    url: link.href,
    target: link,
    ...options
  }

  const clickEvent = new CustomEvent('pjax:click', {
    bubbles: true,
    cancelable: true,
    detail: {options: opts, relatedEvent: event}
  })

  if (link.dispatchEvent(clickEvent)) {
    pjaxRequest(opts)
    event.preventDefault()
    link.dispatchEvent(new CustomEvent('pjax:clicked', {bubbles: true, cancelable: true, detail: {options: opts}}))
  }
}

// Return the `href` component of given URL object with the hash portion removed.
function stripHash(location: Location | HTMLAnchorElement): string {
  return location.href.replace(/#.*/, '')
}
