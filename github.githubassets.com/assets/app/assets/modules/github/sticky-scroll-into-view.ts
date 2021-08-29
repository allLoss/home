import {findFragmentTarget} from './fragment-target'
import {forceStickyRelayout} from './behaviors/sticky'

// Scroll element into view accounting for sticky/fixed overlays.
export function scrollIntoView(el: Element) {
  const document = el.ownerDocument
  setTimeout(() => {
    if (document && document.defaultView) {
      el.scrollIntoView()
      document.defaultView.scrollBy(0, -computeFixedYOffset(document))
    }
  }, 0)
}

// Scroll to fragment target element accounting for sticky/fixed
// overlays.
export function scrollToFragmentTarget(document: Document) {
  const target = findFragmentTarget(document)
  if (target) {
    scrollIntoView(target)
  }
}

// Compute height of visible sticky/fixed overlay on page.
export function computeFixedYOffset(document: Document): number {
  // Force synchronous layout of any sticky elements before measuring offset
  forceStickyRelayout()

  const jsStickyEls = document.querySelectorAll('.js-sticky-offset-scroll')
  const positionStickyEls = document.querySelectorAll('.js-position-sticky')

  // Find maximum combined height of sticky-offset / position-sticky elements
  // If none are present, fallback to 0 as Math.max() returns -Infinity

  const scrollOffset =
    Math.max(
      0,
      ...Array.from(jsStickyEls).map(el => {
        const {top, height} = el.getBoundingClientRect()
        return top === 0 ? height : 0
      })
    ) +
    Math.max(
      0,
      ...Array.from(positionStickyEls).map(el => {
        const {top, height} = el.getBoundingClientRect()
        const topStyleValue = parseInt(getComputedStyle(el).top)

        if (!el.parentElement) {
          return 0
        }

        const parentTop = el.parentElement.getBoundingClientRect().top
        // include js-position-sticky element height in scroll offset if element is sticky
        return top === topStyleValue && parentTop < 0 ? height : 0
      })
    )

  // Use .js-position-sticky-stacked for sticky elements that are stacked (e.g. multiple sticky elements on a page)
  // rather than nested
  const jsStickyElsStacked = document.querySelectorAll('.js-position-sticky-stacked')
  const stackedHeight = Array.from(jsStickyElsStacked).reduce((a, el) => {
    const {height, top} = el.getBoundingClientRect()
    const isOffScreen = top < 0
    const isStuck = el.classList.contains('is-stuck')
    return a + (!isOffScreen && isStuck ? height : 0)
  }, 0)

  return scrollOffset + stackedHeight
}
