import {controller, target, targets} from '@github/catalyst'
import {debounce} from '@github/mini-throttle/decorators'
import {eventToHotkeyString} from '@github/hotkey'
import {fetchSafeDocumentFragment} from '../fetch'
import {fire} from 'delegated-events'

import {replaceState} from '../history'

@controller
class BranchFilterElement extends HTMLElement {
  @target field: HTMLInputElement
  @target result: Element
  @target allFilter: Element
  @targets filters: Element[]
  abortSearch: AbortController | null = null
  originalSelectedItem: Element | null = null

  submit(event: Event) {
    event.preventDefault()
  }

  resetField(event: KeyboardEvent) {
    if (eventToHotkeyString(event) !== 'Escape') return

    const hadValue = this.field.value.trim()
    this.field.value = ''
    if (hadValue) {
      this.search()
    }
  }

  reset() {
    this.field.focus()
    this.field.value = ''
    fire(this.field, 'input')
  }

  get activeFilter(): Element | null {
    return this.filters.find(el => el.classList.contains('selected')) ?? null
  }

  @debounce(100)
  async search(): Promise<void> {
    if (!this.originalSelectedItem) {
      this.originalSelectedItem = this.activeFilter
    }

    const hasQuery = this.field.value.trim().length > 0
    const url = queryUrl(this.field)

    this.classList.toggle('is-search-mode', hasQuery)
    this.classList.add('is-loading')

    for (const el of this.filters) {
      el.classList.remove('selected')
    }

    if (hasQuery) {
      this.allFilter.classList.add('selected')
    } else if (this.originalSelectedItem) {
      this.originalSelectedItem.classList.add('selected')
      this.originalSelectedItem = null
    }

    this.abortSearch?.abort()
    const {signal} = (this.abortSearch = new AbortController())
    try {
      const fragment = await fetchSafeDocumentFragment(document, url, {signal})
      replaceState(null, '', url)
      this.result.innerHTML = ''
      this.result.appendChild(fragment)
    } catch {
      // Do nothing.
    }
    if (signal.aborted) return
    this.classList.remove('is-loading')
  }
}

function queryUrl(field: HTMLInputElement | HTMLTextAreaElement): string {
  const form = field.form!
  if (field.value.trim()) {
    const url = new URL(form.action, window.location.origin)
    const params = new URLSearchParams(url.search.slice(1))
    const utf8 = form.elements.namedItem('utf8')
    if (utf8 instanceof HTMLInputElement) {
      params.append('utf8', utf8.value)
    }
    params.append('query', field.value)
    url.search = params.toString()
    return url.toString()
  }

  return form.getAttribute('data-reset-url')!
}
