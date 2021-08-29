// performTransition
//
// CSS3 transitions have some major pitfalls. First trying to transition
// elements from `display:none` to `display:block.` And also dealing with
// computed properties like `height:auto`.
//
// This helper attempts to deal with those issues while still defining
// the transitions in pure css.
//
// Behaviors that intend to support these special case transitions
// should call `performTransition` when they add or remove their state
// classes.
//
// Any element that is performing a transition needs to be annotated
// with the `js-transitionable` class name.
//
// @example
//
// <div class="js-transitionable collapse">
//   Slide down
// </div>
//
// .collapse {
//   display: none;
//   position: relative;
//   height: 0;
//   overflow: hidden;
//   @include transition(0.35s, height, ease);
// }
// .collapse.open {
//   display: block;
//   height: auto;
// }
//
// performTransition document.querySelector('.collapse', () => {
//   this.classList.add('open')
// })

const supportsTransitions = 'ontransitionend' in window

// DEPRECATED: PerformTransition is deprecated.
export default function performTransition(container: HTMLElement, cb: () => void) {
  if (!supportsTransitions) {
    cb()
    return
  }

  const els = Array.from(container.querySelectorAll('.js-transitionable'))
  if (container.classList.contains('js-transitionable')) els.push(container)

  for (const el of els) {
    const transitionHeight = isTransitioningHeight(el)
    if (!(el instanceof HTMLElement)) continue

    el.addEventListener(
      'transitionend',
      () => {
        el.style.display = ''
        el.style.visibility = ''

        if (transitionHeight) {
          withoutTransition(el, function () {
            el.style.height = ''
          })
        }
      },
      {once: true}
    )

    el.style.boxSizing = 'content-box'
    el.style.display = 'block'
    el.style.visibility = 'visible'

    if (transitionHeight) {
      withoutTransition(el, function () {
        el.style.height = getComputedStyle(el).height
      })
    }

    // force reflow
    el.offsetHeight
  }

  cb()

  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue
    if (isTransitioningHeight(el)) {
      const currentHeight = getComputedStyle(el).height
      el.style.boxSizing = ''
      if (currentHeight === '0px') {
        el.style.height = `${el.scrollHeight}px`
      } else {
        el.style.height = '0px'
      }
    }
  }
}

// Detect if element is transitioning its height property.
function isTransitioningHeight(el: Element) {
  return getComputedStyle(el).transitionProperty === 'height'
}

// Apply style change callback w/o triggering a transition.
function withoutTransition(el: HTMLElement, cb: () => void) {
  el.style.transition = 'none'
  cb()
  el.offsetHeight
  el.style.transition = ''
}
