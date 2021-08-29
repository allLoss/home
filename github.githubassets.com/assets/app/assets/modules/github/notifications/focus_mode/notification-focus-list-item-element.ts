import {attr, controller, target} from '@github/catalyst'

@controller
export class NotificationFocusListItemElement extends HTMLElement {
  @attr notificationId = ''
  @attr isUnread = false

  @target doneForm: HTMLFormElement
  @target unsubscribeForm: HTMLFormElement
  @target notificationLink: HTMLLinkElement
  @target notificationTitle: HTMLElement

  connectedCallback() {
    this.closest('.js-navigation-item')?.addEventListener('navigation:keydown', this.handleCustomKeybindings.bind(this))
    this.closest('.js-navigation-item')?.addEventListener('navigation:keyopen', this.handleKeyOpen.bind(this))
  }

  url() {
    return this.notificationLink?.href
  }

  handleCustomKeybindings(event: Event) {
    const detail = (event as CustomEvent).detail

    if (detail.hotkey === 'e') {
      this.doneForm.dispatchEvent(new Event('submit'))
    } else if (detail.hotkey === 'M') {
      this.unsubscribeForm.dispatchEvent(new Event('submit'))
    }
  }

  handleKeyOpen() {
    this.notificationLink.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      })
    )
  }

  setFocusedState(focused: boolean) {
    // if we're focused on notification item, we need to mark item as read
    if (focused && this.isUnread) {
      this.isUnread = false
      this.closest('.js-navigation-item')?.classList.remove('color-bg-primary')
      this.closest('.js-navigation-item')?.classList.add('color-bg-tertiary')
    }

    this.closest('.js-navigation-item')?.classList.toggle('current-focused-item', focused)
    this.notificationTitle.classList.toggle('text-bold', focused || this.isUnread)
  }

  async runRemoveAction(e: Event): Promise<void> {
    e.preventDefault()

    const form = e.currentTarget as HTMLFormElement
    const body = new FormData(form)
    const method = form.method
    const url = form.action
    const {ok} = await fetch(url, {body, method})

    if (ok) {
      this.dispatchEvent(
        new CustomEvent('focus-mode-remove-item', {
          bubbles: true,
          detail: {notificationId: this.notificationId}
        })
      )
    }
  }
}
