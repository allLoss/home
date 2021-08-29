import {controller, target} from '@github/catalyst'
import {NotificationFocusFiltersElement} from './notification-focus-filters-element'
import {NotificationFocusListElement} from './notification-focus-list-element'
import {fetchSafeDocumentFragment} from '../../fetch'

@controller
class NotificationFocusSidebarElement extends HTMLElement {
  @target sidebar: HTMLElement
  @target listElement: NotificationFocusListElement
  @target filtersElement: NotificationFocusFiltersElement

  connectedCallback() {
    this.addEventListener('notification-focus:toggle-sidebar', this.toggleSidebar.bind(this), true)

    const isActive = window.localStorage.getItem('focus-sidebar-active') === 'true'
    if (isActive) {
      this.toggleSidebar()
    }
  }

  toggleSidebar(): void {
    this.adjustSidebarPosition()

    if (this.sidebar.classList.contains('active')) {
      this.listElement.deactivateNavigation()
      this.sidebar.classList.remove('active')
      window.localStorage.removeItem('focus-sidebar-active')
    } else {
      this.listElement.activateNavigation()
      this.sidebar.classList.add('active')
      window.localStorage.setItem('focus-sidebar-active', 'true')
    }
  }

  async onFocusFilterChange(e: Event) {
    const detail = (e as CustomEvent).detail
    if (detail.url) {
      this.listElement.deactivateNavigation()
      const html = await fetchSafeDocumentFragment(document, detail.url)
      this.listElement.replaceContent(html)
      this.listElement.activateNavigation()
    }
  }

  private adjustSidebarPosition() {
    const banner = document.querySelector('header[role=banner]') as HTMLElement
    if (banner) {
      const topMargin = banner.offsetTop + banner.offsetHeight
      this.sidebar.style.top = `${topMargin - 10}px`
    }
  }
}
