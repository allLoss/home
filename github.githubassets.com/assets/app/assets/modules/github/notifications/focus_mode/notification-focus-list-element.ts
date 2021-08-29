import {controller, target, targets} from '@github/catalyst'
import {getCurrentFocus, restoreFocus} from '../v2/notification-list-focus'
import {pop, push} from '../../navigation'
import IncludeFragmentElement from '@github/include-fragment-element'
import {NotificationFocusListItemElement} from './notification-focus-list-item-element'
import {fetchSafeDocumentFragment} from '../../fetch'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'

@controller
export class NotificationFocusListElement extends HTMLElement {
  @target container: HTMLElement

  @target includeFragment: IncludeFragmentElement
  @target list: HTMLElement
  @target blankSlate: HTMLElement

  @targets listElements: NotificationFocusListItemElement[]

  @target nextPageItem: HTMLElement
  @target nextPageItemSpinner: HTMLElement

  private currentObserver: IntersectionObserver | undefined

  connectedCallback() {
    observe('.js-notification-focus-list', () => {
      this.setupPaginationObserver()
    })

    // We need to catch when pjax navigation is finished successfully,
    // so we update focused notification in the list.
    // eslint-disable-next-line delegated-events/global-on
    on('pjax:end', '#js-repo-pjax-container', () => {
      this.toggleCurrentFocusedNotification()
    })
  }

  disconnectedCallback() {
    this.disconnectCurrentObserver()
  }

  deactivateNavigation() {
    pop(this.container)
  }

  activateNavigation() {
    push(this.container)
  }

  replaceContent(listFragment: DocumentFragment) {
    this.container.innerHTML = ''
    this.container.appendChild(listFragment)
    this.setupPaginationObserver()
  }

  onRemoveItem(e: CustomEvent): void {
    const notificationId = e.detail.notificationId
    const currentFocus = getCurrentFocus(this.container, '.js-navigation-item.navigation-focus')

    this.listElements
      ?.find(item => item.notificationId === notificationId)
      ?.closest('li')
      ?.remove()

    if (this.listElements.length === 0) {
      this.blankSlate.hidden = false
      this.list.hidden = true
    } else {
      restoreFocus(currentFocus, this.container)
    }
  }

  private toggleCurrentFocusedNotification() {
    for (const listItem of this.listElements) {
      const isFocused = window.location.href.includes(listItem.url())
      listItem.setFocusedState(isFocused)
    }
  }

  private setupPaginationObserver() {
    if (!!window.IntersectionObserver && this.nextPageItem) {
      this.currentObserver = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          if (!entries[0].isIntersecting) {
            return
          }

          this.disconnectCurrentObserver()
          this.loadNextPage()
        },
        {
          root: this.container,
          threshold: 0
        }
      )
      this.currentObserver.observe(this.nextPageItem)
    }
  }

  private async loadNextPage() {
    if (!this.nextPageItem) {
      return
    }

    const nextPageUrl = this.nextPageItem.getAttribute('data-next-page-url')
    if (nextPageUrl) {
      this.nextPageItemSpinner.hidden = false
      const nextPage = await fetchSafeDocumentFragment(document, nextPageUrl)

      this.nextPageItem.remove()

      const liNotificationItems = nextPage.querySelectorAll('ul > li.focus-notification-item')
      for (const node of liNotificationItems) {
        this.list.appendChild(node)
      }

      const receivedNextPageItem = nextPage.querySelector('ul > li.focus-pagination-next-item')
      if (receivedNextPageItem) {
        this.list.appendChild(receivedNextPageItem)
      }

      // after new notifications + next page item were attached to
      // the page we can re-subscribe to intersection observer
      this.setupPaginationObserver()
    }
  }

  private disconnectCurrentObserver() {
    if (this.currentObserver) {
      this.currentObserver.disconnect()
    }
  }
}
