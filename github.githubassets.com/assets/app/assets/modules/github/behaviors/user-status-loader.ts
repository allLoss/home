import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'

async function load(event: Event) {
  const container = event.currentTarget as HTMLElement
  const {init} = await import('../user-status-submit')
  init(container)
}

observe('.js-user-status-container', {
  subscribe: el => fromEvent(el, 'click', load, {once: true})
})
