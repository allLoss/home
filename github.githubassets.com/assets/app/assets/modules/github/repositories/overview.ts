import FilterInputElement from '@github/filter-input-element'
import RemoteInputElement from '@github/remote-input-element'

import {on} from 'delegated-events'

on('tab-container-changed', '.js-branches-tags-tabs', async function (event) {
  const newTabPanel = event.detail.relatedTarget
  const tabContainer = event.currentTarget
  if (!tabContainer) return

  let oldValue
  let newControl

  for (const controlInput of tabContainer.querySelectorAll('[data-controls-ref-menu-id]')) {
    if (!(controlInput instanceof FilterInputElement || controlInput instanceof RemoteInputElement)) return
    const id = controlInput.getAttribute('data-controls-ref-menu-id')!
    const isNewControl = newTabPanel.id === id
    controlInput.hidden = !isNewControl
    if (isNewControl) {
      newControl = controlInput
    } else if (!oldValue) {
      oldValue = controlInput.input ? controlInput.input.value : ''
    }
  }
  const newInput = newControl && newControl.input
  if (newInput) {
    if (newControl && oldValue !== undefined) newInput.value = oldValue
    newInput.focus()
  }
})
