/* eslint eslint-comments/no-use: off */
/* eslint-disable github/no-then */

/**
 * Details toggle.
 *
 * Use the details toggle to toggle content on the page. Similar to the
 * [HTML5 details element](https://www.w3.org/wiki/HTML/Elements/details).
 *
 * There are minimum two classes you will need to trigger the JS behavior.
 *
 * Apply the `.js-details-target` class to the element that will trigger
 * the toggle through a mouse click. For accessibility reasons, we recommend using a
 * `<button>` tag for this, but it can be applied to any element.
 *
 * A single `.js-details-container` class will be applied to a parent element that is wrapping
 * all the details components. The behavior will toggle an `Details--on` class on this element
 * which the CSS will use to show and hide the appropriate objects.
 *
 * There are default styling classes that will show and hide content for you. `.Details`
 * is a component that is built to show hidden content on open, and hide shown content
 * on close.
 *
 * The default state of the component is closed. Wrap the content and target with the `Details`
 * class. And apply `Details-content--hidden` to any element that you want *hidden* when closed
 * and *shown* when open.
 *
 * @example
 * ```html
 * <div class="Details js-details-container">
 *   <button type="button" class="js-details-target" aria-expanded="false">See more info</button>
 *   <div class="Details-content--hidden">Hidden details</div>
 * </div>
 * ```
 *
 * Shown content
 *
 * If you have some content that you would like to be *shown* by default and
 * *hidden* when the details is `Details--on`. Then you can use the `Details-content--shown`
 * class.
 *
 * @example
 * ```html
 * <div class="Details js-details-container">
 *   <button type="button" class="js-details-target" aria-expanded="false" aria-label="Expand and collapse">
 *     <%= octicon("chevron-down", :class => "Details-content--shown") %>
 *     <%= octicon("chevron-up", :class => "Details-content--hidden") %>
 *   </button>
 *   <div class="Details-content--shown">Shown details</div>
 * </div>
 * ```
 */

import hashChange from './hash-change'
import {on} from 'delegated-events'
import performTransition from '../perform-transition'
import {preservePosition} from 'scroll-anchoring'

function restoreAutofocus(container: HTMLElement) {
  const autofocusEls = container.querySelectorAll<HTMLElement>('input[autofocus], textarea[autofocus]')
  const autofocusEl = autofocusEls[autofocusEls.length - 1]
  if (autofocusEl && document.activeElement !== autofocusEl) {
    autofocusEl.focus()
  }
}

function hideTooltip(target: HTMLElement) {
  if (!target.classList.contains('tooltipped')) return
  target.classList.remove('tooltipped')
  target.addEventListener(
    'mouseleave',
    () => {
      target.classList.add('tooltipped')
      // eslint-disable-next-line github/no-blur
      target.blur()
    },
    {once: true}
  )
}

function groupMembers(group: string): Element[] {
  return [...document.querySelectorAll('.js-details-container')].filter(
    el => el.getAttribute('data-details-container-group') === group
  )
}

function containerTargets(container: Element): Element[] {
  return [...container.querySelectorAll('.js-details-target')].filter(
    target => target.closest('.js-details-container') === container
  )
}

function toggleGroup(container: Element, open: boolean): string | null {
  const group = container.getAttribute('data-details-container-group')
  if (!group) return null
  preservePosition(container, () => {
    for (const otherContainer of groupMembers(group)) {
      if (otherContainer !== container) {
        updateOpenState(otherContainer, open)
      }
    }
  })
  return group
}

function updateOpenState(container: Element, open: boolean) {
  container.classList.toggle('open', open)
  container.classList.toggle('Details--on', open)
  for (const target of containerTargets(container)) {
    target.setAttribute('aria-expanded', open.toString())
  }
}

export function toggleDetailsTarget(target: HTMLElement, opts?: {withGroup?: boolean; force?: boolean}) {
  const containerSelector = target.getAttribute('data-details-container') || '.js-details-container'
  const container = target.closest<HTMLElement>(containerSelector)!
  const open = opts?.force ?? !container.classList.contains('open')
  const withGroup = opts?.withGroup ?? false
  performTransition(container, () => {
    updateOpenState(container, open)
    const group = withGroup ? toggleGroup(container, open) : null
    Promise.resolve().then(() => {
      restoreAutofocus(container)
      hideTooltip(target)
      container.dispatchEvent(
        new CustomEvent('details:toggled', {
          bubbles: true,
          cancelable: false,
          detail: {open}
        })
      )
      if (group) {
        container.dispatchEvent(
          new CustomEvent('details:toggled-group', {
            bubbles: true,
            cancelable: false,
            detail: {open, group}
          })
        )
      }
    })
  })
}

export function isDetailsTargetExpanded(target: HTMLElement): boolean {
  const containerSelector = target.getAttribute('data-details-container') || '.js-details-container'
  const container = target.closest<HTMLElement>(containerSelector)!
  const classList = container.classList
  return classList.contains('Details--on') || classList.contains('open')
}

function handleDetailsTargetClick(event: Event) {
  const withGroup = (event as MouseEvent).altKey
  const target = event.currentTarget as HTMLElement
  toggleDetailsTarget(target, {withGroup})
  event.preventDefault()
}
on('click', '.js-details-target', handleDetailsTargetClick)

// Expand collapsed outdated diff if anchor points to it
//   /github/github/pull/123#discussion-diff-456
//   /github/github/pull/123#discussion-r345
hashChange(function ({target}) {
  if (target) ensureExpanded(target)
})

export function ensureExpanded(target: Element) {
  let toCollapse = false
  let node = target.parentElement
  while (node) {
    if (node.classList.contains('Details-content--shown')) {
      toCollapse = true
    }
    if (node.classList.contains('js-details-container')) {
      node.classList.toggle('open', !toCollapse)
      node.classList.toggle('Details--on', !toCollapse)
      toCollapse = false
    }
    node = node.parentElement
  }
}
