import {controller, target} from '@github/catalyst'

@controller
class NotificationFocusIndicatorElement extends HTMLElement {
  @target link: Element
  @target modifier: Element

  connectedCallback() {
    this.addEventListener('socket:message', event => {
      const data = (event as CustomEvent).detail.data
      this.link.setAttribute('aria-label', data.aria_label)
      this.link.setAttribute('data-ga-click', data.ga_click)
      this.modifier.setAttribute('class', data.span_class)
    })
  }

  toggleSidebar(): void {
    const event = new CustomEvent('notification-focus:toggle-sidebar', {bubbles: true})
    this.dispatchEvent(event)
  }
}
