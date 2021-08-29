import {preservePosition} from 'scroll-anchoring'

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  if (event.target !== document.body) return

  const element = document.querySelector('.js-targetable-element:target')
  if (!element) return

  preservePosition(element, () => {
    // Clear the `:target` element
    window.location.hash = ''
    // Clear the hash part of the URL
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  })
})

document.addEventListener('click', (event: MouseEvent) => {
  // Return early if there is no highlighted element
  const highlightedElement = document.querySelector('.js-targetable-element:target')
  if (!highlightedElement) return

  // Don't mess with the URL if we clicked on a link
  if (event.target instanceof HTMLAnchorElement) return

  // Don't do anything if the user clicked on the already highlighted element
  if (!(event.target instanceof HTMLElement)) return
  if (highlightedElement.contains(event.target)) return

  preservePosition(highlightedElement, () => {
    // Clear the `:target` element
    window.location.hash = ''
    // Clear the hash part of the URL
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  })
})
