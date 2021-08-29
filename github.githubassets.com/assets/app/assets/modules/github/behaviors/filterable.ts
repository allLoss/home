// Filterable Behavior
//
// Automatically filters and sorts a list of items against a text field.
//
// Markup
//
// * js-filterable-field  - Set on field to enable filtering.
// * data-filterable-for  - Set to ID of input field to bind too.
// * data-filterable-type - Filtering type. Either "prefix", "substring", or "fuzzy". Defaults to "prefix"
//
// <input id="file-filter-field" class="js-filterable-field" autocomplete="off">
//
// <ul data-filterable-for="file-filter-field" data-filterable-type="fuzzy">
//   <li>Foo</li>
//   <li>Bar</li>
//   <li>Baz</li>
// </ul>
//
//
// Events
//
// filterable:change
//
// * **Bubbles** Yes
// * **Cancelable** No
// * **Target** List container Element
// * **Context info**
//   * relatedTarget - Input field Element
//
// $('ul').on('filterable:change', function() {
//   console.log('order changed')
// })
//

import {addThrottledInputEventListener, removeThrottledInputEventListener} from '../throttled-input'
import {fire, on} from 'delegated-events'
import {announce} from '../aria-live'
import {filterList} from '../filter-list'
import {filterSortList} from '../filter-sort-list'
import {fuzzyScore} from '../fuzzy-filter'
import {microtask} from '../eventloop-tasks'
import {observe} from 'selector-observer'
import {substringMemoryFilterList} from '../substring-memory-filter-list'

observe('.js-filterable-field', {
  constructor: HTMLInputElement,
  initialize(field) {
    if (!field.autocomplete) {
      field.autocomplete = 'off'
    }

    // A null value will default to whatever is specified within `throttled-input.ts`
    const throttleWaitInMs = field.hasAttribute('type-ahead') ? 200 : null
    let value = field.value

    async function onInputChange(input: HTMLInputElement | HTMLTextAreaElement) {
      if (value === input.value) return
      value = input.value
      await microtask()
      fire(input, 'filterable:change')
    }

    async function onFocus() {
      value = field.value
      await microtask()
      fire(field, 'filterable:change')
    }

    return {
      add(el) {
        el.addEventListener('focus', onFocus)
        addThrottledInputEventListener(el, onInputChange, {wait: throttleWaitInMs})
        if (document.activeElement === el) onFocus()
      },
      remove(el) {
        el.removeEventListener('focus', onFocus)
        removeThrottledInputEventListener(el, onInputChange)
      }
    }
  }
})

// Trigger 'filterable:change' on an input after any
// direct val() calls
on('filterable:change', '.js-filterable-field', async function (event: Event) {
  const target = event.currentTarget as HTMLInputElement
  const queryString = target.value.trim().toLowerCase()
  const filterable = document.querySelectorAll(`[data-filterable-for="${target.id}"]`)
  for (const list of filterable) {
    const visible = await filter(list, queryString)
    if (visible === -1) return
    if (document.activeElement && target === document.activeElement) {
      announce(`${visible} results found.`)
    }

    list.dispatchEvent(
      new CustomEvent('filterable:change', {
        bubbles: true,
        cancelable: false,
        detail: {
          inputField: target
        }
      })
    )
  }
})

function defaultText(content: Element): string {
  return content.hasAttribute('data-filter-value')
    ? content.getAttribute('data-filter-value')!.toLowerCase().trim()
    : content.textContent!.toLowerCase().trim()
}

async function filter(list: Element, queryString: string): Promise<number> {
  const limit = parseInt(list.getAttribute('data-filterable-limit')!, 10) || null

  let visible = 0
  switch (list.getAttribute('data-filterable-type')) {
    case 'fuzzy': {
      const searchQuery = queryString.toLowerCase()
      const sortKey = (item: HTMLElement) => {
        const text = defaultText(item)
        const score = fuzzyScore(text, searchQuery)
        return score > 0 ? {score, text} : null
      }
      visible = filterSortList(list, queryString, {limit, sortKey})
      break
    }
    case 'substring':
      visible = filterList(list, queryString.toLowerCase(), substring, {limit})
      break
    case 'substring-memory':
      visible = await substringMemoryFilterList(list, queryString, {limit})
      break
    default:
      visible = filterList(list, queryString.toLowerCase(), prefix, {limit})
      break
  }

  list.classList.toggle('filterable-active', queryString.length > 0)
  list.classList.toggle('filterable-empty', visible === 0)

  return visible
}

function prefix(el: Element, queryString: string): boolean {
  return el.textContent!.toLowerCase().trim().startsWith(queryString)
}

function substring(el: Element, queryString: string): boolean | null {
  if (el.classList.contains('select-menu-no-results')) return null
  const target = el.querySelector('[data-filterable-item-text]') || el
  return target.textContent!.toLowerCase().trim().includes(queryString)
}

// Toggle new create new item form when filter doesn't match any existing items
on('filterable:change', 'details-menu .select-menu-list', function (event) {
  const list = event.currentTarget
  const form = list.querySelector('.js-new-item-form')

  if (form) {
    toggleForm(list, form, event.detail.inputField.value)
  }
})

function toggleForm(list: Element, form: Element, filterText: string) {
  const show = filterText.length > 0 && !itemExists(list, filterText)
  list.classList.toggle('is-showing-new-item-form', show)

  if (!show) return

  form.querySelector<HTMLElement>('.js-new-item-name')!.textContent = filterText

  const item = form.querySelector('.js-new-item-value')
  if (item instanceof HTMLInputElement || item instanceof HTMLButtonElement) {
    item.value = filterText
  }
}

// Detect if filtered item is already present in the list.
//
// container  - filterable list element
// filterText - String value of filter field
//
// Returns true if item already exists, otherwise false.
function itemExists(container: Element, filterText: string): boolean {
  for (const item of container.querySelectorAll('[data-menu-button-text]')) {
    const text = (item as HTMLElement).textContent!.toLowerCase().trim()
    if (text === filterText.toLowerCase()) {
      return true
    }
  }
  return false
}

// Hoist empty class to parent for styling.
observe('tab-container .select-menu-list .filterable-empty, details-menu .select-menu-list .filterable-empty', {
  add(el) {
    const list = el.closest<HTMLElement>('.select-menu-list')!
    list.classList.add('filterable-empty')
  },
  remove(el) {
    const list = el.closest<HTMLElement>('.select-menu-list')!
    list.classList.remove('filterable-empty')
  }
})
