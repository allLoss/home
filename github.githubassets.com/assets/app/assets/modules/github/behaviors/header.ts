import {on} from 'delegated-events'

on('click', '.js-skip-to-content', function (event) {
  const startOfContent = document.getElementById('start-of-content')
  if (startOfContent) {
    const nextElement = startOfContent.nextElementSibling
    if (nextElement instanceof HTMLElement) {
      nextElement.setAttribute('tabindex', '-1')
      nextElement.setAttribute('data-skipped-to-content', '1')
      nextElement.focus()
    }
  }
  event.preventDefault()
})

export function hasSkippedToContent() {
  let skippedToContent = false
  const startOfContent = document.getElementById('start-of-content')

  if (startOfContent) {
    const nextElement = startOfContent.nextElementSibling

    if (nextElement instanceof HTMLElement) {
      skippedToContent = nextElement.getAttribute('data-skipped-to-content') === '1'

      if (skippedToContent) {
        nextElement.removeAttribute('data-skipped-to-content')
      }

      return skippedToContent
    }
  }
}

const touchDevice = 'ontouchstart' in document

function compatibleDesktop() {
  return window.innerWidth > 1012
}

for (const headerMenu of document.querySelectorAll('.HeaderMenu-details')) {
  // On desktop and mobile, ensure that other menus are closed when one opens.
  headerMenu.addEventListener('toggle', onMenuToggle)
  if (!touchDevice) {
    // We can't use `mouseenter` because of Safari bug (v12.0.1).
    headerMenu.addEventListener('mouseover', onMenuHover)
    headerMenu.addEventListener('mouseleave', onMenuHover)
    // On desktop, because the menus are automatically closed on hover, disable
    // manually collapsing menus to prevent accidental interactions.

    // This is currently commented out due to a bug where dropdown links are not clickable. Awaiting a possible work around
    // headerMenu.addEventListener('click', disableMenuManualClose)
  }
}

let togglingInProgress = false

function onMenuToggle(event: Event) {
  if (togglingInProgress) return
  togglingInProgress = true

  for (const headerMenu of document.querySelectorAll('.HeaderMenu-details')) {
    if (headerMenu === event.currentTarget) continue
    headerMenu.removeAttribute('open')
  }

  setTimeout(() => (togglingInProgress = false))
}

function onMenuHover(event: Event) {
  const {currentTarget} = event
  if (!(currentTarget instanceof HTMLElement) || !compatibleDesktop()) {
    return
  }
  if (event.type === 'mouseover' && event instanceof MouseEvent) {
    if (
      event.target instanceof Node &&
      event.relatedTarget instanceof Node &&
      currentTarget.contains(event.target) &&
      !currentTarget.contains(event.relatedTarget)
    ) {
      currentTarget.setAttribute('open', '')
    }
  } else {
    currentTarget.removeAttribute('open')
  }
}
