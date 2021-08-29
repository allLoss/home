import {fire, on} from 'delegated-events'
import RemoteInputElement from '@github/remote-input-element'
import {fromEvent} from '../subscription'
import {microtask} from '../eventloop-tasks'
import {observe} from 'selector-observer'
import {onKey} from '../onfocus'

// Match deprecated .js-select-menu state classes.
observe('details.select-menu details-menu include-fragment', function (el) {
  const details = el.closest('details')
  if (!details) return
  el.addEventListener('loadstart', function () {
    details.classList.add('is-loading')
    details.classList.remove('has-error')
  })
  el.addEventListener('error', function () {
    details.classList.add('has-error')
  })
  el.addEventListener('loadend', function () {
    details.classList.remove('is-loading')
    const filter = details.querySelector('.js-filterable-field')
    if (filter) fire(filter, 'filterable:change')
  })
})

// Clear filter when menu closes.
observe('details details-menu .js-filterable-field', {
  constructor: HTMLInputElement,
  add(filter) {
    const details = filter.closest<HTMLElement>('details')!
    details.addEventListener('toggle', function () {
      if (!details.hasAttribute('open')) {
        filter.value = ''
        fire(filter, 'filterable:change')
      }
    })
  }
})

// Temporary fix for role=menu containing input
observe('details-menu[role=menu] [role=menu]', el => {
  const menu = el.closest('details-menu[role]')
  if (menu && menu !== el) menu.removeAttribute('role')
})

// Clear filter when menu closes.
observe('details details-menu remote-input input', {
  constructor: HTMLInputElement,
  add(filter) {
    const details = filter.closest<HTMLElement>('details')!
    details.addEventListener('toggle', function () {
      if (!details.hasAttribute('open')) {
        filter.value = ''
      }
    })
  }
})

// On form reset fire change on input so details-menu can apply state changes.
observe('form details-menu', menu => {
  const form = menu.closest<HTMLElement>('form')!
  form.addEventListener('reset', () => {
    setTimeout(() => resetMenus(form), 0)
  })
})

// Re-fires the `change` event for checked radios in a details-menu form.
function resetMenus(form: Element) {
  const inputs = form.querySelectorAll('details-menu [role=menuitemradio] input[type=radio]:checked')
  for (const input of inputs) {
    fire(input, 'change')
  }
}

/**
 * Auto trigger the first item on Enter when filterable field is focused.
 */
onKey('keypress', 'details-menu .js-filterable-field, details-menu filter-input input', (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    const input = event.currentTarget
    const menu = (input as HTMLInputElement).closest<HTMLElement>('details-menu')!
    const firstItem = menu.querySelector('[role^="menuitem"]:not([hidden])')
    if (firstItem instanceof HTMLElement) firstItem.click()
    event.preventDefault()
  }
})

// Focus filterable field after selecting an item
on(
  'details-menu-selected',
  'details-menu',
  event => {
    const menu = event.currentTarget

    const filterableField = (menu as HTMLElement).querySelector('.js-filterable-field')
    if (filterableField instanceof HTMLInputElement && filterableField.value) filterableField.focus()
  },
  {capture: true}
)

// On selection, sync selectedItem.value to input[id=data-menu-input]
on(
  'details-menu-selected',
  '[data-menu-input]',
  event => {
    if (!(event.target instanceof Element)) return
    const id = event.target.getAttribute('data-menu-input')!
    const el = document.getElementById(id)
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
    el.value = ((event as CustomEvent).detail.relatedTarget as HTMLButtonElement).value
  },
  {capture: true}
)

// Restore focus on the previously focused element after results have been updated
// Otherwise return focus to input
observe('details-menu remote-input', {
  constructor: RemoteInputElement,
  initialize(el) {
    const resultsContainer = document.getElementById(el.getAttribute('aria-owns') || '')
    if (!resultsContainer) return

    let activeElementId: string | null = null
    el.addEventListener('load', () => {
      if (document.activeElement && resultsContainer.contains(document.activeElement) && document.activeElement.id) {
        activeElementId = document.activeElement.id
      } else {
        activeElementId = null
      }
    })

    el.addEventListener('loadend', () => {
      if (activeElementId) {
        const focusEl =
          resultsContainer.querySelector(`#${activeElementId}`) || resultsContainer.querySelector('[role^="menu"]')
        if (focusEl instanceof HTMLElement) {
          focusEl.focus()
        } else if (el.input) {
          el.input.focus()
        }
      }
    })
  }
})

on(
  'details-menu-selected',
  'details-menu[data-menu-max-options]',
  event => {
    const max = +event.currentTarget.getAttribute('data-menu-max-options')!
    const checkedItems = event.currentTarget.querySelectorAll('[role="menuitemcheckbox"][aria-checked="true"]')
    const atLimit = max === checkedItems.length
    event.currentTarget.querySelector<HTMLElement>('[data-menu-max-options-warning]')!.hidden = !atLimit
    for (const item of event.currentTarget.querySelectorAll<HTMLInputElement>('[role="menuitemcheckbox"] input')) {
      item.disabled = atLimit && !item.checked
    }
  },
  {capture: true}
)

// Make js-select-menu & navigation behaviors work with detail select menus
observe('details > details-menu', {
  subscribe(el) {
    const details = el.closest<HTMLElement>('details')!
    return fromEvent(details, 'toggle', fireMenuToggleEvent)
  }
})

// Fire a menu:[de]activate[d] event depending on the state of the menu.
async function fireMenuToggleEvent({currentTarget}: Event) {
  const details = currentTarget as HTMLElement
  const isOpen = details.hasAttribute('open')
  fire(details, isOpen ? 'menu:activate' : 'menu:deactivate')
  await microtask()
  fire(details, isOpen ? 'menu:activated' : 'menu:deactivated')
}
