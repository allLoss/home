import {controller, target} from '@github/catalyst'
@controller
class NotificationsTeamSubscriptionFormElement extends HTMLElement {
  @target details: HTMLDetailsElement

  closeMenu() {
    this.details.toggleAttribute('open', false)
  }
}
