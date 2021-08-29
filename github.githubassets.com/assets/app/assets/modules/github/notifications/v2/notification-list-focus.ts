import {focus as navigationFocus} from '../../navigation'
import visible from '../../visible'

interface FocusPosition {
  id?: string | null
  position?: number
}

/*
 * Returns the currently focussed notification id, and it's position in the
 * notification list This should be saved before the list is modified, and then
 * the result can be passed to restoreFocus() to restore the notification list
 * focus to (roughly) the same place.
 *
 * By default it works with the container and selector used on
 * `/notifications`, but they can be overridden by the `notificationsList` and
 * `keyboardFocusedSelector` optional parameters.
 */
export function getCurrentFocus(notificationsList?: HTMLElement, keyboardFocusedSelector?: string): FocusPosition {
  const container = notificationsList || getNotificationsList()
  if (!container) return {}

  const keyboardFocused = container.querySelector(
    keyboardFocusedSelector || '.js-notifications-list-item.navigation-focus'
  )
  if (!(keyboardFocused instanceof HTMLElement)) return {}

  return {
    id: keyboardFocused.getAttribute('data-notification-id'),
    position: getItems(container).indexOf(keyboardFocused)
  }
}

/*
 * Restores the focussed notification list focus, based on the previously
 * focused id/position If `id` is not null, and the notification with that id
 * is still in the notification list, that element will be focussed.
 * Otherwise, the element at the matching position (or the last one if the
 * position exceeds the new list length) will be focussed.
 *
 * Be aware that when notifications are loaded from the server, a notification
 * can jump from anywhere in the list to the top if they are updated with a new
 * notification. So if restoring focus after loading new data from the server,
 * restoring by id may be confusing to users.
 *
 * By default it works with the container on `/notifications` but it can be
 * overridden by the `notificationsList` optional parameter.
 */
export function restoreFocus({id, position}: FocusPosition, notificationsList?: HTMLElement) {
  const container = notificationsList || getNotificationsList()
  if (!(container instanceof HTMLElement)) return

  const items = getItems(container)
  let target

  // Try to find target by id if it was passed
  if (id) {
    target = items.find(el => el.getAttribute('data-notification-id') === id)
  }

  // If we didn't find target, and position is passed, find by position
  // falls back to last item if position > length
  if (!target && position != null) {
    target = items[Math.min(position, items.length - 1)]
  }

  if (target instanceof HTMLElement) {
    navigationFocus(container, target)
  }
}

function getNotificationsList() {
  return document.querySelector('.js-notifications-list .js-navigation-container')
}

// Returns the visible, navigatable items in the notifications list.
function getItems(container: Element): Element[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.js-navigation-item')).filter(visible)
}
