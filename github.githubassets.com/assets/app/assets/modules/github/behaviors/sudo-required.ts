import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {requestSubmit} from '../form'
import sudo from '../sudo'

on('click', 'button[data-sudo-required], summary[data-sudo-required]', checkSudo)
observe('form[data-sudo-required]', {
  constructor: HTMLFormElement,
  subscribe: form => fromEvent(form, 'submit', checkSudo)
})

async function checkSudo(event: Event) {
  const currentTarget = event.currentTarget
  if (!(currentTarget instanceof HTMLElement)) return

  event.stopPropagation()
  event.preventDefault()
  const sudoPassed = await sudo()

  if (sudoPassed) {
    currentTarget.removeAttribute('data-sudo-required')
    if (currentTarget instanceof HTMLFormElement) {
      requestSubmit(currentTarget)
    } else {
      currentTarget.click()
    }
  }
}
