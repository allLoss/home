import {observe} from 'selector-observer'
import subscribe from '@github/check-all'

observe('.js-check-all-container', {
  constructor: HTMLElement,
  subscribe
})
