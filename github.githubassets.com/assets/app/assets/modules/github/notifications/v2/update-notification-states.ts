/*
 * Applies state updates from a form (e.g. Mark as read/archive/unsubscribe/star) to the element
 * that represents the notification (e.g. The notification item in the list view, or the
 * notification shelf on an Issue page).
 */
export function updateNotificationStates(element: HTMLElement, form: HTMLFormElement) {
  const notification = element.closest<HTMLElement>('[data-notification-id]')!

  // Toggles read/unread/archive status
  if (form.hasAttribute('data-status')) {
    toggleNotificationStatus(notification, form.getAttribute('data-status')!)
  }

  // Toggles subscribed/unsubscribed status
  if (form.hasAttribute('data-subscription-status')) {
    toggleNotificationSubscriptionStatus(notification, form.getAttribute('data-subscription-status')!)
  }

  // Toggles starred/unstarred status
  if (form.hasAttribute('data-starred-status')) {
    toggleNotificationStarredStatus(notification, form.getAttribute('data-starred-status')!)
  }
}

function toggleNotificationStatus(notification: HTMLElement, status: string) {
  notification.classList.toggle('notification-archived', status === 'archived')
  notification.classList.toggle('notification-unread', status === 'unread')
  notification.classList.toggle('notification-read', status === 'read')
}

function toggleNotificationSubscriptionStatus(notification: HTMLElement, status: string) {
  notification.classList.toggle('notification-unsubscribed', status === 'unsubscribed')
}

function toggleNotificationStarredStatus(notification: HTMLElement, status: string) {
  notification.classList.toggle('notification-starred', status === 'starred')
}
