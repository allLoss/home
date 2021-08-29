import {fromEvent} from '../subscription'
import {loaded} from '../document-ready'
import {observe} from 'selector-observer'
import {positionedOffset} from '../dimensions'

observe('.js-responsive-underlinenav', {
  constructor: HTMLElement,
  subscribe: nav => {
    asyncCalculateVisibility(nav)
    return fromEvent(window, 'resize', () => calculateVisibility(nav))
  }
})

export async function asyncCalculateVisibility(nav: HTMLElement) {
  await loaded
  calculateVisibility(nav)
}

function toggleItem(item: HTMLElement, hidden: boolean) {
  // Set visibility to hidden, instead of .hidden attribute
  // so we can still calculate distance accurately
  item.style.visibility = hidden ? 'hidden' : ''
  // Get tab-item name, if present, so we can match it up with the dropdown menu
  const itemName = item.getAttribute('data-tab-item')
  if (itemName) {
    const itemToHide = document.querySelector<HTMLElement>(`[data-menu-item=${itemName}]`)
    if (itemToHide instanceof HTMLElement) {
      itemToHide.hidden = !hidden
    }
  }
}

function calculateVisibility(nav: HTMLElement) {
  const items = nav.querySelectorAll<HTMLElement>('.js-responsive-underlinenav-item')
  const overflowContainer = nav.querySelector<HTMLElement>('.js-responsive-underlinenav-overflow')!
  const overflowOffset = positionedOffset(overflowContainer, nav)
  if (!overflowOffset) {
    return
  }

  let anyHidden = false
  for (const item of items) {
    const itemOffset = positionedOffset(item, nav)
    if (itemOffset) {
      const hidden = itemOffset.left + item.offsetWidth >= overflowOffset.left
      toggleItem(item, hidden)
      anyHidden = anyHidden || hidden
    }
  }
  overflowContainer.style.visibility = anyHidden ? '' : 'hidden'
}
