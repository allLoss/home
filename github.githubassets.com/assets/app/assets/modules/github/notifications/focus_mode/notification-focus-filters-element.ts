import {controller, target} from '@github/catalyst'

@controller
export class NotificationFocusFiltersElement extends HTMLElement {
  @target detailsContainer: HTMLElement
  @target filterTitle: HTMLElement

  changeFilter(e: Event) {
    e.preventDefault()
    this.detailsContainer.removeAttribute('open')
    const link = e.currentTarget as HTMLLinkElement

    this.setFilterTitle(link.innerHTML)

    this.dispatchEvent(
      new CustomEvent('focus-mode-filter-change', {
        detail: {url: link.href}
      })
    )
  }

  private setFilterTitle(text: string) {
    this.filterTitle.innerHTML = text
  }
}
