import {controller, target} from '@github/catalyst'

@controller
class NotificationIndicatorElement extends HTMLElement {
  @target link: Element
  @target modifier: Element

  constructor() {
    super()
    this.addEventListener('socket:message', this.update.bind(this))
  }

  update(event: Event) {
    const data = (event as CustomEvent).detail.data
    this.link.setAttribute('aria-label', data.aria_label)
    this.link.setAttribute('data-ga-click', data.ga_click)
    this.modifier.setAttribute('class', data.span_class)
  }
}
