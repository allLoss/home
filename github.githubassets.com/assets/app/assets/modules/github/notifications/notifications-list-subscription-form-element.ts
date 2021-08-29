import {controller, target, targets} from '@github/catalyst'
import {hideGlobalError, showGlobalError} from '../behaviors/ajax-error'
import type DetailsDialogElement from '@github/details-dialog-element'
import DetailsMenuElement from '@github/details-menu-element'
import {changeValue} from '../form'

@controller
class NotificationsListSubscriptionFormElement extends HTMLElement {
  @target details: HTMLDetailsElement
  @target menu: DetailsMenuElement
  @target customButton: HTMLButtonElement
  @target customDialog: DetailsDialogElement
  @targets subscriptionButtons: HTMLButtonElement[]
  @target socialCount: HTMLElement
  @target unwatchButtonCopy: HTMLElement
  @target stopIgnoringButtonCopy: HTMLElement
  @target watchButtonCopy: HTMLElement
  @targets threadTypeCheckboxes: HTMLInputElement[]
  @target customSubmit: HTMLButtonElement

  async submitCustomForm(e: Event) {
    await this.submitForm(e)
    this.closeMenu()
  }

  async submitForm(e: Event) {
    e.preventDefault()

    hideGlobalError()

    const form = e.currentTarget as HTMLFormElement
    const body = new FormData(form)

    const response = await self.fetch(form.action, {
      method: form.method,
      body,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      showGlobalError()
      return
    }
    const json = await response.json()

    const doParam = body.get('do')
    if (typeof doParam === 'string') this.updateCheckedState(doParam)
    if (typeof doParam === 'string') this.updateMenuButtonCopy(doParam)
    this.updateSocialCount(json.count)
    this.applyInputsCheckedPropertiesToAttributesForNextFormReset()
  }

  updateMenuButtonCopy(subscription: string) {
    this.unwatchButtonCopy.hidden = !(subscription === 'subscribed' || subscription === 'custom')
    this.stopIgnoringButtonCopy.hidden = !(subscription === 'ignore')
    this.watchButtonCopy.hidden = !(
      subscription !== 'subscribed' &&
      subscription !== 'custom' &&
      subscription !== 'ignore'
    )
  }

  // form.reset() will reset the form back to the values in it's html attributes, not to it's current JS properties
  // therefore, after successfully saving the form to the server, we transfer value of the `.checked` properties
  // of the inputs in the form into the `[checked]` attribute. This means that if the user reopens the form and
  // edits it again, cancelling will reset the form to it's last saved state, not the original state on page load
  applyInputsCheckedPropertiesToAttributesForNextFormReset() {
    for (const input of [...this.threadTypeCheckboxes]) {
      input.toggleAttribute('checked', input.checked)
    }
  }

  updateCheckedState(doParam: string) {
    for (const button of this.subscriptionButtons) {
      button.setAttribute('aria-checked', button.value === doParam ? 'true' : 'false')
    }

    if (doParam === 'custom') {
      this.customButton.setAttribute('aria-checked', 'true')
    } else {
      this.customButton.setAttribute('aria-checked', 'false')

      for (const input of [...this.threadTypeCheckboxes]) {
        changeValue(input, false)
      }
    }
  }

  updateSocialCount(count: string) {
    if (this.socialCount) {
      this.socialCount.textContent = count
    }
  }

  openCustomDialog(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    this.menu.toggleAttribute('hidden', true)
    this.customDialog.toggleAttribute('hidden', false)
    setTimeout(() => {
      this.customDialog.querySelector<HTMLInputElement>('input[type=checkbox][autofocus]')?.focus()
    }, 0)
  }

  closeCustomDialog(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    this.menu.toggleAttribute('hidden', false)
    this.customDialog.toggleAttribute('hidden', true)
    setTimeout(() => {
      this.customButton.focus()
    }, 0)
  }

  detailsToggled() {
    this.menu.toggleAttribute('hidden', false)
    this.customDialog.toggleAttribute('hidden', true)
  }

  submitCustom(e: Event) {
    e.preventDefault()
    this.details.toggleAttribute('open', false)
  }

  threadTypeCheckboxesUpdated() {
    const noneSelected = !this.threadTypeCheckboxes.some(input => input.checked)

    this.customSubmit.disabled = noneSelected
  }

  closeMenu() {
    this.details.toggleAttribute('open', false)
  }
}
