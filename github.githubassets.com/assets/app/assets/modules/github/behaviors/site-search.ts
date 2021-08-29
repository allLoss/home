import {onFocus, onKey} from '../onfocus'
import {on} from 'delegated-events'

function isJumpToAvailable(field: Element): boolean {
  return !!field.closest('.js-jump-to-field')
}

function toggleSearchScope(field: HTMLElement, enabled: boolean) {
  // We don't want legacy search behaviour of changing scope on backspace when using Jump To.
  if (isJumpToAvailable(field)) {
    return
  }
  const form = document.querySelector<HTMLFormElement>('.js-site-search-form')!
  document.querySelector<HTMLElement>('.js-site-search')!.classList.toggle('scoped-search', enabled)

  let url
  let placeholder
  if (enabled) {
    url = form.getAttribute('data-scoped-search-url')!
    placeholder = field.getAttribute('data-scoped-placeholder')!
  } else {
    url = form.getAttribute('data-unscoped-search-url')!
    placeholder = field.getAttribute('data-unscoped-placeholder')!
  }

  form.setAttribute('action', url)
  field.setAttribute('placeholder', placeholder)
}

onKey('keyup', '.js-site-search-field', function (event: KeyboardEvent) {
  const field = event.target as HTMLInputElement

  const emptyQuery = field.value.length === 0
  if (emptyQuery && event.key === 'Backspace' && field.classList.contains('is-clearable')) {
    toggleSearchScope(field, false)
  }
  if (emptyQuery && event.key === 'Escape') {
    toggleSearchScope(field, true)
  }
  field.classList.toggle('is-clearable', emptyQuery)
})

onFocus('.js-site-search-focus', function (field) {
  const container = field.closest<HTMLElement>('.js-chromeless-input-container')!
  container.classList.add('focus')

  // Restore scope on blur
  function blurHandler() {
    container.classList.remove('focus')
    if ((field as HTMLInputElement).value.length === 0 && field.classList.contains('js-site-search-field')) {
      toggleSearchScope(field, true)
    }
    field.removeEventListener('blur', blurHandler)
  }

  field.addEventListener('blur', blurHandler)
})

on('submit', '.js-site-search-form', function (event) {
  if (!(event.target instanceof Element)) return
  const input = event.target.querySelector<HTMLInputElement>('.js-site-search-type-field')!
  input.value = new URLSearchParams(window.location.search).get('type') || ''
})
