import {displayFlash} from '../flash'
import {observe} from 'selector-observer'

observe('template.js-flash-template', {
  constructor: HTMLTemplateElement,
  add(el) {
    displayFlash(el)
  }
})
