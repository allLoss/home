/**
 * Smooth scrolling anchor.
 *
 * Have an in-page anchor link and want the page to smoothly scroll to its destination? Look no further.
 *
 * Apply the `.js-smoothscroll-anchor` on the anchor tag to trigger smooth scrolling.
 *
 * This will override the default behavior of jumping the page to the element targeted by the hash in the `href`
 * and instead smoothly scroll to it. No additional CSS is required.
 *
 * @deprecated Replace this behavior with `scroll-behavior: smooth;`
 *   https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior.
 *
 * @example
 * ```html
 * <a href="#some-id" class="js-smoothscroll-anchor">Scroll to #some-id</a>
 * <div id="some-id" style="margin-top: 300px;">
 *   <h3>Scroll to me</h3>
 * </div>
 * ```
 */

import {findFragmentTarget} from '../fragment-target'
import {on} from 'delegated-events'

on('click', '.js-smoothscroll-anchor', function (event) {
  const anchor = event.currentTarget
  if (!(anchor instanceof HTMLAnchorElement)) return

  const target = findFragmentTarget(document, anchor.hash)
  if (!target) return

  target.scrollIntoView({behavior: 'smooth'})
  event.preventDefault()
})
