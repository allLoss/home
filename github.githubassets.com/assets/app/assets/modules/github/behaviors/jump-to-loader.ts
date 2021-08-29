import {logPageView} from '../jump-to/page-views'
import {observe} from 'selector-observer'

function load() {
  import('../jump-to')
}

observe('.js-jump-to-field', {
  constructor: HTMLInputElement,
  add(el) {
    el.addEventListener('focusin', load, {once: true})
    logPageView(window.location.pathname)
  }
})
