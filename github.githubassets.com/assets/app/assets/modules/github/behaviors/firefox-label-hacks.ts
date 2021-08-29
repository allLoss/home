// *HACK*
//
// In Firefox label.focus() transfers focus to <input> even with tabindex
// attribute. This is a problem because <details-menu> relies on menuitem to be
// the activeElement. See: https://github.com/github/github/issues/123224
//
// This script ties in very closely with <details-menu>'s navigation logic.
// Tread with caution.
import {microtask} from '../eventloop-tasks'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {onKey} from '../onfocus'

const firefox = navigator.userAgent.match(/Firefox\/(\d+)/)

// This should be remove as the user count for Firefox > 76 grows
if (firefox && Number(firefox[1]) < 76) {
  // Rely on <input> as activeElement in Firefox instead of <label>
  observe('details-menu label[tabindex][role^="menuitem"]', el => {
    const input = el.querySelector('input')
    if (!input) return

    // Input needs to be displayed to be focused

    // .select-menu-item input { display: none; }
    const hiddenBySelectMenu = el.classList.contains('select-menu-item')
    // eslint-disable-next-line github/no-d-none
    const hiddenByDNone = input.classList.contains('d-none')
    const hidden = hiddenBySelectMenu || hiddenByDNone || input.hidden

    if (hiddenBySelectMenu) input.classList.add('d-block')
    // eslint-disable-next-line github/no-d-none
    if (hiddenByDNone) input.classList.remove('d-none')
    if (hidden) {
      input.classList.add('sr-only')
      input.hidden = false
    }

    el.removeAttribute('tabindex')
  })

  // Normally we rely on :focus for styling, but it doesn't happen on <label>
  // anymore. So instead:
  //
  // On focus/blur, toggle .navigation-focus to style label as focused
  //
  // eslint-disable-next-line delegated-events/global-on
  on(
    'focus',
    'details-menu label[role="menuitemradio"] input, details-menu label[role="menuitemcheckbox"] input',
    event => {
      const label = event.currentTarget.closest<HTMLElement>('label')!
      if (label.classList.contains('select-menu-item')) label.classList.add('navigation-focus')
      if (label.classList.contains('SelectMenu-item')) label.classList.add('hx_menuitem--focus')
      if (label.classList.contains('dropdown-item')) label.classList.add('hx_menuitem--focus')
      event.currentTarget.addEventListener(
        'blur',
        () => {
          if (label.classList.contains('select-menu-item')) label.classList.remove('navigation-focus')
          if (label.classList.contains('SelectMenu-item')) label.classList.remove('hx_menuitem--focus')
          if (label.classList.contains('dropdown-item')) label.classList.remove('hx_menuitem--focus')
        },
        {once: true}
      )
    },
    {capture: true}
  )

  // <details-menu> listens on ArrowDown/ArrowUp keydown events to navigate.
  // In Firefox it will always focus on the first/last item, because the
  // activeElement (<input>) is not a [role^=menuitem]. The workaround:
  //
  // On arrow keydown: before details-menu navigates, move [role] from <label>
  // to <input> so <details-menu> knows the current index.
  //
  // Unrelated to navigation- by default, pressing Enter while focusing on
  // <input> will submit the form. We don't want that here.
  //
  // On enter keydown: simulate click for activation and prevent default.
  onKey(
    'keydown',
    'details-menu label[role="menuitemradio"] input, details-menu label[role="menuitemcheckbox"] input',
    async function (event: KeyboardEvent) {
      if (isArrowKeys(event)) {
        if (event.currentTarget instanceof Element) switchRoleToInputForNavigation(event.currentTarget)
      } else if (event.key === 'Enter') {
        const input = event.currentTarget
        event.preventDefault()
        await microtask()
        if (input instanceof HTMLInputElement) input.click()
      }
    }
  )

  // On blur: after <details-menu> moved focus away from current <input>, revert
  // role attribute back to <label>.
  //
  // eslint-disable-next-line delegated-events/global-on
  on(
    'blur',
    'details-menu label input[role="menuitemradio"], details-menu label input[role="menuitemcheckbox"]',
    event => {
      switchRoleBackToOriginalState(event.currentTarget)
    },
    {capture: true}
  )

  // On arrow keyup: if arrow keydown did not trigger blur (for example, when
  // there is only one item), revert [role] back to <label>.
  onKey(
    'keyup',
    'details-menu label[role="menuitemradio"] input, details-menu label[role="menuitemcheckbox"] input',
    event => {
      if (!isArrowKeys(event)) return
      if (event.currentTarget instanceof Element) switchRoleBackToOriginalState(event.currentTarget)
    }
  )
}

function isArrowKeys(event: KeyboardEvent): boolean {
  return event.key === 'ArrowDown' || event.key === 'ArrowUp'
}

// From a nearby `<label>` tag, get the `data-role` and set it onto the input,
// removing the role from the label.
function switchRoleToInputForNavigation(input: Element) {
  const label = input.closest<HTMLElement>('label')!
  if (!label.hasAttribute('data-role')) label.setAttribute('data-role', label.getAttribute('role')!)
  input.setAttribute('role', label.getAttribute('data-role')!)
  label.removeAttribute('role')
}

// From a nearby `<label>` tag, get the `data-role` and the label to that
// data-role, removing the role from the input.
function switchRoleBackToOriginalState(input: Element) {
  const label = input.closest<HTMLElement>('label')!
  if (!label.hasAttribute('data-role')) label.setAttribute('data-role', label.getAttribute('role')!)
  label.setAttribute('role', label.getAttribute('data-role')!)
  input.removeAttribute('role')
}
