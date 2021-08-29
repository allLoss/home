import {observe} from 'selector-observer'
import {requestSubmit} from '../form'

observe('form.js-auto-replay-enforced-sso-request', {
  constructor: HTMLFormElement,
  initialize(el) {
    requestSubmit(el)
  }
})
