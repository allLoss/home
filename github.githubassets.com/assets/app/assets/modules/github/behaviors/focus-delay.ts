// Delayed Focus Events
//
// Provides a family cancelable focus/blur that trigger slightly later.
// This makes it easier to build menus that only display when you are
// focused in on a field.
//
// Events
//
// `focusin:delay`
//
// Fired when field is being focused for the first time. Will not fire
// if field is blurred, and refocused in less than 200ms.
//
// * **Synchronicity** Sync
// * **Bubbles** Yes
// * **Cancelable** Yes
// * **Target** Element that is receiving focus.
//
// `focusout:delay`
//
// Fired when field has been blurred for the first time. Won't fire if
// the field is not refocused in under 200ms or the `focusout:delay` is
// canceled.
//
// * **Synchronicity** Sync
// * **Bubbles** Yes
// * **Cancelable** No
// * **Target** Element that is receiving focus.
//
// ```javascript
// on('focusin:delay', function() {
//   showAutocompletions()
// })
//
// on('focusout:delay', function() {
//   hideAutocompletions()
// })
// ```
//

import {fire} from 'delegated-events'

const focused = new WeakMap()

// We use the "focus" and "blur" event in the capture phase because Firefox
// historically had a limitation with "focusin" and "focusout" not bubbling.
document.addEventListener(
  'focus',
  function (event: Event) {
    const target = event.target
    if (target instanceof Element && !focused.get(target)) {
      fire(target, 'focusin:delay')
      focused.set(target, true)
    }
  },
  {capture: true}
)

document.addEventListener(
  'blur',
  function (event: Event) {
    setTimeout(function () {
      const target = event.target
      if (target instanceof Element && target !== document.activeElement) {
        fire(target, 'focusout:delay')
        focused.delete(target)
      }
    }, 200)
  },
  {capture: true}
)
