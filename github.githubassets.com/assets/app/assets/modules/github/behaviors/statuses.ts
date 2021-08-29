import {fetchSafeDocumentFragment} from '../fetch'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import verifySsoSession from '../sso'

function updateStatusPosition(container: Element, menu: HTMLElement, details: Element) {
  const containerHeight = container.getBoundingClientRect().height
  const menuRect = menu.getBoundingClientRect()
  const iconRect = details.getBoundingClientRect()
  let top = iconRect.top
  // Ensure popover stays off the bottom of the page by at least 10 pixels
  if (top + menuRect.height + 10 >= containerHeight) {
    top = Math.max(containerHeight - menuRect.height - 10, 0)
  }
  let left = iconRect.right
  // Show popover to the left
  if (details.closest('.js-build-status-to-the-left') != null) {
    left = Math.max(iconRect.left - menuRect.width - 10, 0)
  }
  menu.style.top = `${top}px`
  menu.style.left = `${left}px`
  menu.style.right = 'auto'
}

on(
  'toggle',
  '.js-build-status .js-dropdown-details',
  function (event) {
    const details = event.currentTarget
    const menu = details.querySelector<HTMLElement>('.js-status-dropdown-menu')
    if (!menu) return

    function closeOnToggle() {
      if (!details.hasAttribute('open')) closeStatusPopover()
    }

    function closeOnScroll(scrollEvent: Event) {
      if (!menu!.contains(scrollEvent.target as Element)) closeStatusPopover()
    }

    function closeStatusPopover() {
      details.removeAttribute('open')
      /* eslint-disable-next-line github/no-d-none */
      menu!.classList.add('d-none')
      details.appendChild(menu!)
      details.removeEventListener('toggle', closeOnToggle)
      window.removeEventListener('scroll', closeOnScroll)
    }

    details.addEventListener('toggle', closeOnToggle)

    if (menu.classList.contains('js-close-menu-on-scroll')) {
      /* eslint-disable-next-line github/prefer-observers */
      window.addEventListener('scroll', closeOnScroll, {capture: true})
    }

    /* eslint-disable-next-line github/no-d-none */
    menu.classList.remove('d-none')
    menu.querySelector<HTMLElement>('.js-details-container')!.classList.add('open')
    if (menu.classList.contains('js-append-menu-to-body')) {
      // Move menu to body so it can overlay on top of other elements
      document.body.appendChild(menu)
      updateStatusPosition(document.body, menu, details)
    }
  },
  {capture: true}
)

async function loadStatus(el: Element) {
  const details = el.querySelector('.js-dropdown-details')
  const menu = el.querySelector('.js-status-dropdown-menu') || el.closest('.js-status-dropdown-menu')

  if (!(menu instanceof HTMLElement)) {
    // Status does not have an associated dropdown menu
    return
  }

  const loader = menu.querySelector('.js-status-loader')
  if (!loader) {
    return
  }

  const loadingArea = menu.querySelector<HTMLElement>('.js-status-loading')!
  const errorArea = menu.querySelector<HTMLElement>('.js-status-error')!

  const url = loader.getAttribute('data-contents-url')!

  /* eslint-disable-next-line github/no-d-none */
  loadingArea.classList.remove('d-none')
  /* eslint-disable-next-line github/no-d-none */
  errorArea.classList.add('d-none')

  let html
  try {
    await verifySsoSession()
    html = await fetchSafeDocumentFragment(document, url)
  } catch (error) {
    /* eslint-disable-next-line github/no-d-none */
    loadingArea.classList.add('d-none')
    /* eslint-disable-next-line github/no-d-none */
    errorArea.classList.remove('d-none')
  }

  if (html) {
    loader.replaceWith(html)
    menu.querySelector<HTMLElement>('.js-details-container')!.classList.add('open')
    if (details && menu.classList.contains('js-append-menu-to-body')) {
      updateStatusPosition(document.body, menu, details)
    }
  }
}

on('click', '.js-status-retry', ({currentTarget}) => {
  loadStatus(currentTarget)
})

function onMouseEnter(event: Event) {
  const currentTarget = event.currentTarget as Element
  loadStatus(currentTarget)
}

observe('.js-build-status', {
  add(el) {
    el.addEventListener('mouseenter', onMouseEnter, {once: true})
  },
  remove(el) {
    el.removeEventListener('mouseenter', onMouseEnter)
  }
})
