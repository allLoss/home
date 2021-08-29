import FilterInputElement from '@github/filter-input-element'
import {announce} from '../aria-live'
import {on} from 'delegated-events'

on('filter-input-updated', 'filter-input', event => {
  const input = (event.currentTarget as FilterInputElement).input
  if (!(document.activeElement && document.activeElement === input)) return
  const {count, total} = event.detail
  // eslint-disable-next-line i18n-text/no-en
  announce(`Found ${count} out of ${total} ${total === 1 ? 'item' : 'items'}`)
})

on(
  'toggle',
  'details',
  event => {
    // Wait for the next click to ensure that focus has left input
    setTimeout(() => resetFilter(event.target as Element), 0)
  },
  {capture: true}
)

on(
  'tab-container-changed',
  'tab-container',
  event => {
    if (!(event.target instanceof HTMLElement)) return
    const {relatedTarget: panel} = event.detail
    const filterInput = event.target.querySelector('filter-input')
    if (filterInput instanceof FilterInputElement) {
      filterInput.setAttribute('aria-owns', panel.id)
    }
  },
  {capture: true}
)

function resetFilter(target: Element) {
  const filterInput = target.querySelector<FilterInputElement>('filter-input')
  if (filterInput && !target.hasAttribute('open')) {
    filterInput.reset()
  }
}
