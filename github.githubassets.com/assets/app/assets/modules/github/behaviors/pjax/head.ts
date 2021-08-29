import {ready} from '../../document-ready'

const pjaxHeadCache: {[key: string]: Element[]} = {}
const pjaxReplaceCache: {[key: string]: Element[]} = {}

;(async () => {
  await ready
  pjaxHeadCache[document.location.pathname] = Array.from(document.querySelectorAll('head [data-pjax-transient]'))
  pjaxReplaceCache[document.location.pathname] = Array.from(document.querySelectorAll('[data-pjax-replace]'))
})()

// Extract special elements that are not to be inserted in the DOM verbatim.
document.addEventListener('pjax:beforeReplace', function (event: Event) {
  const contents = (event as CustomEvent).detail.contents || []
  const container = event.target as Element
  for (let i = 0; i < contents.length; i++) {
    const elem = contents[i]
    if (elem instanceof Element) {
      if (elem.id === 'pjax-head') {
        pjaxHeadCache[document.location.pathname] = Array.from(elem.children)
        contents[i] = null
      } else if (elem.hasAttribute('data-pjax-replace')) {
        if (!pjaxReplaceCache[document.location.pathname]) pjaxReplaceCache[document.location.pathname] = []
        pjaxReplaceCache[document.location.pathname].push(elem)

        // Only null out elements outside the container since the container will
        // be cleared completely so any elements inside it can be inserted as
        // normal
        if (!container.querySelector(`#${elem.id}`)) {
          contents[i] = null
        }
      }
    }
  }
})

export function replaceCachedElements() {
  const cached = pjaxReplaceCache[document.location.pathname]
  if (!cached) return
  for (const elem of cached) {
    const pjaxReplace = document.querySelector(`#${elem.id}`)
    if (pjaxReplace) pjaxReplace.replaceWith(elem)
  }
}

export function replaceTransientTags() {
  const cached = pjaxHeadCache[document.location.pathname]
  if (!cached) return
  const head = document.head

  for (const el of document.querySelectorAll('head [data-pjax-transient]')) {
    el.remove()
  }
  for (const el of cached) {
    if (!el.matches('title, script, link[rel=stylesheet]')) {
      el.setAttribute('data-pjax-transient', '')
      head.append(el)
    } else if (el.matches('link[rel=stylesheet]')) {
      head.append(el)
    }
  }
}
