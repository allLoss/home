import {observe} from 'selector-observer'

observe('[data-indeterminate]', {
  constructor: HTMLInputElement,
  initialize(el) {
    el.indeterminate = true
  }
})
