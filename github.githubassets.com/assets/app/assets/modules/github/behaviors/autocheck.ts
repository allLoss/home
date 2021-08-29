// Common behaviors associated with <auto-check>

import {announceFromElement} from '../aria-live'
import {fire} from 'delegated-events'
import {observe} from 'selector-observer'
import {validate} from '../behaviors/html-validation'

const notes = new WeakMap()

observe('auto-check', function (el) {
  if (el.classList.contains('js-prevent-default-behavior')) return

  const input = el.querySelector('input')
  if (!input) return

  const container = input.closest('.form-group') || el
  const form = input.form

  let id: string | null
  function generateId() {
    if (!id) id = `input-check-${(Math.random() * 10000).toFixed(0)}`
    return id
  }
  const ariaDescribedby = input.getAttribute('aria-describedby')

  input.addEventListener('focusout:delay', () => {
    input.setAttribute('aria-describedby', [id, ariaDescribedby].join(' '))
  })

  const note = container.querySelector('p.note')
  if (note) {
    if (!note.id) note.id = generateId()
    notes.set(note, note.innerHTML)
  }

  el.addEventListener('loadstart', () => {
    reset(input, container)
    container.classList.add('is-loading')
    input.classList.add('is-autocheck-loading')

    validate(form!)
  })

  el.addEventListener('loadend', () => {
    container.classList.remove('is-loading')
    input.classList.remove('is-autocheck-loading')
  })

  input.addEventListener('auto-check-success', async (event: Event) => {
    input.classList.add('is-autocheck-successful')
    container.classList.add('successed')

    validate(form!)

    const {response} = (event as CustomEvent).detail
    if (!response) return

    const message = await response.text()
    if (!message) return

    if (note instanceof HTMLElement) {
      note.innerHTML = message
      announceFromElement(note)
    } else {
      const isOk = response.status === 200
      const tagName = container.tagName === 'DL' ? 'dd' : 'div'
      const element = document.createElement(tagName)
      element.id = generateId()
      element.classList.add(isOk ? 'success' : 'warning')
      element.innerHTML = message
      container.append(element)
      container.classList.add(isOk ? 'successed' : 'warn')
      announceFromElement(element)
      if (isOk) element.hidden = document.activeElement !== input
    }

    fire(input, 'auto-check-message-updated')
  })

  input.addEventListener('auto-check-error', async event => {
    input.classList.add('is-autocheck-errored')
    container.classList.add('errored')

    validate(form!)

    const {response} = (event as CustomEvent).detail
    if (!response) return

    const message = await response.text()

    if (note instanceof HTMLElement) {
      // eslint-disable-next-line i18n-text/no-en
      note.innerHTML = message || 'Something went wrong'
      announceFromElement(note)
    } else {
      const tagName = container.tagName === 'DL' ? 'dd' : 'div'
      const error = document.createElement(tagName)
      error.id = generateId()
      error.classList.add('error')
      // eslint-disable-next-line i18n-text/no-en
      error.innerHTML = message || 'Something went wrong'
      container.append(error)
      announceFromElement(error)
    }
  })

  input.addEventListener('input', () => {
    input.removeAttribute('aria-describedby')
    if (!input.value) reset(input, container)
  })

  input.addEventListener('blur', () => {
    const successMessage = container.querySelector<HTMLElement>('.success')
    if (successMessage) successMessage.hidden = true
  })

  input.addEventListener('focus', () => {
    const successMessage = container.querySelector<HTMLElement>('.success')
    if (successMessage) successMessage.hidden = false
  })

  form!.addEventListener('reset', () => {
    reset(input, container)
  })
})

// Reset the autocheck state.
function reset(input: HTMLInputElement, container: Element) {
  container.classList.remove('is-loading', 'successed', 'errored', 'warn')
  input.classList.remove('is-autocheck-loading', 'is-autocheck-successful', 'is-autocheck-errored')

  const note = container.querySelector('p.note')
  if (note) {
    const content = notes.get(note)
    if (content) note.innerHTML = content
  }

  if (container.tagName === 'DL') {
    container.querySelector('dd.error')?.remove()
    container.querySelector('dd.warning')?.remove()
    container.querySelector('dd.success')?.remove()
  } else {
    container.querySelector('div.error')?.remove()
    container.querySelector('div.warning')?.remove()
    container.querySelector('div.success')?.remove()
  }
}
