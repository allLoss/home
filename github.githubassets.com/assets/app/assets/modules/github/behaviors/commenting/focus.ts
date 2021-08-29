// Commenting: Focus CSS hacks
//
// Bubbles js-comment-field focus state up to js-write-bucket.
//
// So we can have a focused ring around the drag and drop section.
//
// TODO: `focused` class should be `is-focused`

import {onFocus} from '../../onfocus'

// Sync focused class.
function toggleFocus(el: Element, focused: boolean) {
  const container = el.closest('.js-write-bucket')
  if (container) {
    container.classList.toggle('focused', focused)
  }
}

// Clean up focused class on blur.
function blurred(event: Event) {
  const el = event.currentTarget
  if (el instanceof Element) {
    toggleFocus(el, false)
  }
}

onFocus('.js-comment-field', function (el) {
  toggleFocus(el, true)
  el.addEventListener('blur', blurred, {once: true})
})
