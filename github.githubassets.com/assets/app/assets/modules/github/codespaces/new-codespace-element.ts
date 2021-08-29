import {controller, target} from '@github/catalyst'
import {fetchLocationValues, prefetchCodespaceLocation} from '../prefetch-codespace-location'

interface VSCSLocationsResponse {
  current: 'string'
  available: string[]
}
@controller
class NewCodespaceElement extends HTMLElement {
  @target form: HTMLFormElement
  @target createCodespaceForm: HTMLFormElement
  @target createCodespaceWithSkuSelectForm: HTMLFormElement
  @target vscsTargetUrl: HTMLInputElement
  @target vscsLocationList: HTMLDivElement
  @target vscsLocationSummary: HTMLSpanElement
  @target loadingVscode: HTMLElement
  @target vscodePoller: HTMLElement

  async connectedCallback() {
    if (this.createCodespaceForm) {
      // have `prefetchCodespaceLocation` set the location for us if there's no location list
      const locationJSON = await prefetchCodespaceLocation(this.createCodespaceForm, !this.vscsLocationList)
      this.updatePickableLocations(locationJSON)
    }
  }

  toggleLoadingVscode() {
    const isHidden = this.loadingVscode.hidden
    const children = this.children
    for (let i = 0; i < children.length; i++) {
      ;(children[i] as HTMLElement).hidden = isHidden
    }
    this.loadingVscode.hidden = !isHidden
  }

  pollForVscode(event: CustomEvent) {
    this.toggleLoadingVscode()
    const pollingUrl = (event.currentTarget as HTMLElement).getAttribute('data-src')
    if (pollingUrl) this.vscodePoller.setAttribute('src', pollingUrl)
  }

  async updatePickableLocations(locationJSON: VSCSLocationsResponse) {
    if (!locationJSON) {
      // locationJSON isn't loaded by prefetchCodespaceLocation if a previous value was set
      // since prefetchCodespaceLocation is used in a handful of places I didn't want to complicate logic
      // elsewhere. This custom element is the special case that needs locationJSON every time so make
      // the call here instead
      const locationsURL = this.createCodespaceForm.getAttribute('data-codespace-locations-url')
      if (!locationsURL) return
      locationJSON = await fetchLocationValues(locationsURL)
    }

    const availableLocations = locationJSON.available

    // users with codespaces_developer enabled will be able to set their Azure region manually
    if (this.vscsLocationList) {
      const items = this.vscsLocationList.querySelectorAll('.SelectMenu-item')
      for (const item of items) {
        if (availableLocations.includes(item.getAttribute('data-location')!)) {
          item.removeAttribute('hidden')
        } else {
          // item.setAttribute('aria-checked', 'false')
          item.setAttribute('hidden', 'hidden')
        }
      }

      const locationInput = this.createCodespaceForm.querySelector<HTMLInputElement>('[name="codespace[location]"]')!
      if (locationInput && !availableLocations.includes(locationInput.value)) {
        // a previous location was chosen that's no longer available then reset the form input
        locationInput.value = locationJSON.current
        this.vscsLocationSummary.textContent = this.vscsLocationSummary.getAttribute('data-blank-title')
        for (const item of items) {
          item.setAttribute('aria-checked', 'false')
        }
      }
    }
  }

  vscsTargetUrlUpdated(event: Event) {
    const element = event.currentTarget as HTMLInputElement
    this.vscsTargetUrl.value = element.value
  }
}
